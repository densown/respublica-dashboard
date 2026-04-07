import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { EmptyState, useTheme } from '../../design-system'
import type { Lang } from '../../design-system/ThemeContext'
import { fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import { IndicatorSelector } from './IndicatorSelector'
import { worldIndicatorLowerIsBetter } from './worldIndicatorDirection'
import {
  countryPercentileFromMapRows,
  fetchWorldMapRows,
  worldApiUrl,
} from './worldMapData'
import { worldIndicatorShortLabel } from './worldIndicatorShortNames'
import type {
  WorldCategoryApi,
  WorldCompareResponse,
  WorldCountryDetail,
  WorldGeoJson,
  WorldMapRow,
} from './worldTypes'
import { formatWorldValue } from './worldValueFormat'

const COLORS = ['#C8102E', '#08519c', '#016c59', '#7f2704']

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

type CountryCompareProps = {
  narrow: boolean
  geojson: WorldGeoJson | null
  categoryId: string
  setCategoryId: (id: string) => void
  indicatorCode: string
  setIndicatorCode: (code: string) => void
  statsYears: { min: number; max: number } | null
  categories: WorldCategoryApi[] | null
  year: number
}

function mergeSeries(data: WorldCompareResponse | null) {
  if (!data?.countries?.length) return []
  const yearSet = new Set<number>()
  for (const c of data.countries) {
    for (const p of c.data) {
      if (p.value != null) yearSet.add(p.year)
    }
  }
  const years = [...yearSet].sort((a, b) => a - b)
  return years.map((year) => {
    const row: Record<string, number | null | undefined> & { year: number } = {
      year,
    }
    for (const c of data.countries) {
      const hit = c.data.find((d) => d.year === year)
      row[c.code] = hit?.value ?? null
    }
    return row
  })
}

function latestFromSeries(data: Array<{ year: number; value: number | null }>): {
  year: number
  value: number
} | null {
  const sorted = [...data]
    .filter((x) => x.value != null)
    .sort((a, b) => b.year - a.year)
  const h = sorted[0]
  if (!h) return null
  return { year: h.year, value: h.value as number }
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

export function CountryCompare({
  narrow,
  geojson,
  categoryId,
  setCategoryId,
  indicatorCode,
  setIndicatorCode,
  statsYears,
  categories,
  year,
}: CountryCompareProps) {
  const { c, t, lang } = useTheme()
  const L = lang as Lang
  const [slots, setSlots] = useState<(string | '')[]>(['DEU', 'FRA', '', ''])

  const codes = useMemo(
    () =>
      [...new Set(slots.filter((s): s is string => Boolean(s && s.length === 3)))],
    [slots],
  )

  const compareEp =
    codes.length >= 2
      ? `/api/world/compare?countries=${encodeURIComponent(codes.join(','))}&indicator=${encodeURIComponent(indicatorCode)}`
      : ''
  const { data: compareData, loading, error } = useApi<WorldCompareResponse>(compareEp)

  const chartRows = useMemo(() => mergeSeries(compareData), [compareData])

  const barData = useMemo(() => {
    if (!compareData?.countries?.length) return []
    return codes.map((code, i) => {
      const c0 = compareData.countries.find((x) => x.code === code)
      const lv = c0 ? latestFromSeries(c0.data) : null
      return {
        code,
        name: c0?.name ?? code,
        fill: COLORS[i % COLORS.length],
        value: lv?.value ?? null,
        year: lv?.year ?? null,
      }
    })
  }, [compareData, codes])

  const barChartRows = useMemo(
    () => barData.filter((b): b is typeof b & { value: number } => b.value != null),
    [barData],
  )

  const [countryDetails, setCountryDetails] = useState<
    Record<string, WorldCountryDetail | undefined>
  >({})
  const [detailsLoading, setDetailsLoading] = useState(false)

  useEffect(() => {
    if (codes.length < 2) {
      setCountryDetails({})
      return
    }
    let cancelled = false
    setDetailsLoading(true)
    void (async () => {
      try {
        const next: Record<string, WorldCountryDetail | undefined> = {}
        await Promise.all(
          codes.map(async (iso) => {
            const url = worldApiUrl(`/api/world/country/${encodeURIComponent(iso)}`)
            const res = await fetch(url)
            if (!res.ok) return
            const j = (await res.json()) as WorldCountryDetail
            next[iso] = j
          }),
        )
        if (!cancelled) setCountryDetails(next)
      } finally {
        if (!cancelled) setDetailsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [codes.join(',')])

  const compareTableRows = useMemo(() => {
    if (codes.length < 2) return []
    const indSet = new Set<string>()
    for (const iso of codes) {
      const d = countryDetails[iso]
      if (!d) continue
      for (const x of d.indicators) indSet.add(x.indicator_code)
    }
    const indList = [...indSet].sort()

    const metaUnit = (code: string) => {
      if (!categories) return null
      for (const cat of categories) {
        const hit = cat.indicators.find((i) => i.code === code)
        if (hit) return hit.unit
      }
      return null
    }

    const nameFor = (code: string) => {
      for (const iso of codes) {
        const d = countryDetails[iso]
        const hit = d?.indicators.find((i) => i.indicator_code === code)
        if (hit) return hit.name
      }
      return code
    }

    return indList.map((indCode) => {
      const vals: Record<string, number | null> = {}
      for (const iso of codes) {
        const d = countryDetails[iso]
        const row = d?.indicators.find((i) => i.indicator_code === indCode)
        const lv = row ? latestFromSeries(row.values) : null
        vals[iso] = lv?.value ?? null
      }
      const nums = codes
        .map((iso) => vals[iso])
        .filter((v): v is number => v != null && !Number.isNaN(v))
      const spread =
        nums.length >= 2 ? Math.max(...nums) - Math.min(...nums) : null
      return {
        code: indCode,
        name: nameFor(indCode),
        unit: metaUnit(indCode),
        byIso: vals,
        spread,
        lowerIsBetter: worldIndicatorLowerIsBetter(indCode),
      }
    })
  }, [codes, countryDetails, categories])

  const [radarMatrix, setRadarMatrix] = useState<
    Record<string, Record<string, number | null>> | null
  >(null)
  const [radarLoading, setRadarLoading] = useState(false)

  useEffect(() => {
    if (codes.length < 2) {
      setRadarMatrix(null)
      return
    }
    let cancelled = false
    setRadarLoading(true)
    void (async () => {
      try {
        const yMin = statsYears?.min ?? 2000
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
          if (rows.filter((r) => r.length > 0).length >= 4) {
            maps = rows
            break
          }
        }
        if (!maps || cancelled) {
          if (!cancelled) setRadarMatrix({})
          return
        }
        const mat: Record<string, Record<string, number | null>> = {}
        for (const iso of codes) {
          mat[iso] = {}
          RADAR_CODES.forEach((code, i) => {
            const lower = worldIndicatorLowerIsBetter(code)
            mat[iso][code] = countryPercentileFromMapRows(iso, maps[i]!, lower)
          })
        }
        if (!cancelled) setRadarMatrix(mat)
      } catch {
        if (!cancelled) setRadarMatrix({})
      } finally {
        if (!cancelled) setRadarLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [codes.join(','), year, statsYears?.min])

  const radarChartData = useMemo(() => {
    if (!radarMatrix) return []
    return RADAR_CODES.map((code) => {
      const row: Record<string, string | number> = {
        subject: worldIndicatorShortLabel(code, L),
      }
      let any = false
      for (const iso of codes) {
        const p = radarMatrix[iso]?.[code]
        if (p != null) any = true
        row[iso] = p != null ? Math.round(p * 10) / 10 : 0
      }
      return any ? row : null
    }).filter((x): x is Record<string, string | number> => x != null)
  }, [radarMatrix, codes, L])

  const countryOptions = useMemo(() => {
    if (!geojson?.features.length) return []
    return [...geojson.features]
      .map((f) => ({
        iso3: f.properties.iso3.toUpperCase(),
        name: f.properties.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, L === 'de' ? 'de' : 'en'))
  }, [geojson, L])

  const indicatorLabel = worldIndicatorShortLabel(indicatorCode, L)

  const labelSpan = (text: string): ReactNode => (
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

  const selectStyle: React.CSSProperties = {
    fontFamily: fonts.mono,
    fontSize: '0.82rem',
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: 6,
    border: `1px solid ${c.border}`,
    background: c.cardBg,
    color: c.text,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  }

  const labelA = t('worldCompareCountryA')
  const labelB = t('worldCompareCountryB')

  const cellBg = (
    val: number | null,
    allVals: (number | null)[],
    lowerIsBetter: boolean,
  ) => {
    const nums = allVals.filter((v): v is number => v != null && !Number.isNaN(v))
    if (nums.length < 2 || val == null) return undefined
    const best = lowerIsBetter ? Math.min(...nums) : Math.max(...nums)
    const worst = lowerIsBetter ? Math.max(...nums) : Math.min(...nums)
    if (val === best) return `${c.yes}22`
    if (val === worst) return `${c.no}22`
    return undefined
  }

  const exportCompareCsv = useCallback(() => {
    if (!compareTableRows.length) return
    const sep = ';'
    const header = ['indicator', ...codes, 'spread'].join(sep)
    const lines = [header]
    for (const r of compareTableRows) {
      lines.push(
        [
          `"${r.name.replace(/"/g, '""')}"`,
          ...codes.map((iso) => {
            const v = r.byIso[iso]
            return v == null ? '' : String(v)
          }),
          r.spread == null ? '' : String(r.spread),
        ].join(sep),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `world_compare_${codes.join('_')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [compareTableRows, codes])

  return (
    <div style={{ marginTop: spacing.lg }}>
      <h2
        style={{
          fontFamily: fonts.body,
          fontSize: 'clamp(1.1rem, 3.5vw, 1.4rem)',
          fontWeight: 700,
          color: c.text,
          margin: `0 0 ${spacing.lg}`,
        }}
      >
        {t('worldCompareTitle')}
      </h2>

      <div
        style={{
          marginBottom: spacing.lg,
          maxWidth: '100%',
        }}
      >
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
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow ? '1fr' : 'repeat(4, minmax(0, 1fr))',
          gap: spacing.md,
          marginTop: spacing.lg,
        }}
      >
        {slots.map((val, idx) => (
          <div key={idx}>
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: c.muted,
                marginBottom: 4,
              }}
            >
              {idx === 0
                ? labelA
                : idx === 1
                  ? labelB
                  : `${t('worldAddCountry')} ${idx + 1}`}
            </div>
            <select
              style={selectStyle}
              value={val}
              onChange={(e) => {
                const next = [...slots]
                next[idx] = e.target.value as string | ''
                setSlots(next)
              }}
            >
              <option value="">{t('filterAll')}</option>
              {countryOptions.map((o) => (
                <option key={`${idx}-${o.iso3}`} value={o.iso3}>
                  {o.name} ({o.iso3})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <p
        style={{
          marginTop: spacing.sm,
          fontFamily: fonts.mono,
          fontSize: '0.72rem',
          color: c.muted,
        }}
      >
        {t('worldMaxCountries')}
      </p>

      {codes.length < 2 && (
        <div style={{ marginTop: spacing.xl }}>
          <EmptyState text={t('worldComparePlaceholder')} />
        </div>
      )}

      {codes.length >= 2 && error && (
        <p style={{ marginTop: spacing.md, color: '#b00020' }}>
          {t('dataLoadError')}
        </p>
      )}

      {codes.length >= 2 && loading && !compareData && (
        <p style={{ marginTop: spacing.md, color: c.muted }}>{t('loading')}</p>
      )}

      {codes.length >= 2 && chartRows.length > 0 && (
        <div style={{ marginTop: spacing.xl, width: '100%', minHeight: 300 }}>
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
            {t('compareSectionTimeSeries')}
          </h3>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart
              data={chartRows}
              margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
            >
              <CartesianGrid stroke={c.border} strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
              />
              <YAxis
                tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                width={48}
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
              />
              <Legend />
              {codes.map((code, i) => (
                <Line
                  key={code}
                  type="monotone"
                  dataKey={code}
                  name={
                    compareData?.countries.find((x) => x.code === code)?.name ??
                    code
                  }
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p
            style={{
              marginTop: spacing.md,
              fontFamily: fonts.mono,
              fontSize: '0.75rem',
              color: c.muted,
            }}
          >
            {indicatorLabel}
            {statsYears ? ` · ${statsYears.min}–${statsYears.max}` : ''}
          </p>
        </div>
      )}

      {codes.length >= 2 && barChartRows.length > 0 && (
        <div style={{ marginTop: spacing.xl, width: '100%' }}>
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
            {t('worldCompareBarsTitle')}
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={barChartRows}
              margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
            >
              <CartesianGrid stroke={c.border} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
              />
              <YAxis
                tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                width={48}
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
                  const n = typeof v === 'number' ? v : Number(v)
                  if (!Number.isFinite(n))
                    return ['—', indicatorLabel] as [string, string]
                  return [
                    formatWorldValue(
                      n,
                      categories ? unitFor(indicatorCode, categories) : null,
                      indicatorCode,
                      L,
                    ),
                    indicatorLabel,
                  ] as [string, string]
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barChartRows.map((e) => (
                  <Cell key={e.code} fill={e.fill ?? COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {codes.length >= 2 && radarLoading && (
        <p style={{ marginTop: spacing.md, color: c.muted }}>{t('loading')}</p>
      )}
      {codes.length >= 2 && !radarLoading && radarChartData.length > 0 && (
        <div style={{ marginTop: spacing.xl, width: '100%', height: narrow ? 340 : 420 }}>
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
            {t('worldCompareRadarTitle')}
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={radarChartData}
              margin={{ top: 16, right: 28, bottom: 16, left: 28 }}
            >
              <PolarGrid stroke={c.border} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: c.muted, fontSize: 9, fontFamily: fonts.mono }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: c.muted, fontSize: 10 }}
              />
              <Legend />
              {codes.map((iso, i) => (
                <Radar
                  key={iso}
                  name={
                    countryDetails[iso]?.country_name ??
                    compareData?.countries.find((x) => x.code === iso)?.name ??
                    iso
                  }
                  dataKey={iso}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.12}
                  isAnimationActive={false}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {codes.length >= 2 && compareTableRows.length > 0 && (
        <div style={{ marginTop: spacing.xl }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing.md,
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <h3
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: c.muted,
                margin: 0,
                flex: '1 1 auto',
              }}
            >
              {t('worldCompareTableTitle')}
            </h3>
            <button
              type="button"
              onClick={exportCompareCsv}
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
          </div>
          {detailsLoading && (
            <p style={{ color: c.muted, fontSize: '0.88rem' }}>{t('loading')}</p>
          )}
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
                fontSize: '0.82rem',
                minWidth: 480,
              }}
            >
              <thead>
                <tr style={{ background: c.bg }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: spacing.sm,
                      fontFamily: fonts.mono,
                      color: c.muted,
                    }}
                  >
                    {t('worldTableIndicator')}
                  </th>
                  {codes.map((iso) => (
                    <th
                      key={iso}
                      style={{
                        textAlign: 'right',
                        padding: spacing.sm,
                        fontFamily: fonts.mono,
                        color: c.muted,
                      }}
                    >
                      {iso}
                    </th>
                  ))}
                  <th
                    style={{
                      textAlign: 'right',
                      padding: spacing.sm,
                      fontFamily: fonts.mono,
                      color: c.muted,
                    }}
                  >
                    {t('worldCompareColDiff')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {compareTableRows.map((r) => (
                  <tr
                    key={r.code}
                    style={{ borderTop: `1px solid ${c.border}` }}
                  >
                    <td style={{ padding: spacing.sm }}>{r.name}</td>
                    {codes.map((iso) => {
                      const v = r.byIso[iso]
                      const bg = cellBg(
                        v,
                        codes.map((i) => r.byIso[i]),
                        r.lowerIsBetter,
                      )
                      return (
                        <td
                          key={iso}
                          style={{
                            padding: spacing.sm,
                            textAlign: 'right',
                            fontFamily: fonts.mono,
                            background: bg,
                          }}
                        >
                          {v == null
                            ? '—'
                            : formatWorldValue(v, r.unit, r.code, L)}
                        </td>
                      )
                    })}
                    <td
                      style={{
                        padding: spacing.sm,
                        textAlign: 'right',
                        fontFamily: fonts.mono,
                        color: c.muted,
                      }}
                    >
                      {r.spread == null
                        ? '—'
                        : formatWorldValue(
                            r.spread,
                            r.unit,
                            r.code,
                            L,
                          )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {codes.length >= 2 && compareData && chartRows.length === 0 && (
        <EmptyState text={t('worldNoValue')} />
      )}
    </div>
  )
}

function unitFor(code: string, categories: WorldCategoryApi[] | null) {
  if (!categories) return null
  for (const cat of categories) {
    const hit = cat.indicators.find((i) => i.code === code)
    if (hit) return hit.unit
  }
  return null
}
