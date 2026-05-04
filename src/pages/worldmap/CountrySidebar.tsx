import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import HBar from '../../design-system/components/HBar'
import HSSectionBreakdown from '../../design-system/components/HSSectionBreakdown'
import InfoToggle from '../../design-system/components/InfoToggle'
import LineChart from '../../design-system/components/LineChart'
import MultiLineChart from '../../design-system/components/MultiLineChart'
import MonoLabel from '../../design-system/components/MonoLabel'
import PercentileBar from '../../design-system/components/PercentileBar'
import RadarChart from '../../design-system/components/RadarChart'
import SectionDivider from '../../design-system/components/SectionDivider'
import Sparkline from '../../design-system/components/Sparkline'
import StatTile from '../../design-system/components/StatTile'
import StackedAreaChart from '../../design-system/components/StackedAreaChart'
import TradeBalance from '../../design-system/components/TradeBalance'
import TrendArrow from '../../design-system/components/TrendArrow'
import ViewToggle, { type TradeTimeseriesView, type ViewToggleValue } from '../../design-system/components/ViewToggle'
import BalanceBarChart from '../../design-system/components/BalanceBarChart'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { interpolate } from '../../design-system/i18n'
import { fonts, spacing } from '../../design-system/tokens'
import { findInd, fmtNumber, fmtPopulation, fmtUsd, latestValue, tailSeries, trendFromValues } from './worldConsoleHelpers'
import type {
  CountrySelection,
  DockPosition,
  WorldCountryDetail,
  WorldGeoJson,
  WorldMapRow,
  WorldRankingRow,
  WorldTradeResponse,
  WorldTradeTimeseriesResponse,
} from './worldTypes'
import { iso3ToFlagIso2 } from './worldIso3ToIso2'
import './countrySidebar.css'

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

export type WorldConsoleActiveIndicator = {
  code: string
  name: string
  category: string
  lowerIsBetter: boolean
}

export type WorldConsoleArticle = {
  title: string
  url: string
  date?: string
  tag?: string
}

export type CountrySidebarProps = {
  iso3: string | null
  countryDetail: WorldCountryDetail | null
  selectedRow: WorldMapRow | null
  activeIndicator: WorldConsoleActiveIndicator | null
  percentile: number | null
  mapYear: number
  tradeData: WorldTradeResponse | null
  tradeLoading: boolean
  onLoadTrade: (iso3: string, partner?: string | null) => void
  tradeTimeseries: WorldTradeTimeseriesResponse | null
  tradeTimeseriesLoading: boolean
  onLoadTradeTimeseries: (iso3: string) => void
  ranking: WorldRankingRow[] | null
  globalStats: { median: number; mean: number; total: number } | null
  articles?: WorldConsoleArticle[]
  sheetLayout: boolean
  onClose: () => void
  onMinimize: (minimized: boolean) => void
  minimized: boolean
  /** Sichtbarkeit Bottom-Sheet / offen */
  isOpen?: boolean
  dock: DockPosition
  onDockChange: (d: DockPosition) => void
  selection: CountrySelection
  allCountryDetails: Map<string, WorldCountryDetail>
  mapRowsCountries: WorldMapRow[]
  formatIndicatorValue: (v: number | null | undefined) => string
  geojson: WorldGeoJson | null
  onRemoveFromSelection: (iso3: string) => void
  onClearAllSelection: () => void
}

export type ConsoleTabLayoutDirection = 'vertical' | 'horizontal'

type ConsoleTabId =
  | 'uebersicht'
  | 'demokratie'
  | 'wirtschaft'
  | 'handel'
  | 'vergleich'
  | 'kontext'

const TAB_DEF: { id: ConsoleTabId; labelKey: I18nKey }[] = [
  { id: 'uebersicht', labelKey: 'worldConsoleTabUebersicht' },
  { id: 'demokratie', labelKey: 'worldConsoleTabDemokratie' },
  { id: 'wirtschaft', labelKey: 'worldConsoleTabWirtschaft' },
  { id: 'handel', labelKey: 'worldConsoleTabHandel' },
  { id: 'vergleich', labelKey: 'worldConsoleTabVergleich' },
  { id: 'kontext', labelKey: 'worldConsoleTabKontext' },
]

