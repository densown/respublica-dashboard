import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type { LngLat } from 'maplibre-gl'
import { useTheme } from '../design-system'
import type { I18nKey } from '../design-system/i18n'
import type { Lang } from '../design-system/ThemeContext'
import { breakpoints, fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { isRealCountry } from '../utils/worldFilters'
import { useDebouncedValue } from './elections/useDebouncedValue'
import { countryPercentileFromMapRows } from './worldmap/worldConsoleHelpers'
import { CountrySidebar, type WorldConsoleActiveIndicator } from './worldmap/CountrySidebar'
import {
  WidgetDashboard,
  type WidgetDashboardHandle,
} from './worldmap/WidgetDashboard'
import { WorldGlMap } from './worldmap/WorldGlMap'
import { WorldMapLegend } from './worldmap/WorldMapLegend'
import { worldApiUrl } from './worldmap/worldMapData'
import type {
  WorldCategoryApi,
  WorldCountryDetail,
  WorldGeoJson,
  WorldMapRow,
  WorldRankingRow,
  WorldStats,
  WorldTradeResponse,
} from './worldmap/worldTypes'
import {
  formatWorldIndicatorValue,
  shortenWorldUnit,
} from './worldmap/worldValueFormat'

function categoryAndUnitForIndicator(
  categories: WorldCategoryApi[] | null,
  code: string,
): { category: string; unit: string | null; indicatorName: string } {
  if (!categories) return { category: 'economy', unit: null, indicatorName: code }
  for (const cat of categories) {
    const hit = cat.indicators.find((i) => i.code === code)
    if (hit) return { category: cat.id, unit: hit.unit, indicatorName: hit.name }
  }
  return { category: 'economy', unit: null, indicatorName: code }
}

function normIso(code: string): string {
  return code.trim().toUpperCase()
}

const WORLD_CAT_I18N: Record<string, I18nKey> = {
  population: 'worldCat_population',
  economy: 'worldCat_economy',
  health: 'worldCat_health',
  education: 'worldCat_education',
  governance: 'worldCat_governance',
  trade: 'worldCat_trade',
  military: 'worldCat_military',
  security: 'worldCat_security',
  technology: 'worldCat_technology',
  environment: 'worldCat_environment',
  inequality: 'worldCat_inequality',
}

function worldCategoryLabel(id: string, t: (key: I18nKey) => string): string {
  const k = WORLD_CAT_I18N[id]
  return k ? t(k) : id
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
    fontSize: '0.86rem',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  }
}

/** Indikatoren bei denen niedrigere Werte „besser“ sind (Perzentil / Trend) */
const LOWER_IS_BETTER_INDICATORS = new Set<string>([
  'SI.POV.GINI',
  'FP.CPI.TOTL.ZG',
  'SL.UEM.TOTL.ZS',
  'v2x_corr',
])

