import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState, useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import type { Lang } from '../../design-system/ThemeContext'
import type {
  WorldCategoryApi,
  WorldCompareResponse,
  WorldGeoJson,
} from './worldTypes'
import { IndicatorSelector } from './IndicatorSelector'
import { worldIndicatorShortLabel } from './worldIndicatorShortNames'

const COLORS = ['#C8102E', '#08519c', '#016c59', '#7f2704']

type CountryCompareProps = {
  narrow: boolean
  geojson: WorldGeoJson | null
  categoryId: string
  setCategoryId: (id: string) => void
  indicatorCode: string
  setIndicatorCode: (code: string) => void
  statsYears: { min: number; max: number } | null
  categories: WorldCategoryApi[] | null
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
}: CountryCompareProps) {
  const { c, t, lang } = useTheme()
  const [slots, setSlots] = useState<(string | '')[]>(['DEU', 'FRA', '', ''])

  const codes = useMemo(
    () => [...new Set(slots.filter((s): s is string => Boolean(s && s.length === 3)))],
    [slots],
  )

  const compareEp =
    codes.length >= 2
      ? `/api/world/compare?countries=${encodeURIComponent(codes.join(','))}&indicator=${encodeURIComponent(indicatorCode)}`
      : ''
  const { data: compareData, loading, error } =
    useApi<WorldCompareResponse>(compareEp)

  const chartRows = useMemo(() => mergeSeries(compareData), [compareData])

  const countryOptions = useMemo(() => {
    if (!geojson?.features.length) return []
    return [...geojson.features]
      .map((f) => ({
        iso3: f.properties.iso3.toUpperCase(),
        name: f.properties.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [geojson])

  const indicatorLabel = worldIndicatorShortLabel(indicatorCode, lang as Lang)

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
          display: 'flex',
          flexDirection: narrow ? 'column' : 'row',
          flexWrap: narrow ? 'nowrap' : 'wrap',
          gap: spacing.lg,
          marginBottom: spacing.lg,
          width: '100%',
        }}
      >
        <IndicatorSelector
          categories={categories}
          categoryId={categoryId}
          indicatorCode={indicatorCode}
          onCategoryId={setCategoryId}
          onIndicatorCode={setIndicatorCode}
          lang={lang as Lang}
          disabled={!categories?.length}
          narrow={narrow}
          selectCss={() => selectCss(c)}
          labelSpan={labelSpan}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              {idx === 0 ? labelA : idx === 1 ? labelB : `${t('worldAddCountry')} ${idx + 1}`}
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
        <p style={{ marginTop: spacing.md, color: '#b00020' }}>{t('dataLoadError')}</p>
      )}

      {codes.length >= 2 && loading && !compareData && (
        <p style={{ marginTop: spacing.md, color: c.muted }}>{t('loading')}</p>
      )}

      {codes.length >= 2 && chartRows.length > 0 && (
        <div style={{ marginTop: spacing.xl, width: '100%', minHeight: 300 }}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartRows} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
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
                  name={compareData?.countries.find((x) => x.code === code)?.name ?? code}
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
            {statsYears
              ? ` · ${statsYears.min}–${statsYears.max}`
              : ''}
          </p>
        </div>
      )}

      {codes.length >= 2 && compareData && chartRows.length === 0 && (
        <EmptyState text={t('worldNoValue')} />
      )}

      <p
        style={{
          marginTop: spacing.xl,
          fontFamily: fonts.body,
          fontSize: '0.88rem',
          color: c.muted,
          lineHeight: 1.5,
        }}
      >
        {t('worldComparePlaceholder')}
      </p>
    </div>
  )
}
