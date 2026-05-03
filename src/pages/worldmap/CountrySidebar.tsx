import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import HBar from '../../design-system/components/HBar'
import InfoToggle from '../../design-system/components/InfoToggle'
import LineChart from '../../design-system/components/LineChart'
import MonoLabel from '../../design-system/components/MonoLabel'
import PercentileBar from '../../design-system/components/PercentileBar'
import RadarChart from '../../design-system/components/RadarChart'
import SectionDivider from '../../design-system/components/SectionDivider'
import Sparkline from '../../design-system/components/Sparkline'
import StatTile from '../../design-system/components/StatTile'
import TradeBalance from '../../design-system/components/TradeBalance'
import TrendArrow from '../../design-system/components/TrendArrow'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { interpolate } from '../../design-system/i18n'
import { fonts, spacing } from '../../design-system/tokens'
import { findInd, fmtNumber, fmtPopulation, fmtUsd, latestValue, tailSeries, trendFromValues } from './worldConsoleHelpers'
import type {
  WorldCategoryApi,
  WorldCountryDetail,
  WorldMapRow,
  WorldRankingRow,
  WorldTradeResponse,
} from './worldTypes'
import MapControlsPanel from './MapControlsPanel'
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
  onLoadTrade: (iso3: string) => void
  ranking: WorldRankingRow[] | null
  globalStats: { median: number; mean: number; total: number } | null
  articles?: WorldConsoleArticle[]
  sheetLayout: boolean
  onClose: () => void
  onMinimize: (minimized: boolean) => void
  minimized: boolean
  /** Sichtbarkeit Bottom-Sheet / offen */
  isOpen?: boolean
  categories: WorldCategoryApi[]
  activeCategory: string
  onCategoryChange: (cat: string) => void
  activeIndicatorCode: string
  onIndicatorCodeChange: (code: string) => void
  year: number
  onYearChange: (year: number) => void
  yearMin: number
  yearMax: number
}

type ConsoleTabId =
  | 'karte'
  | 'uebersicht'
  | 'demokratie'
  | 'wirtschaft'
  | 'handel'
  | 'vergleich'
  | 'kontext'

const TAB_DEF_FULL: { id: ConsoleTabId; labelKey: I18nKey }[] = [
  { id: 'karte', labelKey: 'worldConsoleTabKarte' },
  { id: 'uebersicht', labelKey: 'worldConsoleTabUebersicht' },
  { id: 'demokratie', labelKey: 'worldConsoleTabDemokratie' },
  { id: 'wirtschaft', labelKey: 'worldConsoleTabWirtschaft' },
  { id: 'handel', labelKey: 'worldConsoleTabHandel' },
  { id: 'vergleich', labelKey: 'worldConsoleTabVergleich' },
  { id: 'kontext', labelKey: 'worldConsoleTabKontext' },
]

const TAB_IDS_NO_COUNTRY: ConsoleTabId[] = ['karte', 'uebersicht', 'vergleich']

function GlobalView({
  activeIndicatorLabel,
  ranking,
  stats,
  totalCountries,
}: {
  activeIndicatorLabel: string | undefined
  ranking: WorldRankingRow[] | null
  stats: CountrySidebarProps['globalStats']
  totalCountries: number | undefined
}) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const top5 = (ranking ?? []).slice(0, 5)
  const bot5 = (ranking ?? []).slice(-5).reverse()
  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
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
}: {
  countryDetail: WorldCountryDetail | null
  selectedRow: WorldMapRow | null
  activeIndicator: WorldConsoleActiveIndicator | null
  percentile: number | null
  lowerIsBetter: boolean
  mapYear: number
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

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      <div style={{ marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <MonoLabel>{activeIndicator?.name || t('worldConsoleActiveIndicatorFallback')}</MonoLabel>
          {activeTrend != null && <TrendArrow value={activeTrend} inverted={lowerIsBetter} />}
        </div>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: 40,
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
            <Sparkline data={activeSpark} height={52} showMarkers />
          </div>
        )}
      </div>

      {percentile != null && (
        <div style={{ marginBottom: spacing.lg }}>
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
      )}

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

      <SectionDivider label={t('worldConsoleProfile')} />
      {(
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
      ))}
    </div>
  )
}

