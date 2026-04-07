import type { WorldMapRow } from './worldTypes'

export function worldApiUrl(pathWithLeadingSlash: string): string {
  const raw = import.meta.env.VITE_API_BASE as string | undefined
  const base = (
    raw?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/$/, '')
  const path = pathWithLeadingSlash.startsWith('/')
    ? pathWithLeadingSlash
    : `/${pathWithLeadingSlash}`
  return new URL(path, `${base}/`).toString()
}

export async function fetchWorldMapRows(
  indicator: string,
  year: number,
): Promise<WorldMapRow[]> {
  const url = worldApiUrl(
    `/api/world/map?indicator=${encodeURIComponent(indicator)}&year=${String(year)}`,
  )
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<WorldMapRow[]>
}

/**
 * Percentile 0–100 im Ländervergleich für ein Jahr.
 * Bei lowerIsBetter werden Werte invertiert, damit „besser“ wieder hohes Perzentil ist.
 */
export function countryPercentileFromMapRows(
  iso3: string,
  rows: WorldMapRow[],
  lowerIsBetter: boolean,
): number | null {
  const key = iso3.trim().toUpperCase()
  const pairs: { iso: string; score: number }[] = []
  for (const r of rows) {
    if (r.value == null || Number.isNaN(r.value as number)) continue
    const v = r.value as number
    pairs.push({
      iso: r.country_code.trim().toUpperCase(),
      score: lowerIsBetter ? -v : v,
    })
  }
  if (!pairs.length) return null
  const mine = pairs.find((p) => p.iso === key)
  if (!mine) return null
  const sortedScores = [...new Set(pairs.map((p) => p.score))].sort(
    (a, b) => a - b,
  )
  const idx = sortedScores.indexOf(mine.score)
  if (idx < 0) return null
  if (sortedScores.length === 1) return 50
  return (idx / (sortedScores.length - 1)) * 100
}
