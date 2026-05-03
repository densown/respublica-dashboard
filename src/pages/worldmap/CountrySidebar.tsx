import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { interpolate } from '../../design-system/i18n'
import CompareBar from '../../design-system/components/CompareBar'
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
import TrendArrow, { trendDirectionFromValues } from '../../design-system/components/TrendArrow'
import { fonts, spacing } from '../../design-system/tokens'
import { iso3ToFlagIso2 } from './worldIso3ToIso2'
import type { WorldCountryDetail, WorldGeoJson, WorldMapRow } from './worldTypes'
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

export type CountrySidebarProps = {
  iso3: string | null
  isOpen: boolean
  onClose: () => void
  sheetLayout: boolean
  geojson: WorldGeoJson | null
  countryName: string
  selectedRow: WorldMapRow | null
  activeIndicatorLabel: string
  activeIndicatorCode: string
  activeIndicatorCategory: string
  mapDisplayYear: number
  activeIndicatorUnitShort: string
  formatIndicatorValue: (v: number | null | undefined) => string
  formatAnyIndicatorValue: (indicatorCode: string, value: number) => string
  countryDetail: WorldCountryDetail | null
  /** Kartendaten für Rang / Globalstatistik (bereits gefilterte Länder) */
  mapData: WorldMapRow[]
  dockCompact: boolean
  onDockCompactChange: (compact: boolean) => void
}

type ConsoleTab =
  | 'overview'
  | 'democracy'
  | 'economy'
  | 'trade'
  | 'compare'
  | 'context'
  | 'global'

function normIso(code: string): string {
  return code.trim().toUpperCase()
}

function lastIndicatorNumeric(
  detail: WorldCountryDetail | null,
  code: string,
): number | null {
  if (!detail?.indicators) return null
  const ind = detail.indicators.find((i) => i.indicator_code === code)
  if (!ind?.values?.length) return null
  const sorted = [...ind.values].sort((a, b) => b.year - a.year)
  for (const row of sorted) {
    if (row.value != null && !Number.isNaN(row.value)) return row.value
  }
  return null
}

function latestObservation(
  ind: WorldCountryDetail['indicators'][number],
): { year: number; value: number } | null {
  if (!ind.values?.length) return null
  const sorted = [...ind.values].sort((a, b) => b.year - a.year)
  for (const row of sorted) {
    if (row.value != null && !Number.isNaN(row.value)) {
      return { year: row.year, value: row.value }
    }
  }
  return null
}

function pickOtherIndicators(
  detail: WorldCountryDetail | null,
  activeCode: string,
  activeCategory: string,
  formatVal: (code: string, v: number) => string,
  limit: number,
): Array<{ name: string; displayValue: string }> {
  if (!detail?.indicators?.length) return []
  type Row = {
    name: string
    displayValue: string
    year: number
    preferOtherCat: boolean
  }
  const rows: Row[] = []
  for (const ind of detail.indicators) {
    if (ind.indicator_code === activeCode) continue
    const obs = latestObservation(ind)
    if (!obs) continue
    const preferOtherCat = Boolean(
      ind.category && ind.category !== activeCategory,
    )
    rows.push({
      name: ind.name,
      displayValue: formatVal(ind.indicator_code, obs.value),
      year: obs.year,
      preferOtherCat,
    })
  }
  rows.sort((a, b) => {
    if (a.preferOtherCat !== b.preferOtherCat) return a.preferOtherCat ? -1 : 1
    if (b.year !== a.year) return b.year - a.year
    return a.name.localeCompare(b.name)
  })
  return rows.slice(0, limit).map(({ name, displayValue }) => ({ name, displayValue }))
}

function formatPopulationStat(v: number | null, lang: string): string {
  if (v == null || Number.isNaN(v)) return '—'
  if (v > 1_000_000) {
    const mio = v / 1_000_000
    const dec = mio >= 100 ? 0 : mio >= 10 ? 1 : 2
    const s = mio.toFixed(dec)
    return lang === 'de' ? `${s.replace('.', ',')} Mio.` : `${s} mil.`
  }
  return Math.round(v).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US')
}

function formatGdpPerCapStat(v: number | null, lang: string): string {
  if (v == null || Number.isNaN(v)) return '—'
  return `${v.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { maximumFractionDigits: 0 })} $`
}

