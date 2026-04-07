import type { Lang } from '../../design-system/ThemeContext'

export type WorldFormatContext = {
  indicatorCode: string
  category: string
  unit: string | null
  lang: Lang
}

function formatInt(v: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(v))
}

function formatFixed(v: number, digits: number, lang: Lang): string {
  const s = v.toFixed(digits)
  return lang === 'de' ? s.replace('.', ',') : s
}

function isPercentUnit(unit: string | null): boolean {
  if (!unit) return false
  const u = unit.trim().toLowerCase()
  if (u === '%') return true
  if (u.includes('% of') || u.includes('(%') || u.endsWith('%)')) return true
  if (u.includes('annual %')) return true
  return false
}

function isGovernanceCode(code: string): boolean {
  return /\.EST$/i.test(code)
}

/**
 * Zentrale Formatierung für Tooltip, Legende und DataCards.
 * Signatur wie gewünscht: value, unit, indicator_code (+ Sprache).
 */
export function formatWorldValue(
  value: number,
  unit: string | null,
  indicator_code: string,
  lang: Lang,
): string {
  const u = (unit || '').toLowerCase()
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''

  if (isGovernanceCode(indicator_code) || u.includes('estimate') && u.includes('2.5')) {
    return formatFixed(value, 2, lang)
  }

  if (isPercentUnit(unit)) {
    return `${formatFixed(value, 1, lang)} %`
  }

  if (indicator_code === 'NY.GDP.MKTP.CD') {
    if (abs >= 1e12) {
      const x = abs / 1e12
      const n = x >= 100 ? formatFixed(x, 0, lang) : formatFixed(x, 1, lang)
      return lang === 'de' ? `${sign}${n} Bio. $` : `${sign}${n} tn $`
    }
    if (lang === 'de' && abs >= 1e9 && abs < 10e9) {
      return `${sign}${formatFixed(abs / 1e9, 1, lang)} Bio. $`
    }
    if (abs >= 1e9) {
      const x = abs / 1e9
      const n = x >= 100 ? formatFixed(x, 0, lang) : formatFixed(x, 1, lang)
      return lang === 'de' ? `${sign}${n} Mrd. $` : `${sign}${n} bn $`
    }
    return lang === 'de'
      ? `${sign}${formatInt(value, lang)} $`
      : `${sign}${formatInt(value, lang)} $`
  }

  if (indicator_code === 'NY.GDP.PCAP.CD' || (u.includes('current us$') && abs < 1e6)) {
    return `${formatInt(value, lang)} $`
  }

  if (u.includes('current us$')) {
    return `${formatInt(value, lang)} $`
  }

  if (indicator_code === 'SP.POP.TOTL') {
    if (abs >= 1e9) {
      const x = abs / 1e9
      const n = x >= 100 ? formatFixed(x, 0, lang) : formatFixed(x, 1, lang)
      return lang === 'de' ? `${sign}${n} Mrd.` : `${sign}${n} bn`
    }
    if (abs >= 1e6) {
      const x = abs / 1e6
      const n = x >= 100 ? formatFixed(x, 0, lang) : formatFixed(x, 1, lang)
      return lang === 'de' ? `${sign}${n} Mio.` : `${sign}${n} m`
    }
    return formatInt(value, lang)
  }

  if (u.includes('per 1,000')) {
    return lang === 'de'
      ? `${formatFixed(value, 1, lang)} je 1.000`
      : `${formatFixed(value, 1, lang)} per 1k`
  }

  if (u.includes('per 100,000')) {
    return lang === 'de'
      ? `${formatFixed(value, value >= 100 ? 0 : 1, lang)} je 100.000`
      : `${formatFixed(value, value >= 100 ? 0 : 1, lang)} per 100k`
  }

  if (u.includes('per 100 people')) {
    return lang === 'de'
      ? `${formatFixed(value, 1, lang)} je 100`
      : `${formatFixed(value, 1, lang)} per 100`
  }

  if (abs < 1 && abs > 0 && !isPercentUnit(unit)) {
    return formatFixed(value, 2, lang)
  }

  if (u.includes('metric tons')) {
    return `${formatFixed(value, 2, lang)} t`
  }

  if (u.includes('kg of oil')) {
    return `${formatInt(value, lang)} kg`
  }

  if (u.includes('years') && !u.includes('%')) {
    return `${formatFixed(value, 1, lang)} ${lang === 'de' ? 'Jahre' : 'yr'}`
  }

  if (abs >= 1e9) {
    const x = abs / 1e9
    const n = x >= 100 ? formatFixed(x, 0, lang) : formatFixed(x, 1, lang)
    return lang === 'de' ? `${sign}${n} Mrd.` : `${sign}${n} bn`
  }
  if (abs >= 1e6) {
    const x = abs / 1e6
    const n = x >= 100 ? formatFixed(x, 0, lang) : formatFixed(x, 1, lang)
    return lang === 'de' ? `${sign}${n} Mio.` : `${sign}${n} m`
  }
  if (abs >= 1e3) {
    return formatInt(value, lang)
  }

  return formatFixed(value, abs > 0 && abs < 20 && !Number.isInteger(value) ? 2 : 1, lang)
}

