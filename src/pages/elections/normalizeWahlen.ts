/**
 * API liefert Stimmenanteile und Wahlbeteiligung oft als Dezimalzahl 0–1
 * (z. B. 0,794 für 79,4 %). Werte > 1 gelten als bereits in Prozent.
 */
export function toDisplayPercent(raw: number | null | undefined): number {
  if (raw == null || Number.isNaN(raw)) return 0
  if (raw >= 0 && raw <= 1) return raw * 100
  return raw
}

/**
 * GET /api/wahlen/change: `change` ist die Differenz der Stimmenanteile in Dezimalform
 * (z. B. 0,05 = 5 Prozentpunkte), auch negativ. Immer ×100 — nicht `toDisplayPercent`
 * (dessen 0–1-Heuristik bricht bei z. B. −0,002).
 */
export function changeToDisplayPp(raw: number | null | undefined): number {
  if (raw == null || Number.isNaN(raw)) return 0
  return raw * 100
}

const AGS_KEY_PAD = 5

/** Tooltip/Anzeige: zuerst GeoJSON-Namen, mit AGS-Varianten (führende Nullen). */
export function resolveKreisDisplayName(
  ags: string,
  kreisNameByAgs: Map<string, string>,
  apiName?: string | null,
): string {
  const base = ags.replace(/\s/g, '')
  const candidates = new Set<string>([base])
  if (/^\d+$/.test(base)) {
    if (base.length < AGS_KEY_PAD) candidates.add(base.padStart(AGS_KEY_PAD, '0'))
    if (base.length > AGS_KEY_PAD) candidates.add(base.slice(0, AGS_KEY_PAD))
  }
  for (const k of candidates) {
    const n = kreisNameByAgs.get(k)
    if (n != null && String(n).trim() !== '') return String(n).trim()
  }
  const raw = apiName
  if (
    raw != null &&
    String(raw).trim() !== '' &&
    String(raw).toLowerCase() !== 'null'
  ) {
    return String(raw).trim()
  }
  return base
}

/** Rohzeile von GET /api/wahlen/map */
export type MapRowFromApi = {
  ags: string
  ags_name?: string | null
  value: number
  winning_party: string
  turnout: number
}

export type MapRow = {
  ags: string
  ags_name: string
  value: number
  winning_party: string
  turnout: number
}

export function normalizeMapRow(
  r: MapRowFromApi,
  kreisNameByAgs: Map<string, string>,
): MapRow {
  const k = r.ags.replace(/\s/g, '')
  const geo = kreisNameByAgs.get(k)
  const rawName = r.ags_name
  const hasName =
    rawName != null &&
    String(rawName).trim() !== '' &&
    String(rawName).toLowerCase() !== 'null'
  const ags_name = hasName ? String(rawName).trim() : (geo ?? k)

  return {
    ...r,
    ags_name,
    turnout: toDisplayPercent(r.turnout),
    value: toDisplayPercent(r.value),
  }
}