function rankAmongNumericRows(
  rows: WorldMapRow[],
  iso: string,
): { rank: number; total: number } | null {
  const sorted = [...rows]
    .filter((r) => r.value != null && !Number.isNaN(r.value as number))
    .sort((a, b) => (b.value as number) - (a.value as number))
  const u = normIso(iso)
  const idx = sorted.findIndex((r) => normIso(r.country_code) === u)
  if (idx < 0 || !sorted.length) return null
  return { rank: idx + 1, total: sorted.length }
}

function globalIndicatorStats(rows: WorldMapRow[]) {
  const nums = rows.filter(
    (r) => r.value != null && !Number.isNaN(r.value as number),
  ) as Array<WorldMapRow & { value: number }>
  if (!nums.length) return null
  const values = nums.map((r) => r.value).sort((a, b) => a - b)
  const mean = values.reduce((s, x) => s + x, 0) / values.length
  const mid = Math.floor(values.length / 2)
  const median =
    values.length % 2 === 1
      ? values[mid]!
      : (values[mid - 1]! + values[mid]!) / 2
  const top5 = [...nums].sort((a, b) => b.value - a.value).slice(0, 5)
  const bottom5 = [...nums].sort((a, b) => a.value - b.value).slice(0, 5)
  return { mean, median, top5, bottom5, n: nums.length }
}

const TAB_KEYS: Record<Exclude<ConsoleTab, 'global'>, I18nKey> = {
  overview: 'worldConsoleTabOverview',
  democracy: 'worldConsoleTabDemocracy',
  economy: 'worldConsoleTabEconomy',
  trade: 'worldConsoleTabTrade',
  compare: 'worldConsoleTabCompare',
  context: 'worldConsoleTabContext',
}