function TabDemokratie({ countryDetail }: { countryDetail: WorldCountryDetail | null }) {
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

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
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

      {ldiSeries.length >= 2 && (
        <>
          <SectionDivider label={t('worldConsoleSectionLdiSeries')} />
          <LineChart data={ldiSeries} yLabel={t('worldConsoleLdiYLabel')} height={90} />
        </>
      )}

      <SectionDivider label={t('worldConsoleSectionVdemDims')} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }}>
        <RadarChart axes={radarAxes} />
      </div>

      <SectionDivider label={t('worldConsoleSectionVdemAll')} />
      {bars.map((b, i) => (
        <HBar key={i} label={b.label} value={b.value} max={1} formatted={b.formatted} color={c.red} />
      ))}
    </div>
  )
}

function TabWirtschaft({ countryDetail }: { countryDetail: WorldCountryDetail | null }) {
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

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
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
    </div>
  )
}

function TabHandel({
  tradeData,
  loading,
}: {
  tradeData: WorldTradeResponse | null
  loading: boolean
}) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'

  if (loading) {
    return (
      <div style={{ padding: spacing.lg }}>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          {t('worldConsoleLoadingTrade')}
        </p>
      </div>
    )
  }

  if (!tradeData || (!tradeData.top_exports?.length && !tradeData.top_imports?.length)) {
    return (
      <div style={{ padding: spacing.lg }}>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          {t('worldConsoleNoTrade')}
        </p>
      </div>
    )
  }

  const exports = Number(tradeData.total_export_usd || 0)
  const imports = Number(tradeData.total_import_usd || 0)
  const expBn = exports / 1e9
  const impBn = imports / 1e9

  const topExp = tradeData.top_exports || []
  const topImp = tradeData.top_imports || []
  const maxExp = topExp.length ? Math.max(...topExp.map((x) => Number(x.value_usd))) : 1
  const maxImp = topImp.length ? Math.max(...topImp.map((x) => Number(x.value_usd))) : 1

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      <SectionDivider label={interpolate(t('worldConsoleTradeBalanceYear'), { year: String(tradeData.year) })} />
      <TradeBalance exports={Math.round(expBn)} imports={Math.round(impBn)} currency="Mrd. $" />

      {topExp.length > 0 && (
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
      )}

      {topImp.length > 0 && (
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
      )}
    </div>
  )
}

function TabVergleich({ countryDetail: _countryDetail }: { countryDetail: WorldCountryDetail | null }) {
  const { c, t } = useTheme()
  const [q, setQ] = useState('')

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      <div style={{ marginBottom: spacing.lg }}>
        <MonoLabel style={{ marginBottom: spacing.xs }}>{t('worldConsoleComparePicker')}</MonoLabel>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('worldConsoleCompareSearchPh')}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: `${spacing.sm}px ${spacing.md}px`,
            border: `1px solid ${c.border}`,
            borderRadius: 6,
            background: c.bg,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>
      <div
        style={{
          marginTop: spacing.xl,
          padding: spacing.lg,
          border: `1px dashed ${c.border}`,
          borderRadius: 8,
          textAlign: 'center',
        }}
      >
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, lineHeight: 1.5 }}>
          {t('worldConsoleCompareHint')}
          <br />
          <span style={{ fontStyle: 'italic', fontSize: 12 }}>{t('worldConsoleComparePhase')}</span>
        </p>
      </div>
    </div>
  )
}