function GlobalView({
  activeIndicatorLabel,
  ranking,
  stats,
  totalCountries,
  layoutDirection,
}: {
  activeIndicatorLabel: string | undefined
  ranking: WorldRankingRow[] | null
  stats: CountrySidebarProps['globalStats']
  totalCountries: number | undefined
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const top5 = (ranking ?? []).slice(0, 5)
  const bot5 = (ranking ?? []).slice(-5).reverse()

  const top5Block = (
    <>
      {top5.length > 0 && (
        <>
          <SectionDivider label={t('worldConsoleGlobalTop5')} />
          {top5.map((row, i) => (
            <div
              key={row.country_code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.sm}px 0`,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.muted, width: 16 }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: fonts.body, fontSize: 13, color: c.ink, flex: 1 }}>
                {row.country_name ?? row.country_code}
              </span>
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: c.ink }}>
                {fmtNumber(row.value, 2, locale)}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  )

  const bot5Block = (
    <>
      {bot5.length > 0 && (
        <>
          <SectionDivider label={t('worldConsoleGlobalBottom5')} />
          {bot5.map((row, i) => (
            <div
              key={row.country_code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.sm}px 0`,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.muted, width: 16 }}>
                {(totalCountries || 0) - i}
              </span>
              <span style={{ fontFamily: fonts.body, fontSize: 13, color: c.ink, flex: 1 }}>
                {row.country_name ?? row.country_code}
              </span>
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: c.no }}>
                {fmtNumber(row.value, 2, locale)}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  )

  const hintBlock = (
    <div
      style={{
        marginTop: spacing.xl,
        padding: spacing.lg,
        border: `1px dashed ${c.border}`,
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 20, marginBottom: spacing.sm }}>⊕</div>
      <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, lineHeight: 1.5 }}>
        {t('worldConsoleMapHintBody').split('\n').map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    </div>
  )

  const headerStatsBlock = (
    <>
      <div style={{ marginBottom: spacing.lg }}>
        <MonoLabel>{t('worldConsoleGlobalOverview')}</MonoLabel>
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: 22,
            color: c.ink,
            lineHeight: 1.1,
            marginTop: spacing.xs,
          }}
        >
          {activeIndicatorLabel || t('worldConsoleActiveIndicatorFallback')}
          <span style={{ color: c.red }}>.</span>
        </h2>
        <p
          style={{
            fontFamily: fonts.body,
            fontStyle: 'italic',
            fontSize: 12,
            color: c.muted,
            marginTop: spacing.xs,
          }}
        >
          {totalCountries
            ? interpolate(t('worldConsoleGlobalN'), { n: totalCountries })
            : `${t('worldNoValue')}…`}
        </p>
      </div>
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <StatTile
            label={t('worldConsoleGlobalMedian')}
            value={fmtNumber(stats.median, 2, locale)}
            sub={t('worldConsoleGlobalMedianSub')}
            icon="◉"
          />
          <StatTile
            label={t('worldConsoleGlobalMean')}
            value={fmtNumber(stats.mean, 2, locale)}
            sub={t('worldConsoleGlobalMeanSub')}
            icon="◆"
          />
        </div>
      )}
    </>
  )

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{headerStatsBlock}</div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {top5Block}
        </div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {bot5Block}
          {hintBlock}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {headerStatsBlock}
      {top5Block}
      {bot5Block}
      {hintBlock}
    </div>
  )
}

