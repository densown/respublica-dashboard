/**
 * Nimmt die Einzelbilder fuer das Werbevideo von der LIVE-Seite auf.
 *
 *     node scripts/promo/shots.mjs [--basis https://app.respublica.media]
 *
 * Bewusst Standbilder statt Bildschirmaufnahme. Gruende:
 *   - Schaerfe. Aufgenommen wird mit doppelter bzw. dreifacher Punktdichte
 *     und erst beim Zusammenbau verkleinert. Eine Bildschirmaufnahme
 *     liefert genau die Zielaufloesung und danach frisst der Codec davon.
 *   - Der Server hat 3 GB Arbeitsspeicher. Chromium samt laufender
 *     Videokodierung passt da nicht zuverlaessig hinein, ein Bild nach dem
 *     anderen schon.
 *   - Wiederholbarkeit. Kein Mauszeiger, der mal danebentrifft, keine
 *     Aufnahme, die je nach Serverlast anders lang wird.
 *
 * Aufgenommen wird gegen die oeffentliche Adresse, nicht gegen localhost:
 * das Video soll zeigen, was Besucher sehen, samt Auslieferung ueber nginx.
 */
import puppeteer from 'puppeteer-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HIER = dirname(fileURLToPath(import.meta.url))
const AUS = join(HIER, 'frames')
const CHROME = '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const BASIS = arg('basis', 'https://app.respublica.media').replace(/\/$/, '')

// Beide Seitenverhaeltnisse exakt, damit beim Zusammenbau nicht beschnitten
// werden muss: 1440x810 und 405x720 sind beide genau 16:9 bzw. 9:16.
// Die Punktdichte hebt die Aufnahme ueber die Zielaufloesung; verkleinern
// schaerft, vergroessern nicht.
const FORMATE = {
  quer: { width: 1440, height: 810, deviceScaleFactor: 2 },   // -> 2880x1620
  hoch: { width: 405, height: 720, deviceScaleFactor: 3 },    // -> 1215x2160
}

const WAHL = 'ltw-sachsen-anhalt-2026'

/**
 * scroll: Text, auf den gescrollt wird. Der Abschnitt wird gesucht, nicht
 * eine Pixelhoehe angesteuert — Pixelhoehen verschieben sich, sobald sich
 * die Datenmenge aendert, und das Bild zeigt dann die falsche Stelle.
 */
const SZENEN = [
  { id: '01-uebersicht', pfad: '/' },
  { id: '02-umfragen', pfad: `/wahlen/umfragen?wahl=${WAHL}` },
  { id: '03-koalition', pfad: `/wahlen/umfragen?wahl=${WAHL}`, scroll: /Rechnerische Mehrheiten/i },
  { id: '04-verlauf', pfad: `/wahlen/umfragen?wahl=${WAHL}`, scroll: /^Verlauf$/i },
  { id: '05-kandidaturen', pfad: `/wahlen/kandidaturen?wahl=${WAHL}` },
  { id: '06-bundestag', pfad: '/bundestag' },
  { id: '07-gesetzgebung', pfad: '/gesetzgebung' },
  { id: '08-lobbyregister', pfad: '/lobbyregister' },
  { id: '09-eu-recht', pfad: '/eu-recht' },
]

const schlafe = (ms) => new Promise((r) => setTimeout(r, ms))

async function scrolleZuText(page, muster) {
  return page.evaluate((quelle) => {
    const re = new RegExp(quelle, 'i')
    // Ueberschriften zuerst: sie markieren den Abschnittsanfang. Ein
    // beliebiges Element mit passendem Text waere oft der Fliesstext
    // darunter, und dann steht die Ueberschrift schon ausserhalb des Bildes.
    const kandidaten = [...document.querySelectorAll('h1,h2,h3,h4')]
    const treffer = kandidaten.find((e) => re.test((e.textContent || '').trim()))
    if (!treffer) return { gefunden: false, bewegt: 0 }

    // Nicht window.scrollTo: das Grundgeruest steht auf overflow:hidden und
    // scrollt den Inhalt in einem eigenen Bereich. Am Fenster zu scrollen
    // meldet Erfolg und bewegt nichts. scrollIntoView findet den richtigen
    // Bereich selbst.
    const bereich = (() => {
      let e = treffer.parentElement
      while (e) {
        const s = getComputedStyle(e)
        if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight) return e
        e = e.parentElement
      }
      return document.scrollingElement
    })()

    const vorher = bereich.scrollTop
    treffer.scrollIntoView({ block: 'start', behavior: 'instant' })
    bereich.scrollTop = Math.max(0, bereich.scrollTop - 24)   // Luft ueber der Ueberschrift
    return { gefunden: true, bewegt: Math.round(bereich.scrollTop - vorher) }
  }, muster.source)
}

async function ruhig(page) {
  // Zwei getrennte Wartegruende: die API muss antworten, und recharts
  // animiert seine Balken und Linien beim Einblenden. Ohne die zweite
  // Wartezeit steht im Bild ein halb aufgebautes Diagramm.
  await page.waitForNetworkIdle({ idleTime: 700, timeout: 25000 }).catch(() => {})
  await schlafe(1800)
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--font-render-hinting=none',   // gleichmaessige Kantenglaettung
    '--force-color-profile=srgb',   // sonst weichen die Rottoene ab
    '--hide-scrollbars',
  ],
})

const bericht = []

for (const [format, viewport] of Object.entries(FORMATE)) {
  const ordner = join(AUS, format)
  await mkdir(ordner, { recursive: true })
  const page = await browser.newPage()
  await page.setViewport(viewport)

  for (const szene of SZENEN) {
    const url = `${BASIS}${szene.pfad}`
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await ruhig(page)
      if (szene.scroll) {
        const r = await scrolleZuText(page, szene.scroll)
        // Beides melden. "Gefunden" allein sagt nichts darueber, ob das Bild
        // danach die richtige Stelle zeigt — genau daran ist der erste
        // Durchlauf still gescheitert.
        if (!r.gefunden) bericht.push(`  ! ${format}/${szene.id}: Abschnitt nicht gefunden`)
        else if (r.bewegt === 0) bericht.push(`  ! ${format}/${szene.id}: gefunden, aber nicht gescrollt`)
        await schlafe(600)
      }
      const ziel = join(ordner, `${szene.id}.png`)
      await page.screenshot({ path: ziel })
      bericht.push(`  ${format}/${szene.id}`)
    } catch (e) {
      bericht.push(`  X ${format}/${szene.id}: ${e.message.split('\n')[0]}`)
    }
  }
  await page.close()
}

await browser.close()

// Reihenfolge und Dauer stehen in der Textfassung, nicht hier: der
// Zusammenbau soll sich aendern lassen, ohne neu aufzunehmen.
await writeFile(join(AUS, 'bericht.txt'), bericht.join('\n') + '\n')
console.log(bericht.join('\n'))
