import { RAW_SEATS } from '../../data/bundestag-seats'
import { ohneWahlperiode, shortFraktionName } from './fraktion'
import type { StimmenZeile } from './stimmen'

/**
 * Wer sitzt wo im Halbrund. Die Sitzdaten kennen nur Fraktionen, die API nur
 * Abgeordnete. Zugeordnet wird je Fraktion nach Nachname, fortlaufend ueber
 * die Sitze dieser Fraktion. Vorher stand das in Bundestag.tsx; jetzt braucht
 * es auch die Abstimmungsseite.
 */

/** Zeile aus /api/abgeordnete */
export type AbgeordnetenApiRow = {
  id: number
  aw_id: number
  name: string
  fraktion: string
  wahlkreis: string
  foto_url: string | null
  profil_url: string | null
  nachname?: string
  /** Mandatsbeginn, nur bei Nachrueckern gesetzt (API ab Migration 019) */
  mandat_von?: string | null
  /** Mandatsende, nur bei Ausgeschiedenen gesetzt */
  mandat_bis?: string | null
}

/** Abgeordnete, wie Halbrund, Liste und Profil sie anzeigen. */
export type SitzAbgeordneter = {
  id: number
  aw_id: number
  name: string
  fraktion: string
  wahlkreis: string
  foto_url: string | null
  profil_url: string | null
}

type RawKategorie =
  | 'Die Linke'
  | 'SPD'
  | 'Grüne'
  | 'SSW'
  | 'CDU/CSU'
  | 'AfD'
  | 'Fraktionslos'

const KATEGORIEN: RawKategorie[] = [
  'Die Linke',
  'SPD',
  'Grüne',
  'SSW',
  'CDU/CSU',
  'AfD',
  'Fraktionslos',
]

const normalizeFraktion = (f: string): string => f.replace(/­/g, '').trim()
const SSW_NAME = 'Stefan Seidler'

function getEffektiveFraktion(abgeordneter: { name: string; fraktion: string }): string {
  if (normalizeFraktion(abgeordneter.name) === SSW_NAME) return 'SSW'
  return normalizeFraktion(abgeordneter.fraktion)
}

function canonicalKey(fraktion: string): string {
  const f = normalizeFraktion(fraktion).toLowerCase()
  if (f.includes('grün') || f.includes('bündnis')) return 'Grüne'
  if (f.includes('linke')) return 'Linke'
  if (f.includes('spd')) return 'SPD'
  if (f.includes('cdu') || f.includes('csu')) return 'CDU/CSU'
  if (f.includes('afd')) return 'AfD'
  if (f.includes('ssw')) return 'SSW'
  if (f === 'fraktionslos') return 'Fraktionslos'
  return fraktion
}

function apiFraktionToRawKategorie(apiFraktion: string): RawKategorie {
  const key = canonicalKey(apiFraktion)
  if (key === 'Linke') return 'Die Linke'
  if (key === 'SPD') return 'SPD'
  if (key === 'Grüne') return 'Grüne'
  if (key === 'SSW') return 'SSW'
  if (key === 'CDU/CSU') return 'CDU/CSU'
  if (key === 'AfD') return 'AfD'
  return 'Fraktionslos'
}

function getNachname(row: AbgeordnetenApiRow): string {
  const n = (row.nachname ?? row.name).trim()
  if (!n) return ''
  const parts = n.replace(/\s+/g, ' ').split(' ')
  return (parts[parts.length - 1] ?? n).trim()
}

function alsAnzeige(a: AbgeordnetenApiRow): SitzAbgeordneter {
  return {
    id: a.id,
    aw_id: a.aw_id,
    name: a.name,
    fraktion: shortFraktionName(a.fraktion),
    wahlkreis: ohneWahlperiode(a.wahlkreis),
    foto_url: a.foto_url ?? null,
    profil_url: a.profil_url ?? null,
  }
}