function TabUebersicht({
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

function TabDemokratie({
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

function TabWirtschaft({
  countryDetail,
  layoutDirection,
}: {
  countryDetail: WorldCountryDetail | null
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'

  const gdpPcInd = findInd(countryDetail, 'NY.GDP.PCAP.CD')
  const inflationInd = findInd(countryDetail, 'FP.CPI.TOTL.ZG')
  const unempInd = findInd(countryDetail, 'SL.UEM.TOTL.ZS')
  const giniInd = findInd(countryDetail, 'SI.POV.GINI')

  const gdpSeries = tailSeries(gdpPcInd, 14).map((p) => ({ y: p.y, v: p.v / 1000 }))
  const inflationSeries = tailSeries(inflationInd, 12)
  const unempSeries = tailSeries(unempInd, 12)

  const giniLatest = latestValue(giniInd)

  if (!gdpPcInd && !inflationInd && !unempInd) {
    return (
      <div style={{ padding: spacing.lg }}>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          {t('worldConsoleNoEcon')}
        </p>
      </div>
    )
  }

  const gdpInflationCol = (
    <>
      {gdpSeries.length >= 2 && (
        <>
          <SectionDivider label={t('worldConsoleSectionGdpPc')} />
          <LineChart data={gdpSeries} yLabel={t('worldConsoleGdpYLabel')} height={90} />
        </>
      )}
      {inflationSeries.length >= 2 && (
        <>
          <SectionDivider label={t('worldConsoleSectionInflation')} />
          <LineChart data={inflationSeries} color={c.no} height={70} showArea={false} />
        </>
      )}
    </>
  )

  const unempGiniCol = (
    <>
      {unempSeries.length >= 2 && (
        <>
          <SectionDivider label={t('worldConsoleSectionUnemployment')} />
          <LineChart data={unempSeries} color={c.yes} height={70} showArea={false} />
        </>
      )}
      {giniLatest && (
        <>
          <SectionDivider label={t('worldConsoleSectionInequality')} />
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: spacing.lg,
              marginBottom: spacing.sm,
            }}
          >
            <div>
              <MonoLabel>{t('worldConsoleGiniLabel')}</MonoLabel>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: 28,
                  color: c.ink,
                  lineHeight: 1.1,
                  marginTop: 4,
                }}
              >
                {fmtNumber(giniLatest.value, 1, locale)}
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: c.muted, marginTop: 2 }}>
                {interpolate(t('worldConsoleGiniSub'), { year: String(giniLatest.year) })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{gdpInflationCol}</div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{unempGiniCol}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {gdpInflationCol}
      {unempGiniCol}
    </div>
  )
}

function TabHandel({
  iso3,
  tradeData,
  loading,
  onLoadTrade,
  tradeTimeseries,
  tradeTimeseriesLoading,
  layoutDirection,
}: {
  iso3: string | null
  tradeData: WorldTradeResponse | null
  loading: boolean
  onLoadTrade: ((iso3: string, partner?: string | null) => void) | undefined
  tradeTimeseries: WorldTradeTimeseriesResponse | null
  tradeTimeseriesLoading: boolean
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const [tsView, setTsView] = useState<TradeTimeseriesView>(() => {
    try {
      const saved = localStorage.getItem('rp-trade-timeseries-view')
      if (saved === 'lines' || saved === 'bars' || saved === 'stacked') return saved
    } catch {
      /* ignore */
    }
    return 'lines'
  })
  const [breakdownMode, setBreakdownMode] = useState<'export' | 'import'>('export')
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null)
  const [userOverrodePartner, setUserOverrodePartner] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('rp-trade-timeseries-view', tsView)
    } catch {
      /* ignore */
    }
  }, [tsView])

  useEffect(() => {
    setBreakdownMode('export')
    setSelectedPartner(null)
    setUserOverrodePartner(false)
  }, [iso3])

  const topExportsRaw = tradeData?.top_exports
  const topImportsRaw = tradeData?.top_imports
  const exportPartners = useMemo(
    () =>
      (topExportsRaw ?? []).map((p) => ({
        iso3: p.partner_code,
        name: p.partner_name,
        value_usd: Number(p.value_usd || 0),
      })),
    [topExportsRaw],
  )
  const importPartners = useMemo(
    () =>
      (topImportsRaw ?? []).map((p) => ({
        iso3: p.partner_code,
        name: p.partner_name,
        value_usd: Number(p.value_usd || 0),
      })),
    [topImportsRaw],
  )
  const breakdownPartners = breakdownMode === 'export' ? exportPartners : importPartners
  const topPartnerForMode = breakdownPartners[0]?.iso3 ?? null

  useEffect(() => {
    if (!iso3 || !onLoadTrade) return

    const selectedIsInModeList =
      selectedPartner == null || breakdownPartners.some((p) => p.iso3 === selectedPartner)

    let nextPartner = selectedPartner
    let nextUserOverrode = userOverrodePartner

    if (selectedPartner == null) {
      if (!userOverrodePartner) {
        nextPartner = topPartnerForMode
      }
    } else if (!userOverrodePartner) {
      nextPartner = topPartnerForMode
    } else if (!selectedIsInModeList) {
      nextPartner = topPartnerForMode
      nextUserOverrode = false
    }

    if (nextPartner !== selectedPartner) {
      setSelectedPartner(nextPartner)
    }
    if (nextUserOverrode !== userOverrodePartner) {
      setUserOverrodePartner(nextUserOverrode)
    }
    if (nextPartner !== selectedPartner) {
      onLoadTrade(iso3, nextPartner)
    }
  }, [
    iso3,
    onLoadTrade,
    breakdownPartners,
    topPartnerForMode,
    selectedPartner,
    userOverrodePartner,
  ])

  if (loading && tradeTimeseriesLoading && !tradeData && !tradeTimeseries) {
    return (
      <div style={{ padding: spacing.lg }}>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          {t('worldConsoleLoadingTrade')}
        </p>
      </div>
    )
  }

  const exports = Number(tradeData?.total_export_usd || 0)
  const imports = Number(tradeData?.total_import_usd || 0)
  const expBn = exports / 1e9
  const impBn = imports / 1e9

  const topExp = topExportsRaw ?? []
  const topImp = topImportsRaw ?? []
  const maxExp = topExp.length ? Math.max(...topExp.map((x) => Number(x.value_usd))) : 1
  const maxImp = topImp.length ? Math.max(...topImp.map((x) => Number(x.value_usd))) : 1

  const tsData = (tradeTimeseries?.years || [])
    .map((p) => ({
      year: Number(p.year),
      total_export_usd: Number(p.total_export_usd || 0),
      total_import_usd: Number(p.total_import_usd || 0),
    }))
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.total_export_usd) && Number.isFinite(p.total_import_usd))
    .sort((a, b) => a.year - b.year)

  const sectionExport = (tradeData?.sections_export || [])
    .map((r) => ({ hs_section: r.hs_section, value_usd: Number(r.value_usd || 0) }))
    .filter((r) => Number.isFinite(r.value_usd) && r.value_usd > 0)

  const sectionImport = (tradeData?.sections_import || [])
    .map((r) => ({ hs_section: r.hs_section, value_usd: Number(r.value_usd || 0) }))
    .filter((r) => Number.isFinite(r.value_usd) && r.value_usd > 0)

  const exportLabel = (t('worldConsoleTradeExportsLine').split(':')[0] ?? 'Export').trim()
  const importLabel = (t('worldConsoleTradeImportsLine').split(':')[0] ?? 'Import').trim()
  const sourceLabel = t('worldConsoleTradeSourceBaci')
  const partnerName =
    selectedPartner == null
      ? null
      : exportPartners.concat(importPartners).find((p) => p.iso3 === selectedPartner)?.name ??
        selectedPartner
  const breakdownTitle = partnerName
    ? interpolate(t('worldConsoleTradeBreakdownTitleWithPartner'), { partner: partnerName })
    : t('worldConsoleTradeBreakdownTitle')

  const timeseriesChart =
    tsView === 'bars' ? (
      <BalanceBarChart data={tsData} sourceLabel={sourceLabel} />
    ) : tsView === 'stacked' ? (
      <StackedAreaChart data={tsData} sourceLabel={sourceLabel} />
    ) : (
      <MultiLineChart data={tsData} sourceLabel={sourceLabel} />
    )

  const timeseriesBlock = (
    <>
      <SectionDivider label={t('worldConsoleTradeTimeseriesTitle')} />
      <ViewToggle
        value={tsView}
        onChange={(next) => {
          if (next === 'lines' || next === 'bars' || next === 'stacked') setTsView(next)
        }}
        options={[
          { value: 'lines', label: t('worldConsoleTradeViewLines') },
          { value: 'bars', label: t('worldConsoleTradeViewBars') },
          { value: 'stacked', label: t('worldConsoleTradeViewStacked') },
        ]}
        style={{ marginBottom: spacing.md }}
      />
      {timeseriesChart}
    </>
  )

  const balanceBlock = (
    <>
      <SectionDivider label={interpolate(t('worldConsoleTradeBalanceYear'), { year: String(tradeData?.year ?? '—') })} />
      <TradeBalance exports={Math.round(expBn)} imports={Math.round(impBn)} currency="Mrd. $" />
    </>
  )

  const kpiTiles = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: spacing.sm,
        marginTop: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <StatTile
        label={exportLabel}
        value={fmtNumber(expBn, 1, locale)}
        sub={`Mrd. $ · ${tradeData?.year ?? '—'}`}
        icon="▲"
      />
      <StatTile
        label={importLabel}
        value={fmtNumber(impBn, 1, locale)}
        sub={`Mrd. $ · ${tradeData?.year ?? '—'}`}
        icon="▼"
      />
    </div>
  )

  const exportsBlock =
    topExp.length > 0 ? (
      <>
        <SectionDivider label={t('worldConsoleTopExports')} />
        {topExp.map((p, i) => (
          <HBar
            key={i}
            label={p.partner_name}
            value={Number(p.value_usd)}
            max={maxExp}
            formatted={fmtUsd(Number(p.value_usd), locale)}
            color={c.yes}
          />
        ))}
      </>
    ) : null

  const importsBlock =
    topImp.length > 0 ? (
      <>
        <SectionDivider label={t('worldConsoleTopImports')} />
        {topImp.map((p, i) => (
          <HBar
            key={i}
            label={p.partner_name}
            value={Number(p.value_usd)}
            max={maxImp}
            formatted={fmtUsd(Number(p.value_usd), locale)}
            color={c.no}
          />
        ))}
      </>
    ) : null

  const breakdownBlock = (
    <>
      <SectionDivider label={breakdownTitle} />
      <ViewToggle
        value={breakdownMode}
        onChange={(next: ViewToggleValue) => {
          if (next === 'export' || next === 'import') setBreakdownMode(next)
        }}
        options={[
          { value: 'export', label: t('worldConsoleTradeBreakdownExport') },
          { value: 'import', label: t('worldConsoleTradeBreakdownImport') },
        ]}
        style={{ marginBottom: spacing.md }}
      />
      <HSSectionBreakdown
        sectionsExport={sectionExport}
        sectionsImport={sectionImport}
        mode={breakdownMode}
        sourceLabel={sourceLabel}
        partners={breakdownPartners}
        selectedPartner={selectedPartner}
        onPartnerChange={(iso) => {
          if (!iso3 || !onLoadTrade) return
          setSelectedPartner(iso)
          setUserOverrodePartner(true)
          onLoadTrade(iso3, iso)
        }}
      />
    </>
  )

  const partnersBlock = (
    <>
      {balanceBlock}
      {kpiTiles}
      {exportsBlock}
      {importsBlock}
    </>
  )

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {timeseriesBlock}
        </div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{partnersBlock}</div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{breakdownBlock}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {timeseriesBlock}
      {partnersBlock}
      {breakdownBlock}
    </div>
  )
}

