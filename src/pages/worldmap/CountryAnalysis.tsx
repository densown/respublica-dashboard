import { useMemo } from 'react'
import {
  CartesianGrid,
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
import type { WorldCountryDetail, WorldGeoJson } from './worldTypes'
import { worldIndicatorShortLabel } from './worldIndicatorShortNames'

type CountryAnalysisProps = {
  geojson: WorldGeoJson | null
  countryCode: string | null
  onCountryCode: (iso3: string | null) => void
  onBack: () => void
  indicatorCode: string
}

export function CountryAnalysis({
  geojson,
  countryCode,
  onCountryCode,
  onBack,
  indicatorCode,
}: CountryAnalysisProps) {
  const { c, t, lang } = useTheme()

  const countryEp = countryCode
    ? `/api/world/country/${encodeURIComponent(countryCode)}`
    : ''
  const { data: detail, loading, error } = useApi<WorldCountryDetail>(countryEp)

  const tsEp =
    countryCode && indicatorCode
      ? `/api/world/timeseries?country=${encodeURIComponent(countryCode)}&indicator=${encodeURIComponent(indicatorCode)}`
      : ''
  const { data: series } = useApi<Array<{ year: number; value: number | null }>>(
    tsEp,
  )

  const chartData = useMemo(() => {
    if (!series?.length) return []
    return series.map((r) => ({
      year: r.year,
      v: r.value,
    }))
  }, [series])

  const indicatorLabel = worldIndicatorShortLabel(indicatorCode, lang as Lang)

  const countryOptions = useMemo(() => {
    if (!geojson?.features.length) return []
    return [...geojson.features]
      .map((f) => ({
        iso3: f.properties.iso3.toUpperCase(),
        name: f.properties.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [geojson])

  const selectStyle: React.CSSProperties = {
    fontFamily: fonts.mono,
    fontSize: '0.85rem',
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: 6,
    border: `1px solid ${c.border}`,
    background: c.cardBg,
    color: c.text,
    minWidth: 220,
    maxWidth: '100%',
  }

  return (
    <div style={{ marginTop: spacing.lg }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
          alignItems: 'center',
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
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
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
            {t('worldPickCountry')}
          </div>
          <select
            style={{ ...selectStyle, width: '100%' }}
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
      </div>

      {!countryCode && (
        <EmptyState text={t('worldAnalysisPlaceholder')} />
      )}

      {countryCode && error && (
        <p style={{ color: '#b00020', fontFamily: fonts.body }}>{t('dataLoadError')}</p>
      )}

      {countryCode && loading && !detail && (
        <p style={{ color: c.muted, fontFamily: fonts.body }}>{t('loading')}</p>
      )}

      {detail && (
        <>
          <h2
            style={{
              fontFamily: fonts.body,
              fontSize: 'clamp(1.2rem, 4vw, 1.65rem)',
              fontWeight: 700,
              color: c.text,
              margin: `0 0 ${spacing.sm}`,
            }}
          >
            {detail.country_name}
          </h2>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.9rem',
              color: c.muted,
              marginBottom: spacing.lg,
            }}
          >
            {[detail.region, detail.income_level].filter(Boolean).join(' · ') ||
              t('worldRegionIncome')}
          </p>
          <p
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.8rem',
              color: c.inkSoft,
              marginBottom: spacing.md,
            }}
          >
            {t('worldIndicatorsLoaded')}: {detail.indicators.length}
          </p>

          <section style={{ marginTop: spacing.xl }}>
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
              {indicatorLabel}
            </h3>
            {chartData.length > 0 ? (
              <div style={{ width: '100%', minHeight: 280 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke={c.border} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                    />
                    <YAxis
                      tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                      width={52}
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
                            ? new Intl.NumberFormat(
                                lang === 'de' ? 'de-DE' : 'en-US',
                                { maximumFractionDigits: 2 },
                              ).format(n)
                            : '—',
                          '',
                        ]
                      }}
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

          <p
            style={{
              marginTop: spacing.xl,
              fontFamily: fonts.body,
              fontSize: '0.88rem',
              color: c.muted,
              lineHeight: 1.5,
            }}
          >
            {t('worldAnalysisPlaceholder')}
          </p>
        </>
      )}
    </div>
  )
}
