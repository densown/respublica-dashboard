/*
 * Service Worker von app.respublica.media.
 *
 * Zweck: Die App laesst sich als Web-App installieren ("Zum Startbildschirm")
 * und startet auch bei schlechter Verbindung. Absichtlich schlicht:
 *
 * - Seitenaufrufe: immer zuerst das Netz. Nur ohne Netz kommt die zuletzt
 *   gespeicherte index.html. Nach einem Deploy sieht also niemand eine alte
 *   Fassung, solange er online ist.
 * - /assets/ (Dateinamen mit Hash, aendern sich bei jedem Build): einmal
 *   geladen, dann aus dem Speicher. Hoechstens 200 Dateien, aelteste fliegen.
 * - Symbole und Schriften: aus dem Speicher, im Hintergrund aufgefrischt.
 * - API (/api/), Kartendaten (/data/), Admin und fremde Adressen: nie
 *   gespeichert, laufen am Service Worker vorbei.
 *
 * - Auf Zuruf der Seite laedt er im Hintergrund alle Skripte und Stile des
 *   aktuellen Builds (Liste VORLADEN, setzt vite.config.ts beim Build ein),
 *   damit ohne Netz auch noch nicht besuchte Seiten aufgehen.
 *
 * Bei Aenderungen an dieser Datei VERSION hochzaehlen: alte Speicher werden
 * beim Aktivieren geloescht.
 */
const VERSION = 'v1'
const SHELL = `rp-app-shell-${VERSION}`
const ASSETS = `rp-app-assets-${VERSION}`
const MAX_ASSETS = 200
// Wird beim Build ersetzt (vite.config.ts). Im Entwicklungsmodus leer.
const VORLADEN = []

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(['/index.html', '/manifest.webmanifest', '/app-icon-192.png']))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('rp-app-') && k !== SHELL && k !== ASSETS)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Die Seite schickt nach dem Laden "vorladen" (useInstallieren.ts). Ueber
// eine Nachricht statt im activate-Ereignis, weil der Browser bis zum Ende
// von activate alle Anfragen der Seite zurueckhaelt.
self.addEventListener('message', (event) => {
  if (event.data === 'vorladen') event.waitUntil(vorladen())
})

// Fehlende Dateien des aktuellen Builds holen, eine nach der anderen, damit
// es langsame Leitungen nicht verstopft. Fehler sind egal: dann eben spaeter.
async function vorladen() {
  const cache = await caches.open(ASSETS)
  for (const pfad of VORLADEN) {
    try {
      if (await cache.match(pfad, { ignoreVary: true })) continue
      const antwort = await fetch(pfad)
      if (antwort.ok) await cache.put(pfad, antwort)
    } catch {
      /* naechste */
    }
  }
}

async function kuerzen(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

async function seite(request) {
  try {
    const antwort = await fetch(request)
    // Die frische Huelle fuer den naechsten Start ohne Netz merken. Nur echte
    // App-Seiten (Status 200), keine 404-Seite.
    if (antwort.ok && antwort.type === 'basic') {
      const kopie = antwort.clone()
      caches.open(SHELL).then((c) => c.put('/index.html', kopie)).catch(() => undefined)
    }
    return antwort
  } catch (fehler) {
    const gespeichert = await caches.match('/index.html', { cacheName: SHELL, ignoreVary: true })
    if (gespeichert) return gespeichert
    throw fehler
  }
}

async function datei(request) {
  const gespeichert = await caches.match(request, { cacheName: ASSETS, ignoreVary: true })
  if (gespeichert) return gespeichert
  const antwort = await fetch(request)
  if (antwort.ok && antwort.type === 'basic') {
    const kopie = antwort.clone()
    caches
      .open(ASSETS)
      .then((c) => c.put(request, kopie))
      .then(() => kuerzen(ASSETS, MAX_ASSETS))
      .catch(() => undefined)
  }
  return antwort
}

async function auffrischen(request) {
  const cache = await caches.open(SHELL)
  const gespeichert = await cache.match(request, { ignoreVary: true })
  const netz = fetch(request)
    .then((antwort) => {
      if (antwort.ok && antwort.type === 'basic') cache.put(request, antwort.clone())
      return antwort
    })
    .catch(() => gespeichert)
  return gespeichert || netz
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/data/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname === '/sw.js'
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(seite(request))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(datei(request))
    return
  }
  if (/^\/(?:app-icon-|icon-)[^/]+\.(?:png|jpg)$|\.woff2$/.test(url.pathname)) {
    event.respondWith(auffrischen(request))
  }
})
