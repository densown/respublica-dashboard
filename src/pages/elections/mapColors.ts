import { interpolateRgb } from 'd3-interpolate'
import {
  CHANGE_SCALE_NEG,
  CHANGE_SCALE_POS,
  MAIN_PARTIES,
  PARTY_COLORS_LIGHT,
  TURNOUT_SCALE,
} from './partyColors'

export function partyShareColor(
  party: string,
  pct: number,
  partyColors: Record<string, string> = PARTY_COLORS_LIGHT,
): string {
  const base = partyColors[party] ?? partyColors.other ?? PARTY_COLORS_LIGHT.other
  const t = Math.min(1, Math.max(0, pct / 40))
  return interpolateRgb('#ffffff', base)(t) ?? '#ffffff'
}

export function turnoutColor(
  turnout: number,
  minT: number,
  maxT: number,
): string {
  if (Number.isNaN(turnout)) return TURNOUT_SCALE[0]!
  if (maxT <= minT) return TURNOUT_SCALE[TURNOUT_SCALE.length - 1]!
  const u = Math.min(1, Math.max(0, (turnout - minT) / (maxT - minT)))
  const n = TURNOUT_SCALE.length
  const f = u * (n - 1)
  const i = Math.floor(f)
  const t = f - i
  const a = TURNOUT_SCALE[i]!
  const b = TURNOUT_SCALE[Math.min(i + 1, n - 1)]!
  return interpolateRgb(a, b)(t) ?? a
}

/**
 * Veränderungskarte: unter ~2 Pp neutral, ab ~8 Pp volle Sättigung; zusätzlich
 * Skalierung nach max. |Δ| im Datensatz. Gewinne = Grün, Verluste = Rot.
 */
export function changeColor(
  delta: number,
  maxAbs: number,
  themeNeutral: string,
): string {
  const a = Math.abs(delta)
  if (a < 1e-9) return themeNeutral
  const satEnd = Math.max(8, maxAbs)
  const uRamp = a < 2 ? 0 : Math.min(1, (a - 2) / (satEnd - 2))
  const uRank =
    maxAbs > 2 && a >= 2 ? Math.min(1, (a - 2) / (maxAbs - 2)) : 0
  const u = Math.max(uRamp, uRank)
  if (u <= 0) return themeNeutral
  const full =
    delta < 0 ? CHANGE_SCALE_NEG[0]! : CHANGE_SCALE_POS[CHANGE_SCALE_POS.length - 1]!
  return interpolateRgb(themeNeutral, full)(u) ?? themeNeutral
}

export function mapFillColor(args: {
  metric: string
  value?: number
  turnout?: number
  winningParty?: string
  turnoutMin: number
  turnoutMax: number
  /** Light/Dark: CDU/CSU etc. */
  partyColors?: Record<string, string>
}): string {
  const {
    metric,
    value,
    turnout,
    winningParty,
    turnoutMin,
    turnoutMax,
    partyColors = PARTY_COLORS_LIGHT,
  } = args
  if (metric === 'winning_party') {
    const w = winningParty ?? 'other'
    return partyColors[w] ?? partyColors.other ?? PARTY_COLORS_LIGHT.other
  }
  if (metric === 'turnout') {
    return turnoutColor(turnout ?? 0, turnoutMin, turnoutMax)
  }
  if (MAIN_PARTIES.includes(metric as (typeof MAIN_PARTIES)[number])) {
    return partyShareColor(metric, value ?? 0, partyColors)
  }
  return partyShareColor(metric, value ?? 0, partyColors)
}
