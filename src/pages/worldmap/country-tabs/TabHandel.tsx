import { useEffect, useMemo, useState } from 'react'
import HBar from '../../../design-system/components/HBar'
import HSSectionBreakdown from '../../../design-system/components/HSSectionBreakdown'
import MultiLineChart from '../../../design-system/components/MultiLineChart'
import SectionDivider from '../../../design-system/components/SectionDivider'
import StatTile from '../../../design-system/components/StatTile'
import StackedAreaChart from '../../../design-system/components/StackedAreaChart'
import TradeBalance from '../../../design-system/components/TradeBalance'
import ViewToggle, {
  type TradeTimeseriesView,
  type ViewToggleValue,
} from '../../../design-system/components/ViewToggle'
import BalanceBarChart from '../../../design-system/components/BalanceBarChart'
import { useTheme } from '../../../design-system'
import { interpolate } from '../../../design-system/i18n'
import { fonts, spacing } from '../../../design-system/tokens'
import { fmtNumber, fmtUsd } from '../worldConsoleHelpers'
import { normIso3 } from './helpers'
import type { WorldTradeResponse, WorldTradeTimeseriesResponse } from '../worldTypes'
import type { ConsoleTabLayoutDirection } from '../CountrySidebar'

export function TabHandel({
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
          const raw = iso?.trim()
          const p: string | null = raw ? normIso3(raw).slice(0, 3) : null
          if (p !== null && p.length !== 3) return
          setSelectedPartner(p)
          setUserOverrodePartner(true)
          onLoadTrade(iso3, p)
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