function TabKontext({
  countryDetail: _countryDetail,
  articles,
}: {
  countryDetail: WorldCountryDetail | null
  articles?: WorldConsoleArticle[]
}) {
  const { c, t } = useTheme()

  const dataSources = [
    { source: t('worldConsoleSourceWdi'), desc: t('worldConsoleSourceWdiDesc') },
    { source: t('worldConsoleSourceVdem'), desc: t('worldConsoleSourceVdemDesc') },
    { source: t('worldConsoleSourceComtrade'), desc: t('worldConsoleSourceComtradeDesc') },
  ]

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {articles && articles.length > 0 && (
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
      )}

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
  ranking,
  globalStats,
  articles,
  sheetLayout = false,
  onClose,
  onMinimize,
  minimized = false,
  isOpen = true,
  categories,
  activeCategory,
  onCategoryChange,
  activeIndicatorCode,
  onIndicatorCodeChange,
  year,
  onYearChange,
  yearMin,
  yearMax,
}: CountrySidebarProps) {
  const { c, t } = useTheme()
  const [activeTab, setActiveTab] = useState<ConsoleTabId>(() => (iso3 ? 'uebersicht' : 'karte'))
  const prevIsoRef = useRef<string | null>(iso3)

  const hasCountry = !!iso3
  const lowerIsBetter = activeIndicator?.lowerIsBetter || false

  const visibleTabs = useMemo(
    () =>
      hasCountry
        ? TAB_DEF_FULL
        : TAB_DEF_FULL.filter((tab) => TAB_IDS_NO_COUNTRY.includes(tab.id)),
    [hasCountry],
  )

  const visibleTabIds = useMemo(() => visibleTabs.map((x) => x.id), [visibleTabs])

  useEffect(() => {
    const prev = prevIsoRef.current
    prevIsoRef.current = iso3
    if (iso3 && !prev) setActiveTab('uebersicht')
    if (!iso3 && prev) setActiveTab('karte')
  }, [iso3])

  useEffect(() => {
    if (!visibleTabIds.includes(activeTab)) {
      setActiveTab(iso3 ? 'uebersicht' : 'karte')
    }
  }, [iso3, visibleTabIds, activeTab])

  useEffect(() => {
    if (activeTab === 'handel' && hasCountry && !tradeData && !tradeLoading && onLoadTrade && iso3) {
      onLoadTrade(iso3)
    }
  }, [activeTab, hasCountry, iso3, tradeData, tradeLoading, onLoadTrade])

  if (!sheetLayout && minimized) {
    return (
      <aside
        className={`country-sidebar ${isOpen ? 'country-sidebar--open' : ''}`}
        style={
          {
            width: 32,
            flexShrink: 0,
            background: c.cardBg,
            borderLeft: `1px solid ${c.border}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: `${spacing.md}px 0`,
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
            writingMode: 'vertical-rl',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {iso3 || t('worldConsoleWorldStrip')}
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.muted }}>▸</span>
      </aside>
    )
  }

  const content = (() => {
    if (activeTab === 'karte') {
      return (
        <MapControlsPanel
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={onCategoryChange}
          activeIndicator={activeIndicatorCode}
          onIndicatorChange={onIndicatorCodeChange}
          year={year}
          onYearChange={onYearChange}
          yearMin={yearMin}
          yearMax={yearMax}
        />
      )
    }
    if (!hasCountry) {
      if (activeTab === 'uebersicht') {
        return (
          <GlobalView
            activeIndicatorLabel={activeIndicator?.name}
            ranking={ranking}
            stats={globalStats}
            totalCountries={globalStats?.total}
          />
        )
      }
      if (activeTab === 'vergleich') {
        return <TabVergleich countryDetail={countryDetail} />
      }
      return null
    }
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
          />
        )
      case 'demokratie':
        return <TabDemokratie countryDetail={countryDetail} />
      case 'wirtschaft':
        return <TabWirtschaft countryDetail={countryDetail} />
      case 'handel':
        return <TabHandel tradeData={tradeData} loading={tradeLoading} />
      case 'vergleich':
        return <TabVergleich countryDetail={countryDetail} />
      case 'kontext':
        return <TabKontext countryDetail={countryDetail} articles={articles} />
      default:
        return null
    }
  })()

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
    : {
        width: 320,
        flexShrink: 0,
        background: c.cardBg,
        borderLeft: `1px solid ${c.border}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
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
            padding: `${spacing.md}px ${spacing.lg}px ${spacing.sm}px`,
            gap: spacing.sm,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
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

        <div
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: 0,
            borderTop: `1px solid ${c.border}`,
            scrollbarWidth: 'none',
          }}
        >
          {visibleTabs.map((tab) => {
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
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, scrollbarWidth: 'thin' }}>{content}</div>
    </aside>
  )
}
