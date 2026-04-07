import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataCard, EmptyState, useTheme } from '../../design-system'
import type { Lang } from '../../design-system/ThemeContext'
import { fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import { IndicatorSelector } from './IndicatorSelector'
import { worldIndicatorLowerIsBetter } from './worldIndicatorDirection'
import { iso3ToFlagIso2 } from './worldIso3ToIso2'
import {
  countryPercentileFromMapRows,
  fetchWorldMapRows,
} from './worldMapData'
import { worldIndicatorShortLabel } from './worldIndicatorShortNames'
import type {
  WorldCategoryApi,
  WorldCountryDetail,
  WorldGeoJson,
  WorldMapRow,
} from './worldTypes'
import {
  formatWorldIndicatorValue,
  formatWorldValue,
} from './worldValueFormat'

const KEY_FACT_CODES = [
  'NY.GDP.PCAP.CD',
  'SP.POP.TOTL',
  'SP.DYN.LE00.IN',
  'EN.ATM.CO2E.PC',
  'SL.UEM.TOTL.ZS',
] as const

const KEY_FACT_FALLBACK_6 = [
  'SE.ADT.LITR.ZS',
  'SH.XPD.CHEX.GD.ZS',
  'NY.GDP.MKTP.CD',
] as const

const RADAR_CODES = [
  'NY.GDP.PCAP.CD',
  'SP.DYN.LE00.IN',
  'EN.ATM.CO2E.PC',
  'SL.UEM.TOTL.ZS',
  'SH.XPD.CHEX.GD.ZS',
  'SE.ADT.LITR.ZS',
  'SP.POP.TOTL',
  'NY.GDP.MKTP.KD.ZG',
] as const

const YEAR_MIN = 2000
const YEAR_MAX = 2024

type SortKey = 'category' | 'indicator' | 'value' | 'year' | 'unit'

type FlatIndRow = {
  categoryId: string
  categoryLabel: string
  indicator_code: string
  name: string
  value: number | null
  year: number | null
  unit: string | null
}

type CountryAnalysisProps = {
  narrow: boolean
  geojson: WorldGeoJson | null
  countryCode: string | null
  onCountryCode: (iso3: string | null) => void
  onBack: () => void
  indicatorCode: string
  setIndicatorCode: (code: string) => void
  year: number
  categories: WorldCategoryApi[] | null
  categoryId: string
  setCategoryId: (id: string) => void
  statsYears: { min: number; max: number } | null
}

function metaForIndicator(
  categories: WorldCategoryApi[] | null,
  code: string,
  lang: Lang,
): { categoryId: string; unit: string | null; categoryLabel: string } {
  if (!categories) {
    return { categoryId: 'other', unit: null, categoryLabel: '—' }
  }
  for (const cat of categories) {
    const hit = cat.indicators.find((i) => i.code === code)
    if (hit) {
      return {
        categoryId: cat.id,
        unit: hit.unit,
        categoryLabel: lang === 'de' ? cat.label_de : cat.label_en,
      }
    }
  }
  return { categoryId: 'other', unit: null, categoryLabel: '—' }
}

function latestPair(
  values: Array<{ year: number; value: number | null }>,
): { year: number; value: number; prevYear: number | null; prev: number | null } | null {
  const sorted = [...values].filter((x) => x.value != null).sort((a, b) => b.year - a.year)
  if (!sorted.length) return null
  const cur = sorted[0]!
  const prev = sorted[1] ?? null
  return {
    year: cur.year,
    value: cur.value as number,
    prevYear: prev?.year ?? null,
    prev: prev ? (prev.value as number) : null,
  }
}

function trendArrow(prev: number | null, cur: number, lowerIsBetter: boolean): 'up' | 'down' | 'flat' {
  if (prev == null) return 'flat'
  const d = cur - prev
  if (Math.abs(d) < 1e-9) return 'flat'
  const improved = lowerIsBetter ? d < 0 : d > 0
  const worse = lowerIsBetter ? d > 0 : d < 0
  if (improved) return 'up'
  if (worse) return 'down'
  return 'flat'
}

function selectCss(c: {
  cardBg: string
  border: string
  text: string
}): CSSProperties {
  return {
    minHeight: 44,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    background: c.cardBg,
    color: c.text,
    fontFamily: fonts.body,
    fontSize: '0.9rem',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  }
}

export function CountryAnalysis({
  narrow,
  geojson,
  countryCode,
  onCountryCode,
  onBack,
  indicatorCode,
  setIndicatorCode,
  year,
  categories,
  categoryId,
  setCategoryId,
  statsYears,
}: CountryAnalysisProps) {
  const { c, t, lang } = useTheme()
  const L = lang as Lang

  const countryEp = countryCode
    ? `/api/world/country/${encodeURIComponent(countryCode)}`
    : ''
  const { data: detail, loading, error } = useApi<WorldCountryDetail>(countryEp)

  const tsEp =
    countryCode && indicatorCode
      ? `/api/world/timeseries?country=${encodeURIComponent(countryCode)}&indicator=${encodeURIComponent(indicatorCode)}`
      : ''
  const { data: series } = useApi<Array<{ year: number; value: number | null }>>(tsEp)

  const { unit: tsUnit, categoryId: tsCat } = metaForIndicator(
    categories,
    indicatorCode,
    L,
  )

  const chartData = useMemo(() => {
    if (!series?.length) return []
    return series
      .filter((r) => r.year >= YEAR_MIN && r.year <= YEAR_MAX)
      .map((r) => ({ year: r.year, v: r.value }))
  }, [series])

  const indicatorLabel = worldIndicatorShortLabel(indicatorCode, L)

  const countryOptions = useMemo(() => {
    if (!geojson?.features.length) return []
    return [...geojson.features]
      .map((f) => ({
        iso3: f.properties.iso3.toUpperCase(),
        name: f.properties.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, L === 'de' ? 'de' : 'en'))
  }, [geojson, L])

  const detailByCode = useMemo(() => {
    const m = new Map<string, WorldCountryDetail['indicators'][0]>()
    if (!detail) return m
    for (const x of detail.indicators) m.set(x.indicator_code, x)
    return m
  }, [detail])

  const sixthCode = useMemo(() => {
    for (const code of KEY_FACT_FALLBACK_6) {
      const row = detailByCode.get(code)
      if (row && latestPair(row.values)) return code
    }
    return null
  }, [detailByCode])

  const keyFactCodesResolved = useMemo(() => {
    const base: string[] = [...KEY_FACT_CODES]
    if (sixthCode) base.push(sixthCode)
    return base
  }, [sixthCode])

  const keyFactCards = useMemo(() => {
    return keyFactCodesResolved.map((code) => {
      const row = detailByCode.get(code)
      const pair = row ? latestPair(row.values) : null
      const meta = metaForIndicator(categories, code, L)
      const low = worldIndicatorLowerIsBetter(code)
      const tr =
        pair && pair.prev != null
          ? trendArrow(pair.prev, pair.value, low)
          : ('flat' as const)
      const fmt = (v: number) =>
        formatWorldValue(v, meta.unit, code, L)
      return {
        code,
        label: worldIndicatorShortLabel(code, L),
        display: pair ? fmt(pair.value) : '—',
        year: pair?.year ?? null,
        trend: tr,
        hasData: Boolean(pair),
      }
    })
  }, [keyFactCodesResolved, detailByCode, categories, L])

  const flatTableRows = useMemo((): FlatIndRow[] => {
    if (!detail) return []
    const out: FlatIndRow[] = []
    for (const ind of detail.indicators) {
      const pair = latestPair(ind.values)
      const meta = metaForIndicator(categories, ind.indicator_code, L)
      out.push({
        categoryId: ind.category ?? meta.categoryId,
        categoryLabel: meta.categoryLabel,
        indicator_code: ind.indicator_code,
        name: ind.name,
        value: pair?.value ?? null,
        year: pair?.year ?? null,
        unit: meta.unit,
      })
    }
    return out
  }, [detail, categories, L])

  const [sortKey, setSortKey] = useState<SortKey>('category')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = useCallback((k: SortKey) => {
    setSortKey((prev) => {
      if (prev === k) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return k
    })
  }, [])

  const sortedRows = useMemo(() => {
    const rows = [...flatTableRows]
    const dir = sortDir === 'asc' ? 1 : -1
    const cmpStr = (a: string, b: string) => a.localeCompare(b, L === 'de' ? 'de' : 'en') * dir
    const cmpNum = (a: number | null, b: number | null) => {
      const av = a ?? -Infinity
      const bv = b ?? -Infinity
      return av === bv ? 0 : av < bv ? -1 * dir : 1 * dir
    }
    rows.sort((a, b) => {
      switch (sortKey) {
        case 'category':
          return cmpStr(a.categoryLabel, b.categoryLabel) || cmpStr(a.name, b.name)
        case 'indicator':
          return cmpStr(a.name, b.name)
        case 'value':
          return cmpNum(a.value, b.value) || cmpStr(a.name, b.name)
        case 'year':
          return cmpNum(a.year, b.year) || cmpStr(a.name, b.name)
        case 'unit':
          return cmpStr(a.unit ?? '', b.unit ?? '') || cmpStr(a.name, b.name)
        default:
          return 0
      }
    })
    return rows
  }, [flatTableRows, sortKey, sortDir, L])

  const groupedSorted = useMemo(() => {
    const m = new Map<string, FlatIndRow[]>()
    for (const r of sortedRows) {
      const k = r.categoryLabel
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], L === 'de' ? 'de' : 'en'))
  }, [sortedRows, L])

  const [radarRows, setRadarRows] = useState<
    { code: string; p: number | null }[] | null
  >(null)
  const [radarLoading, setRadarLoading] = useState(false)

  useEffect(() => {
    if (!countryCode || !detail) {
      setRadarRows(null)
      return
    }
    let cancelled = false
    setRadarLoading(true)
    const run = async () => {
      try {
        const iso = countryCode.trim().toUpperCase()
        const yMin = statsYears?.min ?? YEAR_MIN
        const attempts: number[] = []
        for (let s = 0; s < 6; s++) {
          const yy = year - s
          if (yy >= yMin) attempts.push(yy)
        }
        let maps: WorldMapRow[][] | null = null
        for (const tryY of attempts) {
          const rows = await Promise.all(
            RADAR_CODES.map((code) => fetchWorldMapRows(code, tryY)),
          )
          const nonEmpty = rows.filter((r) => r.length > 0).length
          if (nonEmpty >= 4) {
            maps = rows
            break
          }
        }
        if (!maps || cancelled) {
          if (!cancelled) setRadarRows(RADAR_CODES.map((code) => ({ code, p: null })))
          return
        }
        const next = RADAR_CODES.map((code, i) => {
          const lower = worldIndicatorLowerIsBetter(code)
          const p = countryPercentileFromMapRows(iso, maps![i]!, lower)
          return { code, p }
        })
        if (!cancelled) setRadarRows(next)
      } catch {
        if (!cancelled) setRadarRows(RADAR_CODES.map((code) => ({ code, p: null })))
      } finally {
        if (!cancelled) setRadarLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [countryCode, detail, year, statsYears?.min])

  const radarChartData = useMemo(() => {
    if (!radarRows) return []
    return radarRows
      .filter((r) => r.p != null)
      .map((r) => ({
        subject: worldIndicatorShortLabel(r.code, L),
        p: Math.round((r.p as number) * 10) / 10,
        full: r.p as number,
      }))
  }, [radarRows, L])

  const flagIso2 = countryCode
    ? iso3ToFlagIso2(countryCode, geojson)
    : null
  const flagUrl = flagIso2
    ? `https://flagcdn.com/w40/${flagIso2}.png`
    : null

  const exportCsv = useCallback(() => {
    if (!detail) return
    const lines: string[] = []
    const sep = ';'
    lines.push(
      ['category', 'indicator_code', 'name', 'value', 'year', 'unit'].join(sep),
    )
    for (const r of flatTableRows) {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
      lines.push(
        [
          esc(r.categoryLabel),
          r.indicator_code,
          esc(r.name),
          r.value == null ? '' : String(r.value),
          r.year == null ? '' : String(r.year),
          esc(r.unit ?? ''),
        ].join(sep),
      )
    }
    const slug = (detail.country_name || detail.country_code).replace(/[^\w\-]+/g, '_')
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${slug}_indicators.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [detail, flatTableRows])

  const labelSpan = (text: string) => (
    <span
      style={{
        display: 'block',
        fontFamily: fonts.body,
        fontSize: '0.8rem',
        color: c.muted,
        marginBottom: 6,
      }}
    >
      {text}
    </span>
  )

  const trendSymbol = (tr: 'up' | 'down' | 'flat') =>
    tr === 'up' ? '↑' : tr === 'down' ? '↓' : '→'

  const th = (k: SortKey, label: string): ReactNode => (
    <th
      style={{
        textAlign: 'left',
        padding: `${spacing.sm} ${spacing.md}`,
        borderBottom: `1px solid ${c.border}`,
        fontFamily: fonts.mono,
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: c.muted,
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
      onClick={() => toggleSort(k)}
      title={t('worldTableSort')}
    >
      {label}
      {sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  )

  return (
    <div style={{ marginTop: spacing.lg }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
          alignItems: 'flex-end',
          marginBottom: spacing.lg,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: fonts.mono,
            fontSize: '0.8rem',
            border: `1px solid ${c.border}`,
            background: c.cardBg,
            color: c.text,
            padding: `${spacing.sm} ${spacing.md}`,
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {t('backToMap')}
        </button>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          {labelSpan(t('worldPickCountry'))}
          <select
            style={{
              ...selectCss(c),
              fontFamily: fonts.mono,
              fontSize: '0.85rem',
            }}
            value={countryCode ?? ''}
            onChange={(e) =>
              onCountryCode(e.target.value ? e.target.value : null)
            }
          >
            <option value="">{t('worldSearchCountry')}</option>
            {countryOptions.map((o) => (
              <option key={o.iso3} value={o.iso3}>
                {o.name} ({o.iso3})
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '2 1 360px', minWidth: 0 }}>
          <IndicatorSelector
            categories={categories}
            categoryId={categoryId}
            indicatorCode={indicatorCode}
            onCategoryId={setCategoryId}
            onIndicatorCode={setIndicatorCode}
            lang={L}
            disabled={!categories?.length}
            narrow={narrow}
            selectCss={() => selectCss(c)}
            labelSpan={labelSpan}
            compact
          />
        </div>
      </div>

      {!countryCode && <EmptyState text={t('worldAnalysisPlaceholder')} />}

      {countryCode && error && (
        <p style={{ color: '#b00020', fontFamily: fonts.body }}>
          {t('dataLoadError')}
        </p>
      )}

      {countryCode && loading && !detail && (
        <p style={{ color: c.muted, fontFamily: fonts.body }}>{t('loading')}</p>
      )}

      {detail && (
        <>
          <header
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing.lg,
              alignItems: 'center',
              marginBottom: spacing.xl,
            }}
          >
            {flagUrl && (
              <img
                src={flagUrl}
                width={40}
                height={27}
                alt=""
                style={{
                  borderRadius: 4,
                  border: `1px solid ${c.border}`,
                  objectFit: 'cover',
                }}
              />
            )}
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <h2
                style={{
                  fontFamily: fonts.body,
                  fontSize: 'clamp(1.2rem, 4vw, 1.65rem)',
                  fontWeight: 700,
                  color: c.text,
                  margin: 0,
                }}
              >
                {detail.country_name}
              </h2>
              <p
                style={{
                  fontFamily: fonts.mono,
                  fontSize: '0.8rem',
                  color: c.muted,
                  margin: `${spacing.xs} 0 0`,
                  lineHeight: 1.5,
                }}
              >
                {t('worldIsoLabel')}: {detail.country_code}
                {detail.region ? ` · ${detail.region}` : ''}
                {detail.income_level ? ` · ${detail.income_level}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                border: `1px solid ${c.border}`,
                background: c.cardBg,
                color: c.text,
                padding: `${spacing.sm} ${spacing.md}`,
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {t('exportCsv')}
            </button>
          </header>

          <section style={{ marginBottom: spacing.xl }}>
            <h3
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: c.muted,
                marginBottom: spacing.md,
              }}
            >
              {t('worldKeyFactsTitle')}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: narrow
                  ? 'repeat(2, minmax(0, 1fr))'
                  : 'repeat(3, minmax(0, 1fr))',
                gap: spacing.md,
              }}
            >
              {keyFactCards.map((card) => (
                <DataCard
                  key={card.code}
                  header={
                    <span
                      style={{
                        fontFamily: fonts.body,
                        fontSize: '0.78rem',
                        color: c.muted,
                      }}
                    >
                      {card.label}
                    </span>
                  }
                >
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: narrow ? '0.88rem' : '1rem',
                      color: c.text,
                      lineHeight: 1.45,
                    }}
                  >
                    {card.display}
                    {card.year != null && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: c.muted,
                          marginLeft: 6,
                        }}
                      >
                        ({card.year}{' '}
                        {card.trend === 'up'
                          ? trendSymbol('up')
                          : card.trend === 'down'
                            ? trendSymbol('down')
                            : trendSymbol('flat')}
                        )
                      </span>
                    )}
                  </div>
                </DataCard>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: spacing.xl }}>
            <h3
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: c.muted,
                marginBottom: spacing.md,
              }}
            >
              {t('worldTimeSeriesTitle')} · {indicatorLabel}
            </h3>
            {chartData.length > 0 ? (
              <div style={{ width: '100%', minHeight: 280 }}>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid stroke={c.border} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="year"
                      domain={[YEAR_MIN, YEAR_MAX]}
                      tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                    />
                    <YAxis
                      tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                      width={56}
                    />
                    <Tooltip
                      contentStyle={{
                        background: c.cardBg,
                        border: `1px solid ${c.border}`,
                        borderRadius: 8,
                        fontFamily: fonts.mono,
                        fontSize: 12,
                        color: c.text,
                      }}
                      formatter={(v) => {
                        const n = typeof v === 'number' ? v : undefined
                        return [
                          n != null
                            ? formatWorldIndicatorValue(n, {
                                indicatorCode,
                                category: tsCat,
                                unit: tsUnit,
                                lang: L,
                              })
                            : '—',
                          '',
                        ]
                      }}
                      labelFormatter={(y) => String(y)}
                    />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke="#C8102E"
                      strokeWidth={2}
                      dot={false}
                      name={indicatorLabel}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState text={t('worldNoValue')} />
            )}
          </section>

          <section style={{ marginBottom: spacing.xl }}>
            <h3
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: c.muted,
                marginBottom: spacing.md,
              }}
            >
              {t('worldAllIndicatorsTitle')}
            </h3>
            <div
              style={{
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                background: c.cardBg,
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: fonts.body,
                  fontSize: '0.88rem',
                  minWidth: 520,
                }}
              >
                <thead>
                  <tr style={{ background: c.bg }}>
                    {th('category', t('worldTableCategory'))}
                    {th('indicator', t('worldTableIndicator'))}
                    {th('value', t('worldTableValue'))}
                    {th('year', t('worldTableYear'))}
                    {th('unit', t('worldTableUnit'))}
                  </tr>
                </thead>
                <tbody>
                  {groupedSorted.map(([catLabel, rows]) => (
                    <Fragment key={catLabel}>
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            padding: `${spacing.sm} ${spacing.md}`,
                            fontFamily: fonts.mono,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: c.text,
                            background: c.bgAlt,
                            borderTop: `1px solid ${c.border}`,
                          }}
                        >
                          {catLabel}
                        </td>
                      </tr>
                      {rows.map((r) => (
                        <tr
                          key={r.indicator_code}
                          style={{ borderTop: `1px solid ${c.border}` }}
                        >
                          <td style={{ padding: `${spacing.sm} ${spacing.md}` }}>
                            {r.categoryLabel}
                          </td>
                          <td style={{ padding: `${spacing.sm} ${spacing.md}` }}>
                            {r.name}
                          </td>
                          <td
                            style={{
                              padding: `${spacing.sm} ${spacing.md}`,
                              fontFamily: fonts.mono,
                            }}
                          >
                            {r.value != null
                              ? formatWorldValue(
                                  r.value,
                                  r.unit,
                                  r.indicator_code,
                                  L,
                                )
                              : '—'}
                          </td>
                          <td
                            style={{
                              padding: `${spacing.sm} ${spacing.md}`,
                              fontFamily: fonts.mono,
                            }}
                          >
                            {r.year ?? '—'}
                          </td>
                          <td style={{ padding: `${spacing.sm} ${spacing.md}` }}>
                            {r.unit ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ marginBottom: spacing.xl }}>
            <h3
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: c.muted,
                marginBottom: spacing.xs,
              }}
            >
              {t('worldRadarTitle')}
            </h3>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: '0.82rem',
                color: c.muted,
                marginBottom: spacing.md,
                lineHeight: 1.45,
              }}
            >
              {t('worldRadarSubtitle')}
            </p>
            {radarLoading && (
              <p style={{ color: c.muted, fontFamily: fonts.body }}>
                {t('loading')}
              </p>
            )}
            {!radarLoading &&
              radarChartData.some((x) => x.full != null) && (
                <div style={{ width: '100%', height: narrow ? 320 : 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={radarChartData}
                      margin={{ top: 16, right: 24, bottom: 16, left: 24 }}
                    >
                      <PolarGrid stroke={c.border} />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: c.muted, fontSize: 10, fontFamily: fonts.mono }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: c.muted, fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: c.cardBg,
                          border: `1px solid ${c.border}`,
                          borderRadius: 8,
                          color: c.text,
                          fontFamily: fonts.mono,
                          fontSize: 12,
                        }}
                        formatter={(_val, _n, item) => {
                          const full = (item?.payload as { full: number | null })
                            ?.full
                          return [
                            full != null ? `${full.toFixed(1)}%` : '—',
                            t('worldRadarTitle'),
                          ]
                        }}
                      />
                      <Radar
                        name={detail.country_name}
                        dataKey="p"
                        stroke="#C8102E"
                        fill="#C8102E"
                        fillOpacity={0.35}
                        isAnimationActive={false}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            {!radarLoading &&
              !radarChartData.some((x) => x.full != null) && (
                <EmptyState text={t('worldNoValue')} />
              )}
          </section>
        </>
      )}
    </div>
  )
}