/** Kompakte Einheit für Legenden-Zeile. */
export function shortenWorldUnit(unit: string | null, lang: Lang): string {
  if (!unit) return ''
  const u = unit.toLowerCase()
  if (u.includes('current us$')) return lang === 'de' ? '$' : '$'
  if (u.includes('estimate') && u.includes('2.5')) return lang === 'de' ? 'Score' : 'Score'
  if (u.includes('per 1,000')) return lang === 'de' ? 'je 1.000' : 'per 1k'
  if (u.includes('per 100,000')) return lang === 'de' ? 'je 100.000' : 'per 100k'
  if (u.includes('per 100 people')) return lang === 'de' ? 'je 100' : 'per 100'
  if (u.includes('metric tons')) return 't'
  if (u.includes('kg of oil')) return lang === 'de' ? 'kg' : 'kg'
  if (u.includes('years')) return lang === 'de' ? 'Jahre' : 'years'
  if (u.includes('%')) return '%'
  if (u.includes('persons') || u === 'count') return lang === 'de' ? 'Anz.' : 'count'
  return unit.length > 22 ? unit.slice(0, 20) + '…' : unit
}

export function formatWorldIndicatorValue(
  v: number,
  ctx: WorldFormatContext,
): string {
  return formatWorldValue(v, ctx.unit, ctx.indicatorCode, ctx.lang)
}

/** Einheitenspalte in Tabellen (Wert getrennt von Einheit). */
export type WorldTableUnitKind =
  | 'none'
  | 'percent'
  | 'per_1000'
  | 'usd'
  | 'years'
  | 'per_100k'
  | 'per_100'
  | 'index'
  | 'per_woman'

export function formatWorldTableParts(
  value: number,
  unit: string | null,
  indicator_code: string,
  lang: Lang,
): { valueText: string; unitKind: WorldTableUnitKind } {
  const u = (unit || '').toLowerCase()
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''

  if (
    isGovernanceCode(indicator_code) ||
    (u.includes('estimate') && u.includes('2.5'))
  ) {
    return { valueText: formatFixed(value, 2, lang), unitKind: 'index' }
  }

  if (isPercentUnit(unit)) {
    return { valueText: formatFixed(value, 1, lang), unitKind: 'percent' }
  }

  if (indicator_code === 'NY.GDP.MKTP.CD') {
    return {
      valueText: formatWorldValue(value, unit, indicator_code, lang),
      unitKind: 'none',
    }
  }

  if (
    indicator_code === 'NY.GDP.PCAP.CD' ||
    (u.includes('current us$') && abs < 1e6)
  ) {
    return { valueText: formatInt(value, lang), unitKind: 'usd' }
  }

  if (u.includes('current us$')) {
    return { valueText: formatInt(value, lang), unitKind: 'usd' }
  }

  if (indicator_code === 'SP.POP.TOTL') {
    return {
      valueText: formatWorldValue(value, unit, indicator_code, lang),
      unitKind: 'none',
    }
  }

  if (u.includes('per 1,000')) {
    return { valueText: formatFixed(value, 1, lang), unitKind: 'per_1000' }
  }

  if (u.includes('per 100,000')) {
    return {
      valueText: formatFixed(value, value >= 100 ? 0 : 1, lang),
      unitKind: 'per_100k',
    }
  }

  if (u.includes('per 100 people')) {
    return { valueText: formatFixed(value, 1, lang), unitKind: 'per_100' }
  }

  if (u.includes('births per woman') || u.includes('per woman')) {
    return { valueText: formatFixed(value, 2, lang), unitKind: 'per_woman' }
  }

  if (abs < 1 && abs > 0 && !isPercentUnit(unit)) {
    return { valueText: formatFixed(value, 2, lang), unitKind: 'none' }
  }

  if (u.includes('metric tons')) {
    return {
      valueText: formatWorldValue(value, unit, indicator_code, lang),
      unitKind: 'none',
    }
  }

  if (u.includes('kg of oil')) {
    return {
      valueText: formatWorldValue(value, unit, indicator_code, lang),
      unitKind: 'none',
    }
  }

  if (u.includes('years') && !u.includes('%')) {
    return { valueText: formatFixed(value, 1, lang), unitKind: 'years' }
  }

  if (abs >= 1e9) {
    const x = abs / 1e9
    const n = x >= 100 ? formatFixed(x, 0, lang) : formatFixed(x, 1, lang)
    return {
      valueText: lang === 'de' ? `${sign}${n} Mrd.` : `${sign}${n} bn`,
      unitKind: 'none',
    }
  }
  if (abs >= 1e6) {
    const x = abs / 1e6
    const n = x >= 100 ? formatFixed(x, 0, lang) : formatFixed(x, 1, lang)
    return {
      valueText: lang === 'de' ? `${sign}${n} Mio.` : `${sign}${n} m`,
      unitKind: 'none',
    }
  }
  if (abs >= 1e3) {
    return { valueText: formatInt(value, lang), unitKind: 'none' }
  }

  return {
    valueText: formatFixed(
      value,
      abs > 0 && abs < 20 && !Number.isInteger(value) ? 2 : 1,
      lang,
    ),
    unitKind: 'none',
  }
}
