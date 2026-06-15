import InfoToggle from '../../../design-system/components/InfoToggle'
import MonoLabel from '../../../design-system/components/MonoLabel'
import PercentileBar from '../../../design-system/components/PercentileBar'
import SectionDivider from '../../../design-system/components/SectionDivider'
import Sparkline from '../../../design-system/components/Sparkline'
import StatTile from '../../../design-system/components/StatTile'
import TrendArrow from '../../../design-system/components/TrendArrow'
import { useTheme } from '../../../design-system'
import { interpolate } from '../../../design-system/i18n'
import { fonts, spacing } from '../../../design-system/tokens'
import {
  findInd,
  fmtNumber,
  fmtPopulation,
  latestValue,
  tailSeries,
  trendFromValues,
} from '../worldConsoleHelpers'
import type { WorldCountryDetail, WorldMapRow } from '../worldTypes'
import type {
  ConsoleTabLayoutDirection,
  WorldConsoleActiveIndicator,
} from '../CountrySidebar'

export function TabUebersicht({
  countryDetail,
  selectedRow,
  activeIndicator,
  percentile,
  lowerIsBetter,
  mapYear,
  layoutDirection,
}: {
  countryDetail: WorldCountryDetail | null
  selectedRow: WorldMapRow | null
  activeIndicator: WorldConsoleActiveIndicator | null
  percentile: number | null
  lowerIsBetter: boolean
  mapYear: number
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'

  const activeInd = activeIndicator?.code ? findInd(countryDetail, activeIndicator.code) : undefined
  const activeLatest =
    latestValue(activeInd) ||
    (selectedRow?.value != null && !Number.isNaN(selectedRow.value as number)
      ? { value: selectedRow.value as number, year: mapYear }
      : null)
  const activeTrend = trendFromValues(activeInd, 3)
  const activeSpark = tailSeries(activeInd, 10).map((p) => p.v)

  const popInd = findInd(countryDetail, 'SP.POP.TOTL')
  const gdpPcInd = findInd(countryDetail, 'NY.GDP.PCAP.CD')
  const lifeInd = findInd(countryDetail, 'SP.DYN.LE00.IN')
  const ldiInd = findInd(countryDetail, 'v2x_libdem')

  const popLatest = latestValue(popInd)
  const gdpPcLatest = latestValue(gdpPcInd)
  const lifeLatest = latestValue(lifeInd)
  const ldiLatest = latestValue(ldiInd)

  const tiles = [
    {
      label: t('worldConsoleStatPopulation'),
      value: popLatest ? fmtPopulation(popLatest.value, locale) : '—',
      sub: popLatest ? `${mapYear}` : '',
      icon: '⬡',
    },
    {
      label: t('worldConsoleStatGdpPc'),
      value: gdpPcLatest ? `$ ${fmtNumber(gdpPcLatest.value, 0, locale)}` : '—',
      sub: gdpPcLatest ? `Weltbank ${gdpPcLatest.year}` : '',
      icon: '◆',
    },
    {
      label: t('worldConsoleStatLife'),
      value: lifeLatest ? `${fmtNumber(lifeLatest.value, 1, locale)} J.` : '—',
      sub: lifeLatest ? `${lifeLatest.year}` : '',
      icon: '◈',
    },
    {
      label: t('worldConsoleStatDemocracy'),
      value: ldiLatest ? fmtNumber(ldiLatest.value, 2, locale) : '—',
      sub: ldiLatest ? `V-Dem LDI ${ldiLatest.year}` : '',
      icon: '◉',
    },
  ]

  const heroBlock = (
    <div style={{ marginBottom: layoutDirection === 'horizontal' ? spacing.md : spacing.lg }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <MonoLabel>{activeIndicator?.name || t('worldConsoleActiveIndicatorFallback')}</MonoLabel>
        {activeTrend != null && <TrendArrow value={activeTrend} inverted={lowerIsBetter} />}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: layoutDirection === 'horizontal' ? 32 : 40,
          color: c.ink,
          lineHeight: 1,
          marginTop: spacing.xs,
          letterSpacing: '-0.02em',
        }}
      >
        {activeLatest ? fmtNumber(activeLatest.value, 2, locale) : '—'}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: 12, color: c.muted, marginTop: spacing.xs }}>
        {activeIndicator?.code} · {activeLatest?.year ?? '—'}
      </div>
      {activeSpark.length >= 2 && (
        <div style={{ marginTop: spacing.md }}>
          <Sparkline data={activeSpark} height={layoutDirection === 'horizontal' ? 44 : 52} showMarkers />
        </div>
      )}
    </div>
  )

  const percentileBlock =
    percentile != null ? (
      <div style={{ marginBottom: layoutDirection === 'horizontal' ? spacing.md : spacing.lg }}>
        <PercentileBar
          pct={percentile}
          label={interpolate(t('worldConsolePercentilePosition'), {
            name: activeIndicator?.name || t('worldConsoleActiveIndicatorFallback'),
          })}
          inverted={lowerIsBetter}
        />
        <div
          style={{
            marginTop: spacing.sm,
            fontFamily: fonts.body,
            fontSize: 12,
            color: c.muted,
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          {interpolate(t('worldConsolePercentileCountryLine'), {
            country: countryDetail?.country_name || t('worldConsoleMapHintTitle'),
            pct: String(Math.round(lowerIsBetter ? 100 - percentile : percentile)),
          })}{' '}
          <InfoToggle text={t('worldConsolePercentileExplainer')} />
        </div>
      </div>
    ) : null

  const coreDataBlock = (
    <>
      <SectionDivider label={t('worldConsoleCoreData')} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        {tiles.map((tile, i) => (
          <StatTile key={i} {...tile} />
        ))}
      </div>
    </>
  )

  const profileRows = (
    [
      [t('worldConsoleIsoRow'), countryDetail?.country_code || '—'],
      [t('worldConsoleRegion'), countryDetail?.region || '—'],
      [t('worldConsoleIncome'), countryDetail?.income_level || '—'],
    ] as const
  ).map(([k, v]) => (
    <div
      key={String(k)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: `${spacing.sm}px 0`,
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      <MonoLabel style={{ margin: 0 }}>{k}</MonoLabel>
      <span style={{ fontFamily: fonts.body, fontSize: 13, color: c.ink }}>{v}</span>
    </div>
  ))

  const profileBlock = (
    <>
      <SectionDivider label={t('worldConsoleProfile')} />
      {profileRows}
    </>
  )

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr 320px',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {heroBlock}
          {percentileBlock}
        </div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{coreDataBlock}</div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{profileBlock}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {heroBlock}
      {percentileBlock}
      {coreDataBlock}
      {profileBlock}
    </div>
  )
}