/** Sitznummer im Halbrund zu Abgeordneten. */
export function sitzeZuordnen(abgeordnete: AbgeordnetenApiRow[]): Map<number, SitzAbgeordneter> {
  const map = new Map<number, SitzAbgeordneter>()

  const seatsByKategorie = Object.fromEntries(KATEGORIEN.map((k) => [k, [] as number[]])) as Record<
    RawKategorie,
    number[]
  >
  for (let seatId = 0; seatId < RAW_SEATS.length; seatId++) {
    const rawLabel = normalizeFraktion(RAW_SEATS[seatId][2])
    seatsByKategorie[apiFraktionToRawKategorie(canonicalKey(rawLabel))].push(seatId)
  }
  const offsetByKategorie = Object.fromEntries(KATEGORIEN.map((k) => [k, 0])) as Record<
    RawKategorie,
    number
  >

  const abgByFraktion = new Map<string, AbgeordnetenApiRow[]>()
  for (const a of abgeordnete) {
    if (!a?.fraktion) continue
    const fraktionKey = canonicalKey(getEffektiveFraktion({ name: a.name, fraktion: a.fraktion }))
    const list = abgByFraktion.get(fraktionKey) ?? []
    list.push(a)
    abgByFraktion.set(fraktionKey, list)
  }

  // Pro Sitz-Kategorie fortlaufend zuordnen (falls die API mehrere
  // Fraktionen liefert, die auf dieselbe Kategorie fallen).
  for (const [fraktion, abgListRaw] of abgByFraktion.entries()) {
    const k = apiFraktionToRawKategorie(fraktion)
    const seatIndices = seatsByKategorie[k]
    const start = offsetByKategorie[k]
    if (start >= seatIndices.length) continue

    const abgListSorted = [...abgListRaw].sort((a, b) =>
      getNachname(a).localeCompare(getNachname(b), 'de', { sensitivity: 'base' }),
    )
    const take = Math.min(seatIndices.length - start, abgListSorted.length)
    for (let i = 0; i < take; i++) {
      map.set(seatIndices[start + i], alsAnzeige(abgListSorted[i]))
    }
    offsetByKategorie[k] = start + take
  }

  return map
}

/** abgeordnetenwatch-ID zu Abgeordneten. */
export function nachAwId(abgeordnete: AbgeordnetenApiRow[]): Map<number, SitzAbgeordneter> {
  const map = new Map<number, SitzAbgeordneter>()
  for (const a of abgeordnete) map.set(a.aw_id, alsAnzeige(a))
  return map
}

/** Heute im Amt: ohne Mandatsende oder mit einem Ende ab heute. */
export function imAmt(a: AbgeordnetenApiRow, heute = new Date().toISOString().slice(0, 10)): boolean {
  return !a.mandat_bis || a.mandat_bis >= heute
}

/**
 * Sitze und Personen fuer eine einzelne Abstimmung: wer damals abgestimmt hat,
 * mit der Fraktion von damals. So sitzen Nachruecker und spaeter
 * Ausgeschiedene dort, wo sie an dem Tag sassen. Wahlkreis, Foto und Profil
 * kommen aus /api/abgeordnete?alle=1. Ohne Einzelstimmen (neue Abstimmung,
 * Stimmen noch nicht geladen) gilt die heutige Besetzung.
 */
export function abstimmungsSitze(
  votes: StimmenZeile[],
  abgeordnete: AbgeordnetenApiRow[],
): { sitze: Map<number, SitzAbgeordneter>; personen: Map<number, SitzAbgeordneter> } {
  if (!votes.length) {
    return { sitze: sitzeZuordnen(abgeordnete.filter((a) => imAmt(a))), personen: nachAwId(abgeordnete) }
  }
  const info = new Map(abgeordnete.map((a) => [a.aw_id, a] as const))
  const zeilen: AbgeordnetenApiRow[] = votes.map((v) => {
    const a = info.get(v.mandate_id)
    return {
      id: a?.id ?? v.mandate_id,
      aw_id: v.mandate_id,
      name: a?.name ?? v.abgeordneter_name,
      fraktion: v.fraction_label || a?.fraktion || '',
      wahlkreis: a?.wahlkreis ?? '',
      foto_url: a?.foto_url ?? null,
      profil_url: a?.profil_url ?? null,
      nachname: a?.nachname,
    }
  })
  return { sitze: sitzeZuordnen(zeilen), personen: nachAwId(zeilen) }
}

