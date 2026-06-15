import { useMemo } from 'react'
import HBar from '../../../design-system/components/HBar'
import LineChart from '../../../design-system/components/LineChart'
import MonoLabel from '../../../design-system/components/MonoLabel'
import RadarChart from '../../../design-system/components/RadarChart'
import SectionDivider from '../../../design-system/components/SectionDivider'
import { useTheme } from '../../../design-system'
import type { I18nKey } from '../../../design-system/i18n'
import { interpolate } from '../../../design-system/i18n'
import { fonts, spacing } from '../../../design-system/tokens'
import { findInd, latestValue, tailSeries } from '../worldConsoleHelpers'
import type { WorldCountryDetail } from '../worldTypes'
import type { ConsoleTabLayoutDirection } from '../CountrySidebar'

const VDEM_CODES = [
  'v2x_libdem',
  'v2x_polyarchy',
  'v2x_civlib',
  'v2x_freexp',
  'v2x_frassoc_thick',
  'v2xel_frefair',
  'v2x_rule',
  'v2x_corr',
] as const

const VDEM_I18N: Record<(typeof VDEM_CODES)[number], I18nKey> = {
  v2x_libdem: 'worldConsoleVdem_libdem',
  v2x_polyarchy: 'worldConsoleVdem_polyarchy',
  v2x_civlib: 'worldConsoleVdem_civlib',
  v2x_freexp: 'worldConsoleVdem_freexp',
  v2x_frassoc_thick: 'worldConsoleVdem_frassoc',
  v2xel_frefair: 'worldConsoleVdem_elfrefair',
  v2x_rule: 'worldConsoleVdem_rule',
  v2x_corr: 'worldConsoleVdem_corr',
}

const VDEM_RADAR_KEYS: { code: (typeof VDEM_CODES)[number]; labelKey: I18nKey }[] = [
  { code: 'v2x_libdem', labelKey: 'worldConsoleRadarLiberal' },
  { code: 'v2x_polyarchy', labelKey: 'worldConsoleRadarElectoral' },
  { code: 'v2x_civlib', labelKey: 'worldConsoleRadarCivil' },
  { code: 'v2x_freexp', labelKey: 'worldConsoleRadarSpeech' },
  { code: 'v2x_frassoc_thick', labelKey: 'worldConsoleRadarAssoc' },
  { code: 'v2xel_frefair', labelKey: 'worldConsoleRadarElections' },
]

export function TabDemokratie({
  countryDetail,
  layoutDirection,
}: {
  countryDetail: WorldCountryDetail | null
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t } = useTheme()

  const vdemIndicators = useMemo(() => {
    const result: Record<string, ReturnType<typeof findInd>> = {}
    for (const code of VDEM_CODES) {
      result[code] = findInd(countryDetail, code)
    }
    return result
  }, [countryDetail])

  const ldiInd = vdemIndicators['v2x_libdem']
  const ldiLatest = latestValue(ldiInd)
  const ldiSeries = tailSeries(ldiInd, 75)
  const ldiSeries10 = tailSeries(ldiInd, 10)
  let trend10: number | null = null
  if (ldiSeries10.length >= 2) {
    trend10 = ldiSeries10[ldiSeries10.length - 1]!.v - ldiSeries10[0]!.v
  }

  const radarAxes = VDEM_RADAR_KEYS.map(({ code, labelKey }) => {
    const ind = vdemIndicators[code]
    const latest = latestValue(ind)
    return { label: t(labelKey), value: latest?.value ?? 0 }
  })

  const bars = VDEM_CODES.map((code) => {
    const ind = vdemIndicators[code]
    const latest = latestValue(ind)
    const v = latest?.value
    const displayV = code === 'v2x_corr' && v != null ? 1 - v : v
    return {
      label: t(VDEM_I18N[code]),
      value: displayV ?? 0,
      formatted: v != null ? v.toFixed(2) : '—',
    }
  })

  if (!ldiInd) {
    return (
      <div style={{ padding: spacing.lg }}>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          {t('worldConsoleNoVdem')}
        </p>
      </div>
    )
  }

  const ldiHero = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: spacing.md,
      }}
    >
      <div>
        <MonoLabel>{t('worldConsoleLdiHeading')}</MonoLabel>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: 30,
            color: c.ink,
            lineHeight: 1.1,
            marginTop: spacing.xs,
          }}
        >
          {ldiLatest ? ldiLatest.value.toFixed(2) : '—'}
          <span style={{ color: c.red }}>.</span>
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 12, color: c.muted, marginTop: 2 }}>
          {interpolate(t('worldConsoleVdemSource'), { year: String(ldiLatest?.year ?? '—') })}
        </div>
      </div>
      {trend10 != null && (
        <div style={{ textAlign: 'right' }}>
          <MonoLabel>{t('worldConsoleTrend10y')}</MonoLabel>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 13,
              color: trend10 >= 0 ? c.yes : c.no,
            }}
          >
            {trend10 >= 0 ? '↑' : '↓'} {trend10 >= 0 ? '+' : ''}
            {trend10.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )

  const lineChartBlock =
    ldiSeries.length >= 2 ? (
      <>
        <SectionDivider label={t('worldConsoleSectionLdiSeries')} />
        <LineChart data={ldiSeries} yLabel={t('worldConsoleLdiYLabel')} height={90} />
      </>
    ) : null

  const radarBlock = (
    <>
      <SectionDivider label={t('worldConsoleSectionVdemDims')} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: spacing.md,
          ...(layoutDirection === 'horizontal'
            ? { maxWidth: 280, width: '100%', marginLeft: 'auto', marginRight: 'auto' }
            : {}),
        }}
      >
        <RadarChart axes={radarAxes} />
      </div>
    </>
  )

  const barsBlock = (
    <>
      <SectionDivider label={t('worldConsoleSectionVdemAll')} />
      {bars.map((b, i) => (
        <HBar key={i} label={b.label} value={b.value} max={1} formatted={b.formatted} color={c.red} />
      ))}
    </>
  )

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px 1fr',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {ldiHero}
          {lineChartBlock}
        </div>
        <div
          style={{
            overflowY: 'auto',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {radarBlock}
        </div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{barsBlock}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {ldiHero}
      {lineChartBlock}
      {radarBlock}
      {barsBlock}
    </div>
  )
}