function normIso3(code: string): string {
  return code.trim().toUpperCase()
}

function TabVergleich({
  selection,
  allCountryDetails,
  mapRowsCountries,
  formatIndicatorValue,
  activeIndicator,
  geojson,
  onRemoveFromSelection,
  onClearAllSelection,
  layoutDirection,
}: {
  selection: CountrySelection
  allCountryDetails: Map<string, WorldCountryDetail>
  mapRowsCountries: WorldMapRow[]
  formatIndicatorValue: (v: number | null | undefined) => string
  activeIndicator: WorldConsoleActiveIndicator | null
  geojson: WorldGeoJson | null
  onRemoveFromSelection: (iso3: string) => void
  onClearAllSelection: () => void
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t } = useTheme()

  const ordered: string[] = [
    ...(selection.primary ? [normIso3(selection.primary)] : []),
    ...selection.compare.map(normIso3),
  ]

  const rowsForHbar = ordered.map((iso) => {
    const det = allCountryDetails.get(iso)
    const mapRow = mapRowsCountries.find((r) => normIso3(r.country_code) === iso)
    const name = det?.country_name ?? mapRow?.country_name ?? iso
    const val =
      mapRow?.value != null && !Number.isNaN(mapRow.value as number)
        ? (mapRow.value as number)
        : null
    return { iso, name, val }
  })
  const maxBar = Math.max(
    1e-9,
    ...rowsForHbar.map((r) => (r.val != null ? Math.abs(r.val) : 0)),
  )
  const barColors = [c.red, c.yes, c.no, c.ink]

  const listRows = ordered.map((iso, idx) => {
    const det = allCountryDetails.get(iso)
    const mapRow = mapRowsCountries.find((r) => normIso3(r.country_code) === iso)
    const iso2 = iso3ToFlagIso2(iso, geojson)
    const flagUrl = iso2 ? `https://flagcdn.com/w40/${iso2}.png` : null
    const isPrimary = idx === 0
    const regionLine = [det?.region, det?.income_level].filter(Boolean).join(' · ')
    return (
      <div
        key={iso}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: spacing.md,
          padding: `${spacing.md}px 0`,
          borderBottom: `1px solid ${c.border}`,
        }}
      >
        {flagUrl ? (
          <img
            src={flagUrl}
            alt=""
            width={40}
            height={28}
            style={{
              borderRadius: 4,
              objectFit: 'cover',
              flexShrink: 0,
              border: `1px solid ${c.border}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 28,
              borderRadius: 4,
              background: c.bgHover,
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                fontWeight: 600,
                color: c.ink,
              }}
            >
              {det?.country_name ?? mapRow?.country_name ?? iso}
            </span>
            {isPrimary && (
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 8,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: c.red,
                  border: `1px solid ${c.red}`,
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                {t('worldCompareTabPrimary')}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              color: c.muted,
              marginTop: 4,
              letterSpacing: '0.04em',
            }}
          >
            {iso}
            {regionLine ? ` · ${regionLine}` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemoveFromSelection(iso)}
          title={t('worldConsoleClose')}
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: 0,
            border: `1px solid ${c.border}`,
            borderRadius: 4,
            background: 'transparent',
            color: c.muted,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: 14,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    )
  })

  const hintsBlock =
    ordered.length < 4 ? (
      <div
        style={{
          marginTop: spacing.lg,
          padding: spacing.md,
          border: `1px dashed ${c.border}`,
          borderRadius: 8,
        }}
      >
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 12,
            color: c.muted,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {t('worldCompareTabHintRightclick')}
          <br />
          {t('worldCompareTabHintCmdclick')}
        </p>
      </div>
    ) : null

  const clearAllBtn = (
    <button
      type="button"
      onClick={onClearAllSelection}
      style={{
        marginTop: spacing.lg,
        width: '100%',
        minHeight: 44,
        padding: `${spacing.sm}px ${spacing.md}px`,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        background: c.bg,
        color: c.ink,
        fontFamily: fonts.mono,
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {t('worldCompareTabClearAll')}
    </button>
  )

  const compareListColumn = (
    <>
      <SectionDivider label={t('worldCompareTabSelectedCountries')} />
      {listRows}
      {hintsBlock}
      {clearAllBtn}
    </>
  )

  const indicatorColumn = (
    <>
      <SectionDivider label={t('worldCompareTabActiveIndicator')} />
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          fontWeight: 600,
          color: c.ink,
          marginTop: spacing.sm,
          marginBottom: spacing.md,
        }}
      >
        {activeIndicator?.name || t('worldConsoleActiveIndicatorFallback')}
      </p>
      {rowsForHbar.map((r, i) => (
        <HBar
          key={r.iso}
          label={r.name}
          value={r.val != null ? Math.abs(r.val) : 0}
          max={maxBar}
          formatted={r.val != null ? formatIndicatorValue(r.val) : t('worldNoValue')}
          color={barColors[i % barColors.length]!}
        />
      ))}
    </>
  )

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{compareListColumn}</div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{indicatorColumn}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {compareListColumn}
      <div style={{ marginTop: spacing.xl }}>{indicatorColumn}</div>
    </div>
  )
}

function TabKontext({
  countryDetail: _countryDetail,
  articles,
  layoutDirection,
}: {
  countryDetail: WorldCountryDetail | null
  articles?: WorldConsoleArticle[]
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t } = useTheme()

  const dataSources = [
    { source: t('worldConsoleSourceWdi'), desc: t('worldConsoleSourceWdiDesc') },
    { source: t('worldConsoleSourceVdem'), desc: t('worldConsoleSourceVdemDesc') },
    { source: t('worldConsoleSourceComtrade'), desc: t('worldConsoleSourceComtradeDesc') },
  ]

  const sourcesAndMethods = (
    <>
      <SectionDivider label={t('worldConsoleSourcesHeading')} />
      {dataSources.map((u, i) => (
        <div key={i} style={{ padding: `${spacing.sm}px 0`, borderBottom: `1px solid ${c.border}` }}>
          <div style={{ fontFamily: fonts.body, fontSize: 13, color: c.ink, fontWeight: 500 }}>{u.source}</div>
          <div style={{ fontFamily: fonts.body, fontSize: 11, color: c.muted, marginTop: 2 }}>{u.desc}</div>
        </div>
      ))}
      <SectionDivider label={t('worldConsoleMethodsHeading')} />
      <p style={{ fontFamily: fonts.body, fontSize: 12, color: c.muted, lineHeight: 1.6 }}>
        {t('worldConsoleMethodsBody')}
      </p>
    </>
  )

  const visitLink = (
    <a
      href="https://respublica.media"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: fonts.mono,
        fontSize: 11,
        color: c.red,
        marginTop: spacing.md,
        cursor: 'pointer',
        textDecoration: 'none',
      }}
    >
      {t('worldConsoleVisitRp')} <span>→</span>
    </a>
  )

  const articlesBlock =
    articles && articles.length > 0 ? (
      <>
        <SectionDivider label={t('worldConsoleArticlesHeading')} />
        {articles.map((a, i) => (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: `${spacing.md}px 0`,
              borderBottom: `1px solid ${c.border}`,
              textDecoration: 'none',
            }}
          >
            {a.tag && (
              <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xs }}>
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#fff',
                    background: c.badgeBg,
                    borderRadius: 3,
                    padding: '2px 6px',
                  }}
                >
                  {a.tag}
                </span>
              </div>
            )}
            <div
              style={{
                fontFamily: fonts.body,
                fontWeight: 600,
                fontSize: 13,
                color: c.ink,
                lineHeight: 1.45,
              }}
            >
              {a.title}
            </div>
            {a.date && (
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  color: c.muted,
                  marginTop: spacing.xs,
                }}
              >
                {a.date}
              </div>
            )}
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                color: c.red,
                marginTop: spacing.xs,
              }}
            >
              {t('worldConsoleReadArticle')}
            </div>
          </a>
        ))}
      </>
    ) : null

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {sourcesAndMethods}
        </div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {articlesBlock}
          {visitLink}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {articlesBlock}
      {sourcesAndMethods}
      {visitLink}
    </div>
  )
}

export function CountrySidebar({
  iso3,
  countryDetail,
  selectedRow,
  activeIndicator,
  percentile,
  mapYear,
  tradeData,
  tradeLoading,
  onLoadTrade,
  tradeTimeseries,
  tradeTimeseriesLoading,
  onLoadTradeTimeseries,
  ranking,
  globalStats,
  articles,
  sheetLayout = false,
  onClose,
  onMinimize,
  minimized = false,
  isOpen = true,
  dock,
  onDockChange,
  selection,
  allCountryDetails,
  mapRowsCountries,
  formatIndicatorValue,
  geojson,
  onRemoveFromSelection,
  onClearAllSelection,
}: CountrySidebarProps) {
  const { c, t } = useTheme()
  const [activeTab, setActiveTab] = useState<ConsoleTabId>('uebersicht')
  const prevHasCountry = useRef(!!iso3)

  const hasCountry = !!iso3
  const lowerIsBetter = activeIndicator?.lowerIsBetter || false

  const layoutDirection: ConsoleTabLayoutDirection =
    dock === 'bottom' && !sheetLayout ? 'horizontal' : 'vertical'

  const headerBlockPadding =
    layoutDirection === 'horizontal'
      ? `${spacing.sm}px ${spacing.lg}px ${spacing.xs}px`
      : `${spacing.md}px ${spacing.lg}px ${spacing.sm}px`

  useEffect(() => {
    if (!hasCountry) {
      setActiveTab('uebersicht')
    } else if (!prevHasCountry.current) {
      setActiveTab('uebersicht')
    }
    prevHasCountry.current = hasCountry
  }, [hasCountry])

  useEffect(() => {
    if (activeTab !== 'handel' || !hasCountry || !iso3) return
    if (onLoadTrade && (!tradeData || tradeData.year !== mapYear) && !tradeLoading) {
      onLoadTrade(iso3)
    }
    if (onLoadTradeTimeseries && !tradeTimeseries && !tradeTimeseriesLoading) {
      onLoadTradeTimeseries(iso3)
    }
  }, [
    activeTab,
    hasCountry,
    iso3,
    mapYear,
    tradeData,
    tradeLoading,
    onLoadTrade,
    tradeTimeseries,
    tradeTimeseriesLoading,
    onLoadTradeTimeseries,
  ])

  if (!sheetLayout && minimized) {
    return (
      <aside
        className={`country-sidebar ${isOpen ? 'country-sidebar--open' : ''}`}
        style={
          {
            width: dock === 'bottom' ? '100%' : 32,
            height: dock === 'bottom' ? 44 : undefined,
            minHeight: dock === 'bottom' ? 44 : undefined,
            flexShrink: 0,
            background: c.cardBg,
            borderTop: dock === 'bottom' ? `1px solid ${c.border}` : 'none',
            borderLeft: dock === 'right' ? `1px solid ${c.border}` : 'none',
            borderRight: dock === 'left' ? `1px solid ${c.border}` : 'none',
            display: 'flex',
            flexDirection: dock === 'bottom' ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: dock === 'bottom' ? 'center' : undefined,
            padding: dock === 'bottom' ? `${spacing.sm}px` : `${spacing.md}px 0`,
            cursor: 'pointer',
            gap: spacing.md,
          } as CSSProperties
        }
        onClick={() => onMinimize?.(false)}
        title={t('worldConsoleOpenConsole')}
      >
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            color: c.muted,
            ...(dock === 'bottom' ? {} : { writingMode: 'vertical-rl' as const }),
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {iso3 || t('worldConsoleWorldStrip')}
        </span>
        {dock === 'bottom' ? null : (
          <span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.muted }}>▸</span>
        )}
      </aside>
    )
  }

  const cycleDock = () => {
    const order: DockPosition[] = ['right', 'bottom', 'left']
    const i = order.indexOf(dock)
    const next = order[(i + 1) % order.length]!
    onDockChange(next)
  }

  const dockSnapTitle =
    dock === 'right'
      ? t('worldConsoleDockBottom')
      : dock === 'bottom'
        ? t('worldConsoleDockLeft')
        : t('worldConsoleDockRight')

  const dockSnapSymbol = dock === 'right' ? '▬' : dock === 'bottom' ? '◧' : '◨'

  const bottomContentFrame: CSSProperties | undefined =
    layoutDirection === 'vertical' &&
    !sheetLayout &&
    dock === 'bottom' &&
    (!hasCountry || activeTab !== 'uebersicht')
      ? {
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }
      : undefined

  const content = !hasCountry ? (
    <GlobalView
      activeIndicatorLabel={activeIndicator?.name}
      ranking={ranking}
      stats={globalStats}
      totalCountries={globalStats?.total}
      layoutDirection={layoutDirection}
    />
  ) : (
    (() => {
      switch (activeTab) {
        case 'uebersicht':
          return (
            <TabUebersicht
              countryDetail={countryDetail}
              selectedRow={selectedRow}
              activeIndicator={activeIndicator}
              percentile={percentile}
              lowerIsBetter={lowerIsBetter}
              mapYear={mapYear}
              layoutDirection={layoutDirection}
            />
          )
        case 'demokratie':
          return <TabDemokratie countryDetail={countryDetail} layoutDirection={layoutDirection} />
        case 'wirtschaft':
          return <TabWirtschaft countryDetail={countryDetail} layoutDirection={layoutDirection} />
        case 'handel':
          return (
            <TabHandel
              iso3={iso3}
              tradeData={tradeData}
              loading={tradeLoading}
              onLoadTrade={onLoadTrade}
              tradeTimeseries={tradeTimeseries}
              tradeTimeseriesLoading={tradeTimeseriesLoading}
              layoutDirection={layoutDirection}
            />
          )
        case 'vergleich':
          return (
            <TabVergleich
              selection={selection}
              allCountryDetails={allCountryDetails}
              mapRowsCountries={mapRowsCountries}
              formatIndicatorValue={formatIndicatorValue}
              activeIndicator={activeIndicator}
              geojson={geojson}
              onRemoveFromSelection={onRemoveFromSelection}
              onClearAllSelection={onClearAllSelection}
              layoutDirection={layoutDirection}
            />
          )
        case 'kontext':
          return (
            <TabKontext
              countryDetail={countryDetail}
              articles={articles}
              layoutDirection={layoutDirection}
            />
          )
        default:
          return null
      }
    })()
  )

  const asideStyle: CSSProperties = sheetLayout
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56vh',
        maxHeight: '56vh',
        borderRadius: '14px 14px 0 0',
        background: c.cardBg,
        color: c.ink,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -6px 32px rgba(0,0,0,0.16)',
        zIndex: 200,
        overflow: 'hidden',
      }
    : dock === 'bottom'
      ? {
          width: '100%',
          height: '40vh',
          minHeight: 320,
          maxHeight: '60vh',
          flexShrink: 0,
          background: c.cardBg,
          borderTop: `1px solid ${c.border}`,
          borderLeft: 'none',
          borderRight: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }
      : {
          width: 320,
          flexShrink: 0,
          background: c.cardBg,
          borderLeft: dock === 'right' ? `1px solid ${c.border}` : 'none',
          borderRight: dock === 'left' ? `1px solid ${c.border}` : 'none',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          minWidth: 0,
        }

  const countryName = countryDetail?.country_name || iso3 || t('worldConsoleWorldMapTitle')
  const countryRegion = countryDetail?.region
  const countryIncome = countryDetail?.income_level

  return (
    <aside
      className={`country-sidebar ${sheetLayout ? 'country-sidebar--sheet' : ''} ${isOpen ? 'country-sidebar--open' : ''}`}
      style={asideStyle}
      aria-hidden={!isOpen}
    >
      <div
        style={{
          background: c.cardBg,
          borderBottom: `1px solid ${c.border}`,
          flexShrink: 0,
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: headerBlockPadding,
            gap: spacing.sm,
          }}
        >
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: hasCountry ? 20 : 16,
                color: c.ink,
                lineHeight: 1.1,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {countryName}
              <span style={{ color: c.red }}>.</span>
            </h2>
            {hasCountry && (countryRegion || countryIncome) && (
              <p
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: c.muted,
                  margin: 0,
                  marginTop: 2,
                }}
              >
                {[countryRegion, countryIncome].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: spacing.xs, flexShrink: 0 }}>
            {!sheetLayout && (
              <button
                type="button"
                onClick={cycleDock}
                style={{
                  width: 28,
                  height: 28,
                  border: `1px solid ${c.border}`,
                  borderRadius: 4,
                  background: 'transparent',
                  color: c.muted,
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={dockSnapTitle}
              >
                {dockSnapSymbol}
              </button>
            )}
            {!sheetLayout && onMinimize && (
              <button
                type="button"
                onClick={() => onMinimize(true)}
                style={{
                  width: 28,
                  height: 28,
                  border: `1px solid ${c.border}`,
                  borderRadius: 4,
                  background: 'transparent',
                  color: c.muted,
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={t('worldConsoleMinimize')}
              >
                ◁
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 28,
                  height: 28,
                  border: `1px solid ${c.border}`,
                  borderRadius: 4,
                  background: 'transparent',
                  color: c.muted,
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={t('worldConsoleClose')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {hasCountry && (
          <div
            style={{
              position: 'relative',
              flexShrink: 0,
              minWidth: 0,
              width: '100%',
            }}
          >
            <div
              className="country-sidebar__tab-strip"
              style={{
                display: 'flex',
                overflowX: layoutDirection === 'horizontal' ? 'visible' : 'auto',
                gap: 0,
                borderTop: `1px solid ${c.border}`,
                minWidth: 0,
              }}
            >
              {TAB_DEF.map((tab) => {
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flexShrink: 0,
                      padding: `${spacing.sm}px ${spacing.md}px`,
                      border: 'none',
                      borderBottom: `2px solid ${active ? c.red : 'transparent'}`,
                      background: 'transparent',
                      color: active ? c.red : c.muted,
                      fontFamily: fonts.mono,
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'color 0.15s, border-color 0.15s',
                    }}
                  >
                    {t(tab.labelKey)}
                    {tab.id === 'vergleich' && selection.compare.length > 0 ? (
                      <span
                        style={{
                          marginLeft: 4,
                          background: c.red,
                          color: '#fff',
                          borderRadius: 999,
                          padding: '0 5px',
                          fontSize: 8,
                          display: 'inline-block',
                          verticalAlign: 'middle',
                          lineHeight: 1.4,
                          minWidth: 14,
                          textAlign: 'center',
                        }}
                      >
                        {selection.compare.length + 1}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
            {layoutDirection === 'vertical' ? (
              <div
                aria-hidden
                style={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 20,
                  background: `linear-gradient(to right, transparent, ${c.cardBg})`,
                  zIndex: 1,
                }}
              />
            ) : null}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: layoutDirection === 'horizontal' ? 'hidden' : 'auto',
          scrollbarWidth: 'thin',
        }}
      >
        {layoutDirection === 'horizontal' ? (
          content
        ) : (
          <div style={bottomContentFrame}>{content}</div>
        )}
      </div>
    </aside>
  )
}