export default function WorldMap() {
  const { c, t, lang, theme } = useTheme()
  const isDark = theme === 'dark'
  const geoRef = useRef<WorldGeoJson | null>(null)
  const [geojson, setGeojson] = useState<WorldGeoJson | null>(null)
  const [geoErr, setGeoErr] = useState(false)

  const [categoryId, setCategoryId] = useState('')
  const [indicatorCode, setIndicatorCode] = useState('NY.GDP.PCAP.CD')
  const [year, setYear] = useState(2023)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCompact, setSidebarCompact] = useState(false)
  const [countryDetail, setCountryDetail] = useState<WorldCountryDetail | null>(null)
  const [tradeData, setTradeData] = useState<WorldTradeResponse | null>(null)
  const [tradeLoading, setTradeLoading] = useState(false)
  const [consoleRanking, setConsoleRanking] = useState<WorldRankingRow[] | null>(null)
  const [mapContextMenu, setMapContextMenu] = useState<{
    iso3: string
    x: number
    y: number
  } | null>(null)
  const widgetDashboardRef = useRef<WidgetDashboardHandle | null>(null)
  const mapContextMenuRef = useRef<HTMLDivElement | null>(null)

  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoints.mobile : false,
  )

  useEffect(() => {
    const onR = () => setNarrow(window.innerWidth < breakpoints.mobile)
    onR()
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  useEffect(() => {
    if (!selectedCountry) {
      setCountryDetail(null)
      return
    }
    let cancelled = false
    const url = worldApiUrl(
      `/api/world/country/${encodeURIComponent(selectedCountry)}`,
    )
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<WorldCountryDetail>
      })
      .then((data) => {
        if (!cancelled) setCountryDetail(data)
      })
      .catch(() => {
        if (!cancelled) setCountryDetail(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedCountry])

  useEffect(() => {
    setTradeData(null)
  }, [selectedCountry])

  useEffect(() => {
    if (geoRef.current) {
      setGeojson(geoRef.current)
      return
    }
    let cancelled = false
    const base = import.meta.env.BASE_URL
    const geoUrl =
      base === '/'
        ? '/data/world.geojson'
        : `${base.replace(/\/$/, '')}/data/world.geojson`

    fetch(geoUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON HTTP ${r.status}`)
        return r.json() as Promise<WorldGeoJson>
      })
      .then((data) => {
        if (cancelled) return
        geoRef.current = data
        setGeojson(data)
        setGeoErr(false)
      })
      .catch(() => {
        if (!cancelled) setGeoErr(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const { data: categories } = useApi<WorldCategoryApi[]>('/api/world/categories')
  const { data: stats } = useApi<WorldStats>('/api/world/stats')

  useEffect(() => {
    if (!categories?.length) return
    if (!categoryId || !categories.some((x) => x.id === categoryId)) {
      setCategoryId(categories[0]!.id)
    }
  }, [categories, categoryId])

  useEffect(() => {
    const yr = stats?.years_range
    if (!yr) return
    if (year > yr.max || year < yr.min) setYear(yr.max)
  }, [stats, year])

  const debInd = useDebouncedValue(indicatorCode, 280)
  const debYear = useDebouncedValue(year, 280)

  const yrRange = stats?.years_range
  const [mapFallbackSteps, setMapFallbackSteps] = useState(0)

  useEffect(() => {
    setMapFallbackSteps(0)
  }, [debInd, debYear])

  const mapQueryYear = useMemo(() => {
    if (!yrRange) return debYear
    return Math.max(yrRange.min, debYear - mapFallbackSteps)
  }, [debYear, mapFallbackSteps, yrRange])

  const mapEp = debInd
    ? `/api/world/map?indicator=${encodeURIComponent(debInd)}&year=${String(mapQueryYear)}`
    : ''
  const { data: mapRows, loading: mapLoading, error: mapError } =
    useApi<WorldMapRow[]>(mapEp)

  const mapRowsCountries = useMemo(
    () => (mapRows ?? []).filter(isRealCountry),
    [mapRows],
  )

  const mapHasNumericData = useMemo(
    () =>
      mapRowsCountries.some(
        (r) => r.value != null && !Number.isNaN(r.value as number),
      ),
    [mapRowsCountries],
  )

  useEffect(() => {
    if (!debInd) return
    if (mapLoading) return
    if (mapError) return
    if (!yrRange) return
    if (mapHasNumericData) return
    if (mapFallbackSteps >= 5) return
    const curQy = Math.max(yrRange.min, debYear - mapFallbackSteps)
    const nextQy = Math.max(yrRange.min, debYear - mapFallbackSteps - 1)
    if (nextQy >= curQy) return
    setMapFallbackSteps((s) => s + 1)
  }, [
    debInd,
    debYear,
    mapRows,
    mapLoading,
    mapError,
    mapFallbackSteps,
    yrRange,
    mapHasNumericData,
  ])

  const showYearFallbackHint =
    mapFallbackSteps > 0 &&
    mapHasNumericData &&
    mapQueryYear !== debYear

  const { category, unit, indicatorName } = useMemo(
    () => categoryAndUnitForIndicator(categories, indicatorCode),
    [categories, indicatorCode],
  )

  const fmtCtx = useMemo(
    () => ({
      indicatorCode,
      category,
      unit,
      lang: lang as Lang,
    }),
    [indicatorCode, category, unit, lang],
  )

  const formatValue = useMemo(() => {
    return (v: number | null | undefined) => {
      if (v == null || Number.isNaN(v)) return '—'
      return formatWorldIndicatorValue(v, fmtCtx)
    }
  }, [fmtCtx])

  const unitShort = useMemo(
    () => shortenWorldUnit(unit, lang as Lang),
    [unit, lang],
  )

  const nameByIso = useMemo(() => {
    const m = new Map<string, string>()
    if (!geojson) return m
    for (const f of geojson.features) {
      const iso = f.properties.iso3?.toUpperCase()
      if (iso) m.set(iso, f.properties.name)
    }
    return m
  }, [geojson])

  const { minV, maxV } = useMemo(() => {
    const rows = mapRowsCountries.filter(
      (r) => r.value != null && !Number.isNaN(r.value as number),
    )
    if (!rows.length) {
      return { minV: 0, maxV: 1 }
    }
    let hi = rows[0]!
    let lo = rows[0]!
    for (const r of rows) {
      const v = r.value as number
      if (v > (hi.value as number)) hi = r
      if (v < (lo.value as number)) lo = r
    }
    const min = lo.value as number
    const max = hi.value as number
    return {
      minV: min,
      maxV: max === min ? min + 1e-9 : max,
    }
  }, [mapRowsCountries])

  const selectedRow = useMemo(() => {
    if (!selectedCountry) return null
    const u = normIso(selectedCountry)
    return mapRowsCountries.find((r) => normIso(r.country_code) === u) ?? null
  }, [mapRowsCountries, selectedCountry])

  useEffect(() => {
    if (selectedCountry) {
      setConsoleRanking(null)
      return
    }
    if (!debInd) return
    let cancelled = false
    const url = worldApiUrl(
      `/api/world/ranking?indicator=${encodeURIComponent(debInd)}&year=${String(mapQueryYear)}&limit=200&order=desc`,
    )
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<WorldRankingRow[]>
      })
      .then((raw) => {
        if (cancelled) return
        const list = (raw ?? []).filter(isRealCountry)
        setConsoleRanking(list.length ? list : null)
      })
      .catch(() => {
        if (!cancelled) setConsoleRanking(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedCountry, debInd, mapQueryYear])

  const consoleGlobalStats = useMemo(() => {
    const rows = consoleRanking
    if (!rows?.length) return null
    const vals = rows
      .map((r) => r.value)
      .filter((v) => v != null && !Number.isNaN(v as number)) as number[]
    if (!vals.length) return null
    vals.sort((a, b) => a - b)
    const mean = vals.reduce((s, x) => s + x, 0) / vals.length
    const mid = Math.floor(vals.length / 2)
    const median =
      vals.length % 2 === 1 ? vals[mid]! : (vals[mid - 1]! + vals[mid]!) / 2
    return { median, mean, total: vals.length }
  }, [consoleRanking])

  const worldConsoleActiveIndicator: WorldConsoleActiveIndicator = useMemo(
    () => ({
      code: indicatorCode,
      name: indicatorName,
      category,
      lowerIsBetter: LOWER_IS_BETTER_INDICATORS.has(indicatorCode),
    }),
    [indicatorCode, indicatorName, category],
  )

  const sidebarPercentile = useMemo(() => {
    if (!selectedCountry) return null
    return countryPercentileFromMapRows(selectedCountry, mapRowsCountries)
  }, [selectedCountry, mapRowsCountries])

  const loadTrade = useCallback(
    (iso3: string) => {
      setTradeLoading(true)
      const url = worldApiUrl(
        `/api/world/trade/${encodeURIComponent(iso3)}?year=${String(mapQueryYear)}`,
      )
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status))
          return r.json() as Promise<WorldTradeResponse>
        })
        .then((d) => setTradeData(d))
        .catch(() => setTradeData(null))
        .finally(() => setTradeLoading(false))
    },
    [mapQueryYear],
  )

  const onSelectCountry = useCallback((iso3: string) => {
    setSelectedCountry(iso3.trim().toUpperCase())
    setSidebarOpen(true)
  }, [])

  const onCountryContextMenu = useCallback(
    (_iso3: string, _lngLat: LngLat, clientX: number, clientY: number) => {
      setMapContextMenu({
        iso3: _iso3.trim().toUpperCase(),
        x: clientX,
        y: clientY,
      })
    },
    [],
  )

  useEffect(() => {
    if (!mapContextMenu) return
    const onDocMouseDown = (e: MouseEvent) => {
      if (mapContextMenuRef.current?.contains(e.target as Node)) return
      setMapContextMenu(null)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [mapContextMenu])

  useEffect(() => {
    if (!mapContextMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMapContextMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mapContextMenu])

  const onCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
    setSidebarCompact(false)
  }, [])

  const stepYear = useCallback(
    (delta: number) => {
      const yr = stats?.years_range
      if (!yr) return
      setYear((y) => Math.min(yr.max, Math.max(yr.min, y + delta)))
    },
    [stats],
  )

  const pillBase = useCallback(
    (active: boolean): CSSProperties => ({
      minHeight: 44,
      padding: `0 ${spacing.md}px`,
      borderRadius: 999,
      border: `1px solid ${active ? c.red : c.border}`,
      background: active ? `${c.red}14` : c.cardBg,
      color: active ? c.red : c.text,
      fontFamily: fonts.mono,
      fontSize: '0.68rem',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }),
    [c.border, c.cardBg, c.red, c.text],
  )

  const stepBtnStyle: CSSProperties = useMemo(
    () => ({
      minWidth: 44,
      minHeight: 44,
      borderRadius: 8,
      border: `1px solid ${c.border}`,
      background: c.cardBg,
      color: c.text,
      fontFamily: fonts.mono,
      fontSize: '1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    [c.border, c.cardBg, c.text],
  )

  const yr = stats?.years_range

  const mapSlot = useMemo(
    () => (
      <div
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {geoErr && (
          <p
            style={{
              position: 'absolute',
              top: spacing.sm,
              left: spacing.md,
              right: spacing.md,
              zIndex: 25,
              margin: 0,
              padding: spacing.sm,
              borderRadius: 8,
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              color: c.red,
              fontFamily: fonts.body,
              fontSize: '0.88rem',
            }}
          >
            {t('dataLoadError')} (world.geojson)
          </p>
        )}

        <div
          style={{
            position: 'absolute',
            top: spacing.md,
            left: spacing.md,
            right: spacing.md,
            zIndex: 20,
            maxWidth: narrow ? 'none' : 'min(960px, calc(100% - 16px))',
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.sm,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              gap: spacing.xs,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 2,
              pointerEvents: 'auto',
            }}
          >
            {(categories ?? []).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoryId(cat.id)
                  const first = cat.indicators[0]?.code
                  if (first) setIndicatorCode(first)
                }}
                style={pillBase(categoryId === cat.id)}
              >
                {worldCategoryLabel(cat.id, t)}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 1.2fr) minmax(0, 0.55fr)',
              gap: spacing.sm,
              alignItems: 'end',
              pointerEvents: 'auto',
            }}
          >
            <label style={{ minWidth: 0, display: 'block' }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: fonts.body,
                  fontSize: '0.76rem',
                  color: c.muted,
                  marginBottom: 4,
                }}
              >
                {t('worldIndicator')}
              </span>
              <select
                value={indicatorCode}
                disabled={!categories?.length}
                onChange={(e) => setIndicatorCode(e.target.value)}
                style={selectCss(c)}
              >
                {(categories ?? [])
                  .find((x) => x.id === categoryId)
                  ?.indicators.map((ind) => (
                    <option key={ind.code} value={ind.code}>
                      {ind.name}
                    </option>
                  )) ?? null}
              </select>
            </label>

            <div style={{ minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: fonts.body,
                  fontSize: '0.76rem',
                  color: c.muted,
                  marginBottom: 4,
                }}
              >
                {t('worldYear')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                <button
                  type="button"
                  style={stepBtnStyle}
                  disabled={!yr || year <= yr.min}
                  onClick={() => stepYear(-1)}
                  aria-label={t('worldYearStepPrev')}
                >
                  −
                </button>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontFamily: fonts.mono,
                    fontSize: '0.95rem',
                    color: c.text,
                  }}
                >
                  {year}
                </span>
                <button
                  type="button"
                  style={stepBtnStyle}
                  disabled={!yr || year >= yr.max}
                  onClick={() => stepYear(1)}
                  aria-label={t('worldYearStepNext')}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {mapError && (
          <p
            style={{
              position: 'absolute',
              bottom: 120,
              left: spacing.md,
              zIndex: 22,
              margin: 0,
              color: c.red,
              fontFamily: fonts.body,
              fontSize: '0.88rem',
              pointerEvents: 'none',
            }}
          >
            {t('dataLoadError')}
          </p>
        )}

        {showYearFallbackHint && (
          <p
            style={{
              position: 'absolute',
              bottom: 96,
              left: spacing.md,
              right: spacing.md,
              zIndex: 22,
              margin: 0,
              color: c.muted,
              fontFamily: fonts.body,
              fontSize: '0.78rem',
              lineHeight: 1.35,
              pointerEvents: 'none',
            }}
          >
            {t('worldMapYearFallback')
              .replace('{requested}', String(debYear))
              .replace('{shown}', String(mapQueryYear))}
          </p>
        )}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <WorldGlMap
            geojson={geojson}
            mapData={mapRowsCountries}
            category={category}
            valueMin={minV}
            valueMax={maxV}
            nameByIso={nameByIso}
            onSelectCountry={onSelectCountry}
            onCountryContextMenu={onCountryContextMenu}
            selectedIso={selectedCountry}
            formatValue={formatValue}
            loading={mapLoading}
            narrow={narrow}
            layout="fullViewport"
          />
          {mapContextMenu ? (
            <div
              ref={mapContextMenuRef}
              role="menu"
              aria-label={t('worldCountryAnalysisTitle')}
              style={{
                position: 'fixed',
                left: mapContextMenu.x,
                top: mapContextMenu.y,
                zIndex: 400,
                minWidth: 220,
                maxWidth: 'min(92vw, 280px)',
                background: c.cardBg,
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                boxShadow: isDark
                  ? '0 4px 24px rgba(0,0,0,0.45)'
                  : '0 4px 20px rgba(0,0,0,0.12)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                role="menuitem"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  minHeight: 44,
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: c.text,
                  boxSizing: 'border-box',
                }}
                onClick={() => {
                  const iso = mapContextMenu.iso3
                  setMapContextMenu(null)
                  setSelectedCountry(iso)
                  widgetDashboardRef.current?.showWidget('stat-card')
                }}
              >
                {t('worldContextMenuStatTrend')}
              </button>
              <button
                type="button"
                role="menuitem"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  minHeight: 44,
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: c.text,
                  boxSizing: 'border-box',
                }}
                onClick={() => {
                  const iso = mapContextMenu.iso3
                  setMapContextMenu(null)
                  setSelectedCountry(iso)
                  widgetDashboardRef.current?.showWidget('sparkline')
                }}
              >
                {t('worldContextMenuSparkline')}
              </button>
              <button
                type="button"
                role="menuitem"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  minHeight: 44,
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: c.text,
                  boxSizing: 'border-box',
                }}
                onClick={() => {
                  const iso = mapContextMenu.iso3
                  setMapContextMenu(null)
                  setSelectedCountry(iso)
                  widgetDashboardRef.current?.showWidget('trade-flow')
                }}
              >
                {t('worldContextMenuTrade')}
              </button>
              <button
                type="button"
                role="menuitem"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  minHeight: 44,
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: c.text,
                  boxSizing: 'border-box',
                }}
                onClick={() => {
                  const iso = mapContextMenu.iso3
                  setMapContextMenu(null)
                  setSelectedCountry(iso)
                  setSidebarOpen(true)
                }}
              >
                {t('worldContextMenuProfile')}
              </button>
              <div
                role="separator"
                style={{
                  height: 1,
                  margin: '4px 0',
                  background: c.border,
                }}
              />
              <button
                type="button"
                role="menuitem"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  minHeight: 44,
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: c.muted,
                  boxSizing: 'border-box',
                }}
                onClick={() => {
                  setMapContextMenu(null)
                  setSelectedCountry(null)
                  setSidebarOpen(false)
                }}
              >
                {t('worldContextMenuClearSelection')}
              </button>
            </div>
          ) : null}
        </div>

        <div
          style={{
            position: 'absolute',
            left: spacing.md,
            right: spacing.md,
            bottom: spacing.md,
            zIndex: 28,
            maxWidth: narrow ? 'none' : 420,
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            <WorldMapLegend
              category={category}
              labelMin={formatValue(minV)}
              labelMax={formatValue(maxV)}
              unitShort={unitShort}
              compact
            />
          </div>
        </div>
      </div>
    ),
    [
      geoErr,
      t,
      c,
      narrow,
      categories,
      categoryId,
      indicatorCode,
      pillBase,
      selectCss,
      yr,
      year,
      stepYear,
      stepBtnStyle,
      mapError,
      showYearFallbackHint,
      debYear,
      mapQueryYear,
      geojson,
      mapRowsCountries,
      category,
      minV,
      maxV,
      nameByIso,
      onSelectCountry,
      onCountryContextMenu,
      mapContextMenu,
      selectedCountry,
      formatValue,
      mapLoading,
      unitShort,
      isDark,
    ],
  )

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: c.bg,
        color: c.text,
        position: 'relative',
      }}
    >
      <WidgetDashboard
        ref={widgetDashboardRef}
        narrow={narrow}
        selectedCountry={selectedCountry}
        indicatorCode={indicatorCode}
        year={year}
        categories={categories ?? null}
        geojson={geojson}
        mapSlot={mapSlot}
      />

      {!narrow ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 500,
            width: sidebarOpen ? (sidebarCompact ? 32 : 320) : 0,
            overflow: 'hidden',
            transition: 'width 0.25s ease',
            pointerEvents: sidebarOpen ? 'auto' : 'none',
          }}
        >
          <CountrySidebar
            iso3={selectedCountry}
            countryDetail={countryDetail}
            selectedRow={selectedRow}
            activeIndicator={worldConsoleActiveIndicator}
            percentile={sidebarPercentile}
            mapYear={mapQueryYear}
            tradeData={tradeData}
            tradeLoading={tradeLoading}
            onLoadTrade={loadTrade}
            ranking={consoleRanking}
            globalStats={consoleGlobalStats}
            sheetLayout={false}
            onClose={onCloseSidebar}
            onMinimize={setSidebarCompact}
            minimized={sidebarCompact}
            isOpen={sidebarOpen}
          />
        </div>
      ) : (
        <CountrySidebar
          iso3={selectedCountry}
          countryDetail={countryDetail}
          selectedRow={selectedRow}
          activeIndicator={worldConsoleActiveIndicator}
          percentile={sidebarPercentile}
          mapYear={mapQueryYear}
          tradeData={tradeData}
          tradeLoading={tradeLoading}
          onLoadTrade={loadTrade}
          ranking={consoleRanking}
          globalStats={consoleGlobalStats}
          sheetLayout
          onClose={onCloseSidebar}
          onMinimize={() => {}}
          minimized={false}
          isOpen={sidebarOpen}
        />
      )}
    </div>
  )
}