export function CountrySidebar({
  iso3,
  isOpen,
  onClose,
  sheetLayout,
  geojson,
  countryName,
  selectedRow,
  activeIndicatorLabel,
  activeIndicatorCode,
  activeIndicatorCategory,
  mapDisplayYear,
  activeIndicatorUnitShort,
  formatIndicatorValue,
  formatAnyIndicatorValue,
  countryDetail,
  mapData,
  dockCompact,
  onDockCompactChange,
}: CountrySidebarProps) {
  const { c, t, lang } = useTheme()
  const [activeTab, setActiveTab] = useState<ConsoleTab>('overview')

  useEffect(() => {
    if (!iso3) setActiveTab('global')
    else setActiveTab((t) => (t === 'global' ? 'overview' : t))
  }, [iso3])

  const effectiveTab: ConsoleTab = !iso3 ? 'global' : activeTab

  const iso2 = iso3 ? iso3ToFlagIso2(iso3, geojson) : null
  const flagUrl = iso2 ? `https://flagcdn.com/w40/${iso2}.png` : null

  const regionLabel = countryDetail?.region ?? '—'
  const incomeDisplay =
    countryDetail?.income_level ?? selectedRow?.income_level ?? '—'

  const populationDisplay = useMemo(() => {
    const v = lastIndicatorNumeric(countryDetail, 'SP.POP.TOTL')
    return formatPopulationStat(v, lang)
  }, [countryDetail, lang])

  const gdpPerCapDisplay = useMemo(() => {
    const v = lastIndicatorNumeric(countryDetail, 'NY.GDP.PCAP.CD')
    return formatGdpPerCapStat(v, lang)
  }, [countryDetail, lang])

  const activeValue = useMemo(() => {
    const rv = selectedRow?.value
    if (rv != null && !Number.isNaN(rv as number)) {
      return formatIndicatorValue(rv)
    }
    const ind = countryDetail?.indicators?.find(
      (i) => i.indicator_code === activeIndicatorCode,
    )
    const vals = ind?.values
    const last = vals?.length ? vals[vals.length - 1]?.value : undefined
    return last != null ? formatIndicatorValue(last) : '—'
  }, [
    selectedRow,
    countryDetail,
    activeIndicatorCode,
    formatIndicatorValue,
  ])

  const sparklinePoints = useMemo(() => {
    if (!countryDetail?.indicators) return [] as { value: number; year?: number }[]
    const ind = countryDetail.indicators.find(
      (i) => i.indicator_code === activeIndicatorCode,
    )
    if (!ind?.values?.length) return []
    const sorted = [...ind.values].sort((a, b) => a.year - b.year)
    return sorted
      .filter((x) => x.value != null && !Number.isNaN(x.value as number))
      .map((x) => ({ value: x.value as number, year: x.year }))
  }, [countryDetail, activeIndicatorCode])

  const rankInfo = useMemo(() => {
    if (!iso3) return null
    return rankAmongNumericRows(mapData, iso3)
  }, [iso3, mapData])

  const percentileFraction = useMemo(() => {
    if (!rankInfo || rankInfo.total < 1) return null
    return (rankInfo.total - rankInfo.rank + 1) / rankInfo.total
  }, [rankInfo])

  const trendPair = useMemo(() => {
    if (sparklinePoints.length < 2) return null
    const a = sparklinePoints[sparklinePoints.length - 2]!.value
    const b = sparklinePoints[sparklinePoints.length - 1]!.value
    return { older: a, newer: b }
  }, [sparklinePoints])

  const otherIndicators = useMemo(
    () =>
      pickOtherIndicators(
        countryDetail,
        activeIndicatorCode,
        activeIndicatorCategory,
        formatAnyIndicatorValue,
        4,
      ),
    [
      countryDetail,
      activeIndicatorCode,
      activeIndicatorCategory,
      formatAnyIndicatorValue,
    ],
  )

  const otherSlots = useMemo(() => {
    const out = [...otherIndicators]
    while (out.length < 4) {
      out.push({ name: '', displayValue: '—' })
    }
    return out.slice(0, 4)
  }, [otherIndicators])

  const unitYearLine = useMemo(() => {
    const u = activeIndicatorUnitShort.trim()
    if (u) return `${u} · ${mapDisplayYear}`
    return String(mapDisplayYear)
  }, [activeIndicatorUnitShort, mapDisplayYear])

  const globalStats = useMemo(() => globalIndicatorStats(mapData), [mapData])

  const vdemRadarAxes = useMemo(() => {
    if (!countryDetail?.indicators) return []
    const raw: { key: (typeof VDEM_CODES)[number]; v: number }[] = []
    for (const code of VDEM_CODES) {
      const ind = countryDetail.indicators.find((i) => i.indicator_code === code)
      const obs = ind ? latestObservation(ind) : null
      if (obs) raw.push({ key: code, v: obs.value })
    }
    if (raw.length < 3) return []
    const vals = raw.map((r) => {
      let x = r.v
      if (r.key === 'v2x_corr') x = Math.max(0, Math.min(1, 1 - x))
      else x = Math.max(0, Math.min(1, x))
      return x
    })
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const span = hi - lo || 1
    return raw.map((r, i) => ({
      key: r.key,
      label: t(VDEM_I18N[r.key]),
      value: (vals[i]! - lo) / span,
    }))
  }, [countryDetail, t])

  const vdemLibSeries = useMemo(() => {
    if (!countryDetail?.indicators) return [] as { x: number; y: number }[]
    const ind = countryDetail.indicators.find((i) => i.indicator_code === 'v2x_libdem')
    if (!ind?.values?.length) return []
    return [...ind.values]
      .filter((x) => x.value != null && !Number.isNaN(x.value as number))
      .sort((a, b) => a.year - b.year)
      .map((x) => ({ x: x.year, y: x.value as number }))
  }, [countryDetail])

  const tabBtnStyle = useCallback(
    (active: boolean): CSSProperties => ({
      flexShrink: 0,
      minHeight: 44,
      padding: `0 ${spacing.sm}px`,
      borderRadius: 6,
      border: `1px solid ${active ? c.red : c.border}`,
      background: active ? `${c.red}18` : c.cardBg,
      color: active ? c.red : c.text,
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }),
    [c.border, c.cardBg, c.red, c.text],
  )

  const renderDummyTab = () => (
    <div style={{ paddingTop: spacing.md }}>
      <MonoLabel muted>{t('worldConsolePhase2Placeholder')}</MonoLabel>
      <SectionDivider />
      <HBar
        rows={[
          { label: 'GDP (dummy)', value: 72 },
          { label: 'Export (dummy)', value: 54 },
          { label: 'FDI (dummy)', value: 38 },
        ]}
      />
    </div>
  )

  const renderOverview = () => (
    <div style={{ paddingTop: spacing.sm }}>
      <MonoLabel muted>{activeIndicatorLabel}</MonoLabel>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: spacing.sm,
          marginTop: 4,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 36,
            fontWeight: 700,
            color: c.text,
            lineHeight: 1,
            wordBreak: 'break-word',
          }}
        >
          {activeValue}
        </p>
        {trendPair ? (
          <TrendArrow
            direction={trendDirectionFromValues(trendPair.older, trendPair.newer)}
          />
        ) : null}
      </div>
      <p
        style={{
          margin: `${spacing.sm}px 0 0`,
          fontFamily: fonts.body,
          fontSize: 13,
          color: c.muted,
          lineHeight: 1.35,
        }}
      >
        {unitYearLine}
      </p>

      {sparklinePoints.length > 1 ? (
        <div style={{ marginTop: spacing.md }}>
          <Sparkline points={sparklinePoints} height={48} showPeakTrough />
        </div>
      ) : null}

      {percentileFraction != null && rankInfo ? (
        <div style={{ marginTop: spacing.lg }}>
          <MonoLabel muted>{t('worldConsolePercentileTitle')}</MonoLabel>
          <div style={{ marginTop: 8 }}>
            <PercentileBar
              fraction={percentileFraction}
              caption={interpolate(t('worldConsolePercentileRank'), {
                rank: rankInfo.rank,
                total: rankInfo.total,
              })}
            />
          </div>
        </div>
      ) : null}

      <section style={{ paddingTop: spacing.lg }}>
        <MonoLabel muted>{t('worldSidebarCoreTitle')}</MonoLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: spacing.sm,
            marginTop: spacing.sm,
          }}
        >
          <StatTile label={t('worldSidebarStatRegion')} value={regionLabel} valueTitle={regionLabel} />
          <StatTile label={t('worldSidebarStatPopulation')} value={populationDisplay} />
          <StatTile label={t('worldSidebarStatGdpPc')} value={gdpPerCapDisplay} />
          <StatTile
            label={t('worldSidebarStatIncomeLevel')}
            value={incomeDisplay}
            valueTitle={incomeDisplay}
          />
        </div>
      </section>

      <section style={{ paddingTop: spacing.lg }}>
        <MonoLabel muted>{t('worldSidebarMoreIndicatorsTitle')}</MonoLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: spacing.sm,
            marginTop: spacing.sm,
          }}
        >
          {otherSlots.map((slot, i) => (
            <StatTile
              key={`${slot.name}-${i}`}
              label={slot.name || t('worldSidebarMetricPending')}
              value={slot.displayValue}
            />
          ))}
        </div>
      </section>

      <div style={{ marginTop: spacing.md }}>
        <InfoToggle summary={t('worldSidebarSourcesLine')} toggleLabel={t('worldSidebarMoreTitle')}>
          {t('worldSidebarMorePlaceholder')}
        </InfoToggle>
      </div>
    </div>
  )

  const renderDemocracy = () => (
    <div style={{ paddingTop: spacing.sm }}>
      {vdemRadarAxes.length >= 3 ? (
        <>
          <MonoLabel muted>{t('worldConsoleDemocracyRadarTitle')}</MonoLabel>
          <div style={{ marginTop: spacing.sm }}>
            <RadarChart axes={vdemRadarAxes} size={220} />
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontFamily: fonts.body, fontSize: 13, color: c.muted }}>
          {t('worldConsoleDemocracyNoData')}
        </p>
      )}
      {vdemLibSeries.length > 1 ? (
        <div style={{ marginTop: spacing.lg }}>
          <MonoLabel muted>{t('worldConsoleDemocracyLineTitle')}</MonoLabel>
          <div style={{ marginTop: spacing.sm, overflowX: 'auto' }}>
            <LineChart data={vdemLibSeries} width={260} height={120} />
          </div>
        </div>
      ) : null}
    </div>
  )

  const renderGlobal = () => (
    <div style={{ paddingTop: spacing.sm }}>
      <MonoLabel muted>{activeIndicatorLabel}</MonoLabel>
      <p
        style={{
          margin: `${spacing.xs}px 0 0`,
          fontFamily: fonts.body,
          fontSize: 13,
          color: c.muted,
        }}
      >
        {unitYearLine}
      </p>
      {!globalStats ? (
        <p style={{ marginTop: spacing.md, color: c.muted }}>{t('worldNoValue')}</p>
      ) : (
        <>
          <p style={{ marginTop: spacing.sm, fontFamily: fonts.mono, fontSize: 11, color: c.muted }}>
            {interpolate(t('worldConsoleGlobalN'), { n: globalStats.n })}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: spacing.sm,
              marginTop: spacing.md,
            }}
          >
            <StatTile
              label={t('worldConsoleGlobalMedian')}
              value={formatIndicatorValue(globalStats.median)}
            />
            <StatTile
              label={t('worldConsoleGlobalMean')}
              value={formatIndicatorValue(globalStats.mean)}
            />
          </div>
          <SectionDivider />
          <MonoLabel muted>{t('worldConsoleGlobalTop5')}</MonoLabel>
          <div style={{ marginTop: spacing.sm }}>
            <HBar
              rows={globalStats.top5.map((r) => ({
                label: r.country_name ?? r.country_code,
                value: r.value,
                valueLabel: formatIndicatorValue(r.value),
              }))}
            />
          </div>
          <SectionDivider />
          <MonoLabel muted>{t('worldConsoleGlobalBottom5')}</MonoLabel>
          <div style={{ marginTop: spacing.sm }}>
            <HBar
              rows={globalStats.bottom5.map((r) => ({
                label: r.country_name ?? r.country_code,
                value: r.value,
                valueLabel: formatIndicatorValue(r.value),
              }))}
            />
          </div>
        </>
      )}
    </div>
  )

  const renderActiveBody = () => {
    switch (effectiveTab) {
      case 'global':
        return renderGlobal()
      case 'overview':
        return renderOverview()
      case 'democracy':
        return renderDemocracy()
      case 'economy':
        return renderDummyTab()
      case 'trade':
        return (
          <div style={{ paddingTop: spacing.md }}>
            <TradeBalance
              exportLabel={t('worldWidgetExportLabel')}
              importLabel={t('worldWidgetImportLabel')}
              exportValue={42}
              importValue={38}
              unit=""
            />
            <SectionDivider />
            <MonoLabel muted>{t('worldConsolePhase2Placeholder')}</MonoLabel>
          </div>
        )
      case 'compare':
        return (
          <div style={{ paddingTop: spacing.md }}>
            <CompareBar
              pairs={[
                { label: t('worldCompareCountryA'), a: 62, b: 48, aLabel: 'A', bLabel: 'B' },
                { label: t('worldCompareCountryB'), a: 55, b: 71, aLabel: 'A', bLabel: 'B' },
              ]}
            />
            <SectionDivider />
            {renderDummyTab()}
          </div>
        )
      case 'context':
      default:
        return renderDummyTab()
    }
  }

  const headerBlock = (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingBottom: spacing.md,
        borderBottom: `1px solid ${c.border}`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0,
          flex: 1,
        }}
      >
        {flagUrl ? (
          <img
            src={flagUrl}
            width={40}
            height={28}
            alt=""
            style={{
              width: 40,
              height: 28,
              borderRadius: 4,
              objectFit: 'cover',
              border: `1px solid ${c.border}`,
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 28,
              borderRadius: 4,
              background: c.bgHover,
              border: `1px solid ${c.border}`,
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <MonoLabel muted>
            {iso3 ? t('worldSidebarProfile') : t('worldConsoleTabGlobal')}
            {iso3 ? (
              <>
                {' '}
                <span style={{ color: c.subtle }}>·</span> {iso3}
              </>
            ) : null}
          </MonoLabel>
        </div>
      </div>
      <div style={{ display: 'flex', gap: spacing.xs, flexShrink: 0 }}>
        {!sheetLayout && isOpen ? (
          <button
            type="button"
            onClick={() => onDockCompactChange(!dockCompact)}
            aria-label={
              dockCompact ? t('worldConsoleExpandDock') : t('worldConsoleCollapseDock')
            }
            style={{
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: `1px solid ${c.border}`,
              background: c.cardBg,
              color: c.text,
              cursor: 'pointer',
              fontFamily: fonts.mono,
              fontSize: '1rem',
            }}
          >
            {dockCompact ? '»' : '«'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('worldSidebarClose')}
          style={{
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.cardBg,
            color: c.text,
            cursor: 'pointer',
            flexShrink: 0,
            fontFamily: fonts.mono,
            fontSize: '1.1rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </header>
  )

  const titleBlock =
    iso3 && !dockCompact ? (
      <div style={{ paddingTop: spacing.md, flexShrink: 0 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 26,
            fontWeight: 700,
            color: c.text,
            lineHeight: 1.15,
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <span style={{ minWidth: 0 }}>{countryName}</span>
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: c.red,
              flexShrink: 0,
              position: 'relative',
              top: 2,
            }}
          />
        </h2>
      </div>
    ) : !iso3 && !dockCompact ? (
      <div style={{ paddingTop: spacing.md, flexShrink: 0 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 22,
            fontWeight: 700,
            color: c.text,
          }}
        >
          {t('worldConsoleGlobalTitle')}
        </h2>
      </div>
    ) : null

  const tabBar =
    !dockCompact && isOpen ? (
      <div
        role="tablist"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: spacing.xs,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: `${spacing.sm}px 0`,
          borderBottom: `1px solid ${c.border}`,
          flexShrink: 0,
        }}
      >
        {(iso3
          ? (['overview', 'democracy', 'economy', 'trade', 'compare', 'context'] as const)
          : (['global'] as const)
        ).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            style={tabBtnStyle(activeTab === tab)}
          >
            {tab === 'global' ? t('worldConsoleTabGlobal') : t(TAB_KEYS[tab])}
          </button>
        ))}
      </div>
    ) : null

  const bodyScroll = !dockCompact && isOpen ? (
    <div
      role="tabpanel"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        paddingTop: spacing.sm,
      }}
    >
      {renderActiveBody()}
    </div>
  ) : null

  const inner = (
    <div className="country-sidebar__panel">
      {headerBlock}
      {titleBlock}
      {tabBar}
      {bodyScroll}
      {!dockCompact && isOpen ? (
        <footer style={{ marginTop: 'auto', paddingTop: spacing.lg, flexShrink: 0 }}>
          <a
            href="https://respublica.media"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: fonts.body,
              fontSize: 13,
              color: c.muted,
              textDecoration: 'none',
            }}
          >
            <span>{t('worldSidebarSourcesLine')}</span>
            <span style={{ fontFamily: fonts.mono, color: c.red }} aria-hidden>
              →
            </span>
          </a>
        </footer>
      ) : null}
    </div>
  )

  const stripOnly = !sheetLayout && dockCompact && isOpen

  const stripInner = stripOnly ? (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        paddingTop: spacing.sm,
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        onClick={() => onDockCompactChange(false)}
        aria-label={t('worldConsoleExpandDock')}
        style={{
          width: 32,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: c.bgHover,
          color: c.text,
          cursor: 'pointer',
          borderRadius: 6,
          fontFamily: fonts.mono,
          fontSize: '1rem',
        }}
      >
        »
      </button>
    </div>
  ) : null

  const showBody = isOpen

  const asideStyle: CSSProperties = sheetLayout
    ? {
        background: c.cardBg,
        color: c.text,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        padding: spacing.lg,
        pointerEvents: isOpen ? 'auto' : 'none',
      }
    : {
        background: c.cardBg,
        color: c.text,
        borderLeft: isOpen ? `1px solid ${c.border}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, padding 0.2s ease',
        width: isOpen ? '100%' : 0,
        flexShrink: 0,
        padding: isOpen ? (dockCompact ? spacing.xs : spacing.lg) : 0,
      }

  return (
    <aside
      className={`country-sidebar ${sheetLayout ? 'country-sidebar--sheet' : ''} ${isOpen ? 'country-sidebar--open' : ''} ${stripOnly ? 'country-sidebar--compact' : ''}`}
      style={asideStyle}
      aria-hidden={!isOpen}
    >
      {isOpen && stripOnly ? (
        stripInner
      ) : showBody ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {inner}
        </div>
      ) : null}
    </aside>
  )
}
