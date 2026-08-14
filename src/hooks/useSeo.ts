import { useEffect } from 'react'

const MARKE = 'Res.Publica'
const BASIS = 'https://app.respublica.media'

function setzeMeta(auswahl: string, attribut: string, wert: string, inhalt: string) {
  let el = document.head.querySelector<HTMLMetaElement>(auswahl)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attribut, wert)
    document.head.appendChild(el)
  }
  el.setAttribute('content', inhalt)
}

export type SeoOptions = {
  /** Ohne Marke — die wird angehängt. */
  titel: string
  beschreibung?: string
  /** Pfad ohne Domain, etwa "/wahlen/umfragen". Standard: aktueller Pfad. */
  pfad?: string
  /**
   * Aus dem Index halten. Für Seiten, die keinen eigenen Inhalt tragen —
   * Fehlerseite, Verwaltung, bewusst unveröffentlichte Entwürfe.
   */
  nichtIndexieren?: boolean
}

/**
 * Setzt Titel, Beschreibung, Canonical und Teilen-Vorschau je Seite.
 *
 * Vorher trugen alle elf Routen denselben Titel "Res.Publica Dashboard" und
 * hatten keine Beschreibung — jede Seite konkurrierte bei Google mit jeder
 * anderen um dieselbe Bezeichnung, und geteilte Links zeigten überall
 * dasselbe.
 *
 * Bewusst ohne zusätzliche Bibliothek: react-helmet und Verwandte wiegen
 * mehr als diese dreißig Zeilen, und das Bundle liegt bereits bei 2,3 MB.
 */
export function useSeo({ titel, beschreibung, pfad, nichtIndexieren }: SeoOptions) {
  useEffect(() => {
    // Mittelpunkt als Trenner, kein Gedankenstrich: derselbe Trenner steht
    // auf dem Teilen-Bild zwischen den Kennzahlen, und der lange Strich
    // liest sich in Suchergebnissen wie ein Nachsatz statt wie ein Titel.
    const voll = titel.includes(MARKE) ? titel : `${titel} · ${MARKE}`
    document.title = voll

    const url = `${BASIS}${pfad ?? window.location.pathname}`

    let kanonisch = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!kanonisch) {
      kanonisch = document.createElement('link')
      kanonisch.rel = 'canonical'
      document.head.appendChild(kanonisch)
    }
    kanonisch.href = url

    setzeMeta('meta[property="og:title"]', 'property', 'og:title', voll)
    setzeMeta('meta[property="og:url"]', 'property', 'og:url', url)

    if (beschreibung) {
      setzeMeta('meta[name="description"]', 'name', 'description', beschreibung)
      setzeMeta(
        'meta[property="og:description"]',
        'property',
        'og:description',
        beschreibung,
      )
    }

    // robots nur setzen, wenn die Seite ausgeschlossen werden soll — und beim
    // Verlassen wieder entfernen, sonst schleppt eine Einzelseite ihr noindex
    // durch die ganze Sitzung.
    const vorhanden = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (nichtIndexieren) {
      setzeMeta('meta[name="robots"]', 'name', 'robots', 'noindex, follow')
    } else if (vorhanden) {
      vorhanden.remove()
    }

    return () => {
      if (nichtIndexieren) {
        document.head.querySelector('meta[name="robots"]')?.remove()
      }
    }
  }, [titel, beschreibung, pfad, nichtIndexieren])
}
