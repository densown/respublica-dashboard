import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { fonts, spacing } from '../../design-system/tokens'
import type {
  ClimateResponse,
  CountrySelection,
  DockPosition,
  WorldCountryDetail,
  WorldGeoJson,
  WorldMapRow,
  WorldRankingRow,
  WorldTradeResponse,
  WorldTradeTimeseriesResponse,
} from './worldTypes'
import { GlobalView } from './country-tabs/GlobalView'
import { TabDemokratie } from './country-tabs/TabDemokratie'
import { TabHandel } from './country-tabs/TabHandel'
import { TabKlima } from './country-tabs/TabKlima'
import { TabKontext } from './country-tabs/TabKontext'
import { TabUebersicht } from './country-tabs/TabUebersicht'
import { TabVergleich } from './country-tabs/TabVergleich'
import { TabWirtschaft } from './country-tabs/TabWirtschaft'
import './countrySidebar.css'

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
  climateData: Map<string, ClimateResponse>
  climateLoading: boolean
  onLoadClimate: (iso3: string) => void
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
  | 'klima'
  | 'vergleich'
  | 'kontext'

const TAB_DEF: { id: ConsoleTabId; labelKey: I18nKey }[] = [
  { id: 'uebersicht', labelKey: 'worldConsoleTabUebersicht' },
  { id: 'demokratie', labelKey: 'worldConsoleTabDemokratie' },
  { id: 'wirtschaft', labelKey: 'worldConsoleTabWirtschaft' },
  { id: 'handel', labelKey: 'worldConsoleTabHandel' },
  { id: 'klima', labelKey: 'worldConsoleTabKlima' },
  { id: 'vergleich', labelKey: 'worldConsoleTabVergleich' },
  { id: 'kontext', labelKey: 'worldConsoleTabKontext' },
]

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
  climateData,
  climateLoading,
  onLoadClimate,
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

  // Lazy-Load der Klimadaten, sobald der Klima-Tab aktiv wird (analog Trade).
  useEffect(() => {
    if (activeTab !== 'klima' || !hasCountry || !iso3) return
    if (onLoadClimate && !climateData.has(iso3) && !climateLoading) {
      onLoadClimate(iso3)
    }
  }, [activeTab, hasCountry, iso3, onLoadClimate, climateData, climateLoading])

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
        case 'klima':
          return (
            <TabKlima
              climate={iso3 ? climateData.get(iso3) ?? null : null}
              loading={climateLoading}
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
                // In jedem Layout horizontal scrollen statt umbrechen/abschneiden,
                // wenn die Reiter (inkl. KLIMA) nicht in eine Zeile passen. Buttons
                // sind flexShrink:0 + nowrap, daher kein Schrumpfen/Umbruch.
                flexWrap: 'nowrap',
                overflowX: 'auto',
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
          // Inhaltsbereich immer vertikal scrollbar, damit lange Tabs (z.B. Klima
          // mit fünf Sektionen) im Bottom-Sheet/Bottom-Dock erreichbar bleiben.
          // Horizontal nur in der Spalten-Anordnung (dock=bottom) unterbinden;
          // die vertikalen Layouts behalten ihr bisheriges overflow:auto.
          overflowX: layoutDirection === 'horizontal' ? 'hidden' : 'auto',
          overflowY: 'auto',
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
