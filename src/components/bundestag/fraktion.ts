import { NEUTRAL_FALLBACK, SSW } from '../../design-system/palettes'
import {
  partyColorsForTheme,
  partyTextColorsForTheme,
} from '../../pages/elections/partyColors'

/**
 * Fraktionen im Bundestag: Namen kuerzen, ordnen, einfaerben.
 *
 * Die API liefert Fraktionen so, wie abgeordnetenwatch sie fuehrt, etwa
 * "SPD (Bundestag 2025 - 2029)" oder mit weichem Trennstrich in
 * "BÜNDNIS 90/­DIE GRÜNEN". Balken, Liste und Halbrund gehen ueber diese
 * Funktionen, damit sie dieselben Namen und Farben zeigen.
 */

/** Antwort von /api/bundestag/abstimmungen/:pollId */
export type AbstimmungsDetailData = {
  poll_id: number
  poll_titel: string
  poll_datum: string
  ergebnis: {
    ja_gesamt: number
    nein_gesamt: number
    enthalten_gesamt: number
    abwesend_gesamt: number
  }
  fraktionen: FraktionsErgebnis[]
  /**
   * Noch nicht in der API. Vorgesehen: Einleitungstext und Ergebnis von
   * abgeordnetenwatch (field_intro, field_accepted) und Link zur Quelle.
   */
  intro?: string | null
  angenommen?: boolean | null
  quelle_url?: string | null
}

export type FraktionsErgebnis = {
  partei: string
  ja: number
  nein: number
  enthalten: number
  abwesend: number
}

const BUNDESTAG_WP_SUFFIX = /\s*\(Bundestag\s+2025\s*[-–]\s*2029\)\s*$/i
const normalizeFraktion = (f: string): string => f.replace(/­/g, '').trim()

/**
 * Wahlkreis ohne angehaengte Wahlperiode: "92 - Köln I (Bundestag 2025 - 2029)"
 * wird "92 - Köln I". Listenabgeordnete haben keinen Wahlkreis.
 */
export function ohneWahlperiode(s: string | null | undefined): string {
  return (s ?? '').replace(BUNDESTAG_WP_SUFFIX, '').trim()
}

/** Kürzt API-Parteilabel für die Ansicht */
export function shortFraktionName(apiPartei: string): string {
  const s = normalizeFraktion(apiPartei).replace(BUNDESTAG_WP_SUFFIX, '').trim()
  const l = s.toLowerCase()
  if (
    (l.includes('bündnis') || l.includes('b90')) &&
    (l.includes('grün') || l.includes('grüne'))
  )
    return 'Grüne'
  if (l.includes('linke')) return 'Die Linke'
  if (l.includes('cdu') || l.includes('csu')) return 'CDU/CSU'
  if (/\bspd\b/.test(l)) return 'SPD'
  if (/\bafd\b/.test(l)) return 'AfD'
  if (l.includes('fraktionslos')) return 'Fraktionslos'
  if (l.includes('ssw')) return 'SSW'
  return s
}

/** Politische Reihenfolge links → rechts; nicht Gematchtes ans Ende */
export const PARTEI_ORDER = [
  'Linke',
  'Grüne',
  'BÜNDNIS',
  'SPD',
  'CDU',
  'AfD',
  'fraktionslos',
] as const

function matchesOrderToken(apiPartei: string, token: string): boolean {
  const p = normalizeFraktion(apiPartei).toLowerCase()
  const tok = token.toLowerCase()
  if (tok === 'grüne' || tok === 'bündnis')
    return p.includes('grün') || p.includes('bündnis')
  if (tok === 'linke') return p.includes('linke')
  if (tok === 'spd') return /\bspd\b/.test(p)
  if (tok === 'cdu') return p.includes('cdu') || p.includes('csu')
  if (tok === 'afd') return /\bafd\b/.test(p)
  if (tok === 'fraktionslos') return p.includes('fraktionslos')
  return p.includes(tok)
}

function politicalSortIndex(apiPartei: string): number {
  const hits = PARTEI_ORDER.map((token, i) =>
    matchesOrderToken(apiPartei, token) ? i : -1,
  ).filter((i) => i >= 0)
  return hits.length ? Math.min(...hits) : PARTEI_ORDER.length
}

