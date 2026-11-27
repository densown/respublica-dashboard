import { useSyncExternalStore } from 'react'

/**
 * Web-App installieren ("Zum Startbildschirm hinzufügen").
 *
 * Chrome, Edge und Samsung Internet melden mit "beforeinstallprompt", dass
 * sich die Seite installieren laesst. Das Ereignis kommt einmal, frueh und
 * unabhaengig davon, welche Seite gerade offen ist. Deshalb haengt der
 * Empfaenger schon in main.tsx (installierenVorbereiten) und nicht in einer
 * Komponente. Safari auf iPhone und iPad kennt das Ereignis nicht: dort geht
 * es nur von Hand ueber Teilen, die App zeigt die zwei Handgriffe.
 *
 * Gespeichert wird nur im Browser (localStorage), nichts geht an den Server.
 */

type InstallEreignis = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallStand =
  /** Laeuft bereits als installierte App. */
  | 'installiert'
  /** Der Browser bietet die Installation an: Knopf zeigen. */
  | 'bereit'
  /** iPhone oder iPad: Anleitung ueber Teilen zeigen. */
  | 'ios'
  /** Kein Angebot vom Browser (Firefox, Safari auf dem Mac, oder schon abgelehnt). */
  | 'menue'

const SCHLUESSEL_ZU = 'rp-app-hinweis-zu'
const SCHLUESSEL_BESUCHE = 'rp-app-besuche'
/** Nach "Nicht jetzt" so lange Ruhe. */
const RUHE_TAGE = 60

let ereignis: InstallEreignis | null = null
let installiertGerade = false
const hoerer = new Set<() => void>()
const melden = () => hoerer.forEach((f) => f())

function lesen(k: string): string | null {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function schreiben(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* privates Fenster: dann eben ohne Gedaechtnis */
  }
}

function alsAppGestartet(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function istIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS meldet sich als Mac, hat aber einen Touchscreen
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** Einmal beim Start der App aufrufen (main.tsx). */
export function installierenVorbereiten() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    // Chromes eigene Leiste unterdruecken: die App fragt selbst, ruhiger.
    e.preventDefault()
    ereignis = e as InstallEreignis
    melden()
  })
  window.addEventListener('appinstalled', () => {
    ereignis = null
    installiertGerade = true
    melden()
  })
  // Besuche zaehlen (hoechstens einer pro Tag), damit der Hinweis auf der
  // Startseite nicht schon beim allerersten Besuch erscheint.
  const heute = new Date().toISOString().slice(0, 10)
  const [tag, anzahl] = (lesen(SCHLUESSEL_BESUCHE) ?? '').split('|')
  if (tag !== heute) schreiben(SCHLUESSEL_BESUCHE, `${heute}|${(Number(anzahl) || 0) + 1}`)

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
      // Skripte fuer spaeter ohne Netz vorladen, ausser bei "Datensparmodus"
      const sparen = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
      if (!sparen) {
        navigator.serviceWorker.ready
          .then((r) => r.active?.postMessage('vorladen'))
          .catch(() => undefined)
      }
    })
  }
}

function stand(): InstallStand {
  if (installiertGerade || alsAppGestartet()) return 'installiert'
  if (ereignis) return 'bereit'
  if (istIos()) return 'ios'
  return 'menue'
}

function abonnieren(f: () => void) {
  hoerer.add(f)
  const mql = window.matchMedia('(display-mode: standalone)')
  mql.addEventListener('change', f)
  return () => {
    hoerer.delete(f)
    mql.removeEventListener('change', f)
  }
}

export function useInstallieren() {
  const aktuell = useSyncExternalStore(abonnieren, stand, () => 'menue' as InstallStand)
  return {
    stand: aktuell,
    /** Oeffnet den Dialog des Browsers. Nur bei stand === 'bereit'. */
    installieren: async () => {
      const e = ereignis
      if (!e) return
      ereignis = null
      melden()
      await e.prompt()
      const wahl = await e.userChoice.catch(() => null)
      if (wahl?.outcome === 'dismissed') hinweisSchliessen()
    },
  }
}

/** Soll der Hinweis auf der Startseite erscheinen? Ab dem zweiten Besuchstag, nicht nach "Nicht jetzt". */
export function hinweisErlaubt(): boolean {
  const zu = Number(lesen(SCHLUESSEL_ZU) ?? 0)
  if (zu && Date.now() - zu < RUHE_TAGE * 86_400_000) return false
  const anzahl = Number((lesen(SCHLUESSEL_BESUCHE) ?? '').split('|')[1]) || 0
  return anzahl >= 2
}

export function hinweisSchliessen() {
  schreiben(SCHLUESSEL_ZU, String(Date.now()))
}
