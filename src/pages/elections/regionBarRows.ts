import type { PartyBarRow } from './PartyBarChart'
import { MAIN_PARTIES } from './partyColors'
import { toDisplayPercent } from './normalizeWahlen'
import type { RegionElectionRow } from './types'

const MIN_SINGLE_RESULT_PCT = 0.5

function rawShare(row: RegionElectionRow, key: string): number {
  const n = Number(row[key])
  return Number.isFinite(n) ? n : 0
}

/** Horizontales Balkendiagramm im Einzelergebnis: Parteien > 0,5 %, absteigend. */
export function regionRowToSingleResultBars(
  row: RegionElectionRow | undefined,
): PartyBarRow[] {
  if (!row) return []
  const out: PartyBarRow[] = []
  for (const k of MAIN_PARTIES) {
    const v = toDisplayPercent(rawShare(row, k))
    if (v > MIN_SINGLE_RESULT_PCT) out.push({ party: k, value: v })
  }
  out.sort((a, b) => b.value - a.value)
  return out
}