function matchesSitzRow(apiPartei: string, stamm: string): boolean {
  const p = normalizeFraktion(apiPartei).toLowerCase()
  const s = normalizeFraktion(stamm).toLowerCase()
  if (s === 'grüne') return p.includes('grün') || p.includes('bündnis')
  if (s.includes('cdu') || stamm === 'CDU/CSU')
    return p.includes('cdu') || p.includes('csu')
  if (s === 'linke') return p.includes('linke')
  if (s === 'fraktionslos') return p.includes('fraktionslos')
  if (s === 'afd') return /\bafd\b/.test(p)
  if (s === 'spd') return /\bspd\b/.test(p)
  return p.includes(s) || normalizeFraktion(apiPartei).includes(normalizeFraktion(stamm))
}

/** Farbe aus sitzverteilung */
export function labelColorFromSitzverteilung(
  apiPartei: string,
  rows: { partei: string; farbe: string }[],
): string {
  const row = rows.find((r) => matchesSitzRow(apiPartei, r.partei))
  const farbe = row?.farbe
  if (!farbe) return NEUTRAL_FALLBACK
  return farbe
}

export function labelColorForLegendDot(
  apiPartei: string,
  rows: { partei: string; farbe: string }[],
  theme: 'light' | 'dark',
): string {
  const base = labelColorFromSitzverteilung(apiPartei, rows)
  if (theme === 'dark') {
    const hex = base.replace('#', '').toLowerCase()
    if (hex === '000000' || hex === '1a1a1a') return NEUTRAL_FALLBACK
  }
  return base
}

export function sortFraktionenByPoliticalOrder<
  T extends { partei: string },
>(fraktionen: T[]): T[] {
  return [...fraktionen].sort(
    (a, b) => politicalSortIndex(a.partei) - politicalSortIndex(b.partei),
  )
}

/** Schluessel in partyColors.ts zum gekuerzten Fraktionsnamen. */
function farbSchluessel(kurzname: string): string {
  switch (kurzname) {
    case 'CDU/CSU':
      return 'cdu_csu'
    case 'SPD':
      return 'spd'
    case 'Grüne':
      return 'gruene'
    case 'Die Linke':
      return 'linke_pds'
    case 'AfD':
      return 'afd'
    case 'SSW':
      return 'ssw'
    default:
      return 'other'
  }
}

/** Flaechenfarbe einer Fraktion, etwa fuer den Farbstreifen am Balken. */
export function fraktionsFlaeche(kurzname: string, dunkel: boolean): string {
  const key = farbSchluessel(kurzname)
  if (key === 'ssw') return SSW
  return partyColorsForTheme(dunkel)[key] ?? NEUTRAL_FALLBACK
}

/** Fraktionsname als Schrift in Parteifarbe, lesbar auf Papier und im Dunkeln. */
export function fraktionsSchrift(kurzname: string, dunkel: boolean): string {
  const farben = partyTextColorsForTheme(dunkel)
  return farben[farbSchluessel(kurzname)] ?? farben.other
}

/** Platzhalter, wenn weder Stimme noch Abgeordnetenliste die Fraktion kennen. */
export const OHNE_FRAKTION = '–'

/** Ohne gemeinsame Linie: dort gibt es keine Abweichung von der Fraktion. */
export function hatFraktionslinie(kurzname: string): boolean {
  return kurzname !== 'Fraktionslos' && kurzname !== 'SSW' && kurzname !== OHNE_FRAKTION
}

/**
 * Nach Groesse, wie im Plenarprotokoll und auf den Abstimmungskarten:
 * groesste Fraktion oben, Fraktionslose zuletzt.
 */
export function nachGroesse<T extends FraktionsErgebnis>(fraktionen: T[]): T[] {
  const groesse = (f: FraktionsErgebnis) => f.ja + f.nein + f.enthalten + f.abwesend
  return [...fraktionen].sort((a, b) => {
    const la = hatFraktionslinie(shortFraktionName(a.partei)) ? 0 : 1
    const lb = hatFraktionslinie(shortFraktionName(b.partei)) ? 0 : 1
    return la - lb || groesse(b) - groesse(a)
  })
}
