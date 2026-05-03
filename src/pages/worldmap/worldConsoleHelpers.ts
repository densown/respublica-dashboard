import type { WorldCountryDetail } from './worldTypes'

export type WorldIndicatorRow = NonNullable<WorldCountryDetail['indicators']>[number]

export function latestValue(indicator: WorldIndicatorRow | null | undefined): {
  year: number
  value: number
} | null {
  if (!indicator?.values?.length) return null
  for (let i = indicator.values.length - 1; i >= 0; i--) {
    const v = indicator.values[i]
    if (v?.value != null && !Number.isNaN(v.value)) return { year: v.year, value: v.value }
  }
  return null
}

export function tailSeries(
  indicator: WorldIndicatorRow | null | undefined,
  n = 20,
): { y: number; v: number }[] {
  if (!indicator?.values?.length) return []
  const filtered = indicator.values.filter((v) => v?.value != null && !Number.isNaN(v.value))
  return filtered.slice(-n).map((v) => ({ y: v.year, v: v.value as number }))
}

export function trendFromValues(indicator: WorldIndicatorRow | null | undefined, n = 3): number | null {
  const tail = tailSeries(indicator, n)
  if (tail.length < 2) return null
  const first = tail[0]!.v,
    last = tail[tail.length - 1]!.v
  if (first === 0) return null
  return (last - first) / Math.abs(first)
}

export function findInd(
  detail: WorldCountryDetail | null | undefined,
  code: string,
): WorldIndicatorRow | undefined {
  return detail?.indicators?.find((i) => i.indicator_code === code)
}

export function fmtNumber(v: number | null | undefined, digits = 0, locale = 'de-DE'): string {
  if (v == null || Number.isNaN(v)) return '—'
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(v)
}

export function fmtUsd(v: number | null | undefined, locale = 'de-DE'): string {
  if (v == null || Number.isNaN(v)) return '—'
  if (v >= 1e9) return `${fmtNumber(v / 1e9, 1, locale)} Mrd. $`
  if (v >= 1e6) return `${fmtNumber(v / 1e6, 1, locale)} Mio. $`
  return `${fmtNumber(v, 0, locale)} $`
}

export function fmtPopulation(v: number | null | undefined, locale = 'de-DE'): string {
  if (v == null || Number.isNaN(v)) return '—'
  if (v >= 1e9) return `${fmtNumber(v / 1e9, 2, locale)} Mrd.`
  if (v >= 1e6) return `${fmtNumber(v / 1e6, 1, locale)} Mio.`
  if (v >= 1e3) return `${fmtNumber(v / 1e3, 0, locale)} Tsd.`
  return fmtNumber(v, 0, locale)
}

export function countryPercentileFromMapRows(
  iso3: string,
  rows: Array<{ country_code: string; value: number | null }>,
): number | null {
  const u = iso3.trim().toUpperCase()
  const nums = rows.filter((r) => r.value != null && !Number.isNaN(r.value as number)) as Array<{
    country_code: string
    value: number
  }>
  if (!nums.length) return null
  const sortedDesc = [...nums].sort((a, b) => b.value - a.value)
  const idx = sortedDesc.findIndex((r) => r.country_code.trim().toUpperCase() === u)
  if (idx < 0) return null
  const n = sortedDesc.length
  return ((n - idx) / n) * 100
}
