import type { Abdeckung, Mass, StatsResponse } from './types'

/**
 * Zeitachse mit ehrlichen Luecken.
 *
 * Die API liefert nur Perioden mit Versammlungen. Eine fehlende Periode kann
 * zweierlei heissen: keine Versammlung, oder keine Daten. Unterschieden wird
 * ueber `abdeckung`: nur Perioden, die vollstaendig in einem abgedeckten
 * Zeitraum liegen, bekommen einen Wert (notfalls 0). Alle anderen sind null
 * und unterbrechen die Linie. Das gilt auch fuer angeschnittene Perioden am
 * Rand einer Luecke und fuer die laufende Periode: ein halber Monat saehe
 * aus wie ein Einbruch.
 */

export type Punkt = { periode: string; wert: number | null }
export type Luecke = { von: string; bis: string }

const TAG_MS = 86_400_000

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function parse(s: string): Date {
  return new Date(`${s}T00:00:00Z`)
}

function abgedeckt(von: Date, bis: Date, abdeckung: Abdeckung[], heute: Date): boolean {
  if (bis > heute) return false
  return abdeckung.some((a) => {
    const aVon = parse(a.von)
    const aBis = a.bis ? parse(a.bis) : heute
    return von >= aVon && bis <= aBis
  })
}

/** Perioden von `von` bis `bis`: Monate (YYYY-MM) oder Wochen (Montag, YYYY-MM-DD). */
function perioden(von: string, bis: string, woche: boolean): { key: string; start: Date; ende: Date }[] {
  const out: { key: string; start: Date; ende: Date }[] = []
  const ende = parse(bis)
  if (woche) {
    let d = parse(von)
    d = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * TAG_MS)
    while (d <= ende) {
      out.push({ key: iso(d), start: d, ende: new Date(d.getTime() + 6 * TAG_MS) })
      d = new Date(d.getTime() + 7 * TAG_MS)
    }
  } else {
    let d = parse(`${von.slice(0, 7)}-01`)
    while (d <= ende) {
      const naechster = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
      out.push({ key: iso(d).slice(0, 7), start: d, ende: new Date(naechster.getTime() - TAG_MS) })
      d = naechster
    }
  }
  return out
}

export function zeitreihe(
  stats: StatsResponse,
  von: string,
  bis: string,
  woche: boolean,
  mass: Mass,
  heute: string,
): { punkte: Punkt[]; luecken: Luecke[] } {
  const werte = new Map<string, number>(
    woche
      ? stats.pro_woche.map((p) => [p.woche, p[mass]])
      : stats.pro_monat.map((p) => [p.monat, p[mass]]),
  )
  const h = parse(heute)
  const punkte: Punkt[] = []
  const luecken: Luecke[] = []
  let offen: Luecke | null = null
  for (const p of perioden(von, bis, woche)) {
    const ok = abgedeckt(p.start, p.ende, stats.abdeckung, h)
    punkte.push({ periode: p.key, wert: ok ? (werte.get(p.key) ?? 0) : null })
    // Luecke = vergangene Periode ohne Daten. Die laufende Periode ist
    // unvollstaendig, nicht unbekannt, und wird deshalb nicht markiert.
    const vergangen = p.ende < h
    if (!ok && vergangen) {
      if (offen) offen.bis = p.key
      else offen = { von: p.key, bis: p.key }
    } else if (offen) {
      luecken.push(offen)
      offen = null
    }
  }
  if (offen) luecken.push(offen)
  return { punkte, luecken }
}

/** Datenluecken innerhalb eines Zeitraums, fuer den Vorspann. */
export function datenluecken(abdeckung: Abdeckung[], von: string, bis: string): Luecke[] {
  const bereiche = abdeckung
    .map((a) => ({ von: a.von, bis: a.bis ?? bis }))
    .sort((a, b) => a.von.localeCompare(b.von))
  const out: Luecke[] = []
  let cursor = von
  for (const b of bereiche) {
    if (b.bis < cursor) continue
    if (b.von > cursor) {
      const lueckeBis = iso(new Date(parse(b.von).getTime() - TAG_MS))
      out.push({ von: cursor, bis: lueckeBis < bis ? lueckeBis : bis })
    }
    const naechster = iso(new Date(parse(b.bis).getTime() + TAG_MS))
    if (naechster > cursor) cursor = naechster
    if (cursor > bis) break
  }
  return out.filter((l) => l.von <= bis && l.von <= l.bis)
}
