import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { LngLat } from 'maplibre-gl'
import { type MapProjectionMode, useTheme } from '../design-system'
import type { Lang } from '../design-system/ThemeContext'
import { breakpoints, fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { isRealCountry } from '../utils/worldFilters'
import { useDebouncedValue } from './elections/useDebouncedValue'
import { countryPercentileFromMapRows } from './worldmap/worldConsoleHelpers'
import { CountrySidebar, type WorldConsoleActiveIndicator } from './worldmap/CountrySidebar'
import MapTopbar from './worldmap/MapTopbar'
import {
  FLOATING_WIDGETS,
  WidgetDashboard,
  type FloatingWidgetType,
  type WidgetDashboardHandle,
} from './worldmap/WidgetDashboard'
import { WorldGlMap } from './worldmap/WorldGlMap'
import { WorldMapLegend } from './worldmap/WorldMapLegend'
import { worldApiUrl } from './worldmap/worldMapData'
import type {
  CountrySelection,
  DockPosition,
  WorldCategoryApi,
  WorldCountryDetail,
  WorldGeoJson,
  WorldMapRow,
  WorldRankingRow,
  WorldStats,
  WorldTradeResponse,
  WorldTradeTimeseriesResponse,
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

const LS_VIS_WIDGETS = 'rp-visible-widgets-v1'
const LS_CONSOLE_DOCK = 'rp-console-dock'
const LS_MAP_PROJECTION = 'rp-map-projection'

function parseMapProjection(raw: string | null): MapProjectionMode {
  return raw === 'globe' ? 'globe' : 'mercator'
}

function isLegacyIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isAppleMobile =
    /iP(hone|ad|od)/.test(ua) ||
    (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)
  if (!isAppleMobile) return false
  if (!/Safari\//.test(ua) || /CriOS|FxiOS|EdgiOS/.test(ua)) return false
  const match = ua.match(/OS (\d+)_/)
  const major = match ? Number(match[1]) : NaN
  return Number.isFinite(major) && major < 15
}

function isGlobeProjectionSupported(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true
  if (isLegacyIosSafari()) return false
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

function parseVisibleFloatingWidgets(): Set<FloatingWidgetType> {
  try {
    const raw = localStorage.getItem(LS_VIS_WIDGETS)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(
      arr.filter(
        (x): x is FloatingWidgetType =>
          typeof x === 'string' && FLOATING_WIDGETS.includes(x as FloatingWidgetType),
      ),
    )
  } catch {
    return new Set()
  }
}

function persistVisibleFloatingWidgets(next: Set<FloatingWidgetType>) {
  try {
    localStorage.setItem(LS_VIS_WIDGETS, JSON.stringify([...next]))
  } catch {
    /* ignore */
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
  const [selection, setSelection] = useState<CountrySelection>({
    primary: null,
    compare: [],
  })
  const [allCountryDetails, setAllCountryDetails] = useState<
    Map<string, WorldCountryDetail>
  >(() => new Map())

  const setPrimaryCountry = useCallback((iso3: string | null) => {
    const n = iso3 == null ? null : normIso(iso3)
    setSelection({ primary: n, compare: [] })
  }, [])

  const addCompareCountry = useCallback((iso3: string) => {
    const u = normIso(iso3)
    setSelection((prev) => {
      if (!prev.primary) return { primary: u, compare: [] }
      if (prev.primary === u || prev.compare.includes(u)) return prev
      if (prev.compare.length >= 3) {
        return { ...prev, compare: [...prev.compare.slice(1), u] }
      }
      return { ...prev, compare: [...prev.compare, u] }
    })
  }, [])

  const removeCompareCountry = useCallback((iso3: string) => {
    const u = normIso(iso3)
    setSelection((prev) => ({
      ...prev,
      compare: prev.compare.filter((c) => c !== u),
    }))
  }, [])

  const clearSelection = useCallback(() => {
    setSelection({ primary: null, compare: [] })
  }, [])

  const onRemoveFromSelection = useCallback((iso3: string) => {
    const u = normIso(iso3)
    setSelection((prev) => {
      if (prev.primary === u) {
        if (prev.compare.length > 0) {
          const [nextPrimary, ...rest] = prev.compare
          return { primary: nextPrimary!, compare: rest }
        }
        return { primary: null, compare: [] }
      }
      return { ...prev, compare: prev.compare.filter((c) => c !== u) }
    })
  }, [])

  const selectedCountry = selection.primary
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= breakpoints.mobile : true,
  )
  const [sidebarCompact, setSidebarCompact] = useState(false)
  const [countryDetail, setCountryDetail] = useState<WorldCountryDetail | null>(null)
  const [tradeData, setTradeData] = useState<WorldTradeResponse | null>(null)
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeTimeseries, setTradeTimeseries] = useState<WorldTradeTimeseriesResponse | null>(null)
  const [tradeTimeseriesLoading, setTradeTimeseriesLoading] = useState(false)
  const [consoleRanking, setConsoleRanking] = useState<WorldRankingRow[] | null>(null)
  const [mapContextMenu, setMapContextMenu] = useState<{
    iso3: string
    x: number
    y: number
  } | null>(null)
  const widgetDashboardRef = useRef<WidgetDashboardHandle | null>(null)
  const mapContextMenuRef = useRef<HTMLDivElement | null>(null)
  const tradeFetchAbortRef = useRef<AbortController | null>(null)

  const [dock, setDock] = useState<DockPosition>(() => {
    try {
      const saved = localStorage.getItem(LS_CONSOLE_DOCK)
      if (saved === 'left' || saved === 'right' || saved === 'bottom') return saved
    } catch {
      /* ignore */
    }
    return 'right'
  })

  const [visibleFloatingWidgets, setVisibleFloatingWidgets] = useState<
    Set<FloatingWidgetType>
  >(() => parseVisibleFloatingWidgets())
  const [mapProjection, setMapProjection] = useState<MapProjectionMode>(() => {
    try {
      return parseMapProjection(localStorage.getItem(LS_MAP_PROJECTION))
    } catch {
      return 'mercator'
    }
  })
  const [globeProjectionSupported, setGlobeProjectionSupported] = useState(true)

  useEffect(() => {
    try {
      localStorage.setItem(LS_CONSOLE_DOCK, dock)
    } catch {
      /* ignore */
    }
  }, [dock])

  useEffect(() => {
    setGlobeProjectionSupported(isGlobeProjectionSupported())
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_MAP_PROJECTION, mapProjection)
    } catch {
      /* ignore */
    }
  }, [mapProjection])

  useEffect(() => {
    if (!globeProjectionSupported && mapProjection === 'globe') {
      setMapProjection('mercator')
    }
  }, [globeProjectionSupported, mapProjection])

  const onShowFloating = useCallback((id: FloatingWidgetType) => {
    setVisibleFloatingWidgets((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      persistVisibleFloatingWidgets(next)
      return next
    })
  }, [])

  const onToggleFloating = useCallback((id: FloatingWidgetType) => {
    setVisibleFloatingWidgets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      persistVisibleFloatingWidgets(next)
      return next
    })
  }, [])

  const onRemoveFloating = useCallback((id: FloatingWidgetType) => {
    setVisibleFloatingWidgets((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      persistVisibleFloatingWidgets(next)
      return next
    })
  }, [])

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
    const allIsos = [selection.primary, ...selection.compare]
      .filter((x): x is string => !!x)
      .map(normIso)
    if (!allIsos.length) return
    let cancelled = false
    const missing = allIsos.filter((iso) => !allCountryDetails.has(iso))
    if (!missing.length) return
    Promise.all(
      missing.map((iso) =>
        fetch(worldApiUrl(`/api/world/country/${encodeURIComponent(iso)}`)).then(
          (r) => {
            if (!r.ok) throw new Error(String(r.status))
            return r.json() as Promise<WorldCountryDetail>
          },
        ),
      ),
    )
      .then((details) => {
        if (cancelled) return
        setAllCountryDetails((prev) => {
          const next = new Map(prev)
          details.forEach((d, i) => {
            const iso = missing[i]!
            next.set(iso, d)
          })
          return next
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selection.primary, selection.compare, allCountryDetails])

  useEffect(() => {
    setTradeData(null)
    setTradeTimeseries(null)
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
    (iso3: string, partner?: string | null) => {
      tradeFetchAbortRef.current?.abort()
      const ac = new AbortController()
      tradeFetchAbortRef.current = ac
      setTradeLoading(true)
      const partnerNorm =
        partner == null
          ? ''
          : partner.trim().toUpperCase().slice(0, 3)
      const partnerQuery =
        partnerNorm.length === 3
          ? `&partner=${encodeURIComponent(partnerNorm)}`
          : ''
      const url = worldApiUrl(
        `/api/world/trade/${encodeURIComponent(iso3)}?year=${String(mapQueryYear)}&breakdown=sections${partnerQuery}`,
      )
      fetch(url, { signal: ac.signal })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status))
          return r.json() as Promise<WorldTradeResponse>
        })
        .then((d) => {
          if (!ac.signal.aborted) setTradeData(d)
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return
          if (ac.signal.aborted) return
          setTradeData(null)
        })
        .finally(() => {
          if (!ac.signal.aborted) setTradeLoading(false)
        })
    },
    [mapQueryYear],
  )

  const loadTradeTimeseries = useCallback((iso3: string) => {
    setTradeTimeseriesLoading(true)
    const url = worldApiUrl(
      `/api/world/trade/${encodeURIComponent(iso3)}/timeseries?yearMin=2017&yearMax=2024`,
    )
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<WorldTradeTimeseriesResponse>
      })
      .then((d) => setTradeTimeseries(d))
      .catch(() => setTradeTimeseries(null))
      .finally(() => setTradeTimeseriesLoading(false))
  }, [])

  const onSelectCountry = useCallback(
    (iso3: string, modifiers: { meta: boolean; ctrl: boolean }) => {
      if (modifiers.meta || modifiers.ctrl) {
        addCompareCountry(iso3)
      } else {
        setPrimaryCountry(iso3)
      }
      setSidebarOpen(true)
    },
    [addCompareCountry, setPrimaryCountry],
  )

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

  const handleYearChange = useCallback(
    (next: number) => {
      const yr = stats?.years_range
      if (!yr) return
      setYear(Math.min(yr.max, Math.max(yr.min, next)))
    },
    [stats],
  )

  const handleCategoryChange = useCallback(
    (cat: string) => {
      setCategoryId(cat)
      const catObj = categories?.find((x) => x.id === cat)
      const first = catObj?.indicators[0]?.code
      if (first) setIndicatorCode(first)
    },
    [categories],
  )

  const handleProjectionChange = useCallback(
    (next: MapProjectionMode) => {
      if (next === 'globe' && !globeProjectionSupported) return
      setMapProjection(next)
    },
    [globeProjectionSupported],
  )

  const topbarIndicators = useMemo(() => {
    const cat = (categories ?? []).find((x) => x.id === categoryId)
    return cat?.indicators ?? []
  }, [categories, categoryId])

  const yrRangeTopbar = stats?.years_range

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
            selectedIso={selection.primary}
            compareIso3List={selection.compare}
            formatValue={formatValue}
            loading={mapLoading}
            narrow={narrow}
            layout="fullViewport"
            projection={mapProjection}
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
              {(() => {
                const iso = mapContextMenu.iso3
                const isPrimary = selection.primary === iso
                const inCompare = selection.compare.includes(iso)
                const menuBtn = (opts: {
                  label: string
                  onClick: () => void
                  disabled?: boolean
                  muted?: boolean
                }) => (
                  <button
                    key={opts.label}
                    type="button"
                    role="menuitem"
                    disabled={opts.disabled}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      minHeight: 44,
                      padding: '8px 12px',
                      border: 'none',
                      background: 'transparent',
                      cursor: opts.disabled ? 'not-allowed' : 'pointer',
                      opacity: opts.disabled ? 0.45 : 1,
                      fontFamily: fonts.mono,
                      fontSize: 12,
                      color: opts.muted ? c.muted : c.text,
                      boxSizing: 'border-box',
                    }}
                    onClick={() => {
                      if (opts.disabled) return
                      opts.onClick()
                    }}
                  >
                    {opts.label}
                  </button>
                )
                const sep = (
                  <div
                    key="sep"
                    role="separator"
                    style={{
                      height: 1,
                      margin: '4px 0',
                      background: c.border,
                    }}
                  />
                )
                const rows: ReactNode[] = []
                rows.push(
                  menuBtn({
                    label: isPrimary
                      ? t('worldContextMenuClose')
                      : t('worldContextMenuOpen'),
                    onClick: () => {
                      setMapContextMenu(null)
                      if (isPrimary) {
                        clearSelection()
                        setSidebarOpen(false)
                      } else {
                        setPrimaryCountry(iso)
                        setSidebarOpen(true)
                      }
                    },
                  }),
                )
                if (!isPrimary) {
                  if (inCompare) {
                    rows.push(
                      menuBtn({
                        label: t('worldContextMenuRemoveCompare'),
                        onClick: () => {
                          setMapContextMenu(null)
                          removeCompareCountry(iso)
                        },
                      }),
                    )
                  } else {
                    rows.push(
                      menuBtn({
                        label: t('worldContextMenuAddCompare'),
                        disabled:
                          selection.primary === iso ||
                          selection.compare.includes(iso) ||
                          selection.compare.length >= 3,
                        onClick: () => {
                          setMapContextMenu(null)
                          addCompareCountry(iso)
                          setSidebarOpen(true)
                        },
                      }),
                    )
                  }
                }
                rows.push(sep)
                rows.push(
                  menuBtn({
                    label: t('worldContextMenuShowStat'),
                    onClick: () => {
                      setMapContextMenu(null)
                      setPrimaryCountry(iso)
                      widgetDashboardRef.current?.showWidget('stat-card')
                    },
                  }),
                )
                rows.push(
                  menuBtn({
                    label: t('worldContextMenuShowTrade'),
                    onClick: () => {
                      setMapContextMenu(null)
                      setPrimaryCountry(iso)
                      widgetDashboardRef.current?.showWidget('trade-flow')
                    },
                  }),
                )
                return rows
              })()}
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
      selection,
      clearSelection,
      removeCompareCountry,
      addCompareCountry,
      setPrimaryCountry,
      selectedCountry,
      formatValue,
      mapLoading,
      unitShort,
      isDark,
      mapProjection,
    ],
  )

  const sidebarWidth = !sidebarOpen ? 0 : sidebarCompact ? 32 : 320

  const countrySidebarProps = {
    iso3: selectedCountry,
    countryDetail,
    selectedRow,
    activeIndicator: worldConsoleActiveIndicator,
    percentile: sidebarPercentile,
    mapYear: mapQueryYear,
    tradeData,
    tradeLoading,
    onLoadTrade: loadTrade,
    tradeTimeseries,
    tradeTimeseriesLoading,
    onLoadTradeTimeseries: loadTradeTimeseries,
    ranking: consoleRanking,
    globalStats: consoleGlobalStats,
    onClose: onCloseSidebar,
    onMinimize: setSidebarCompact,
    minimized: sidebarCompact,
    isOpen: sidebarOpen,
    dock,
    onDockChange: setDock,
    selection,
    allCountryDetails,
    mapRowsCountries,
    formatIndicatorValue: formatValue,
    geojson,
    onRemoveFromSelection,
    onClearAllSelection: clearSelection,
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: c.bg,
        color: c.text,
      }}
    >
      <MapTopbar
        categories={categories ?? []}
        activeCategory={categoryId}
        onCategoryChange={handleCategoryChange}
        indicators={topbarIndicators}
        activeIndicatorCode={indicatorCode}
        onIndicatorCodeChange={setIndicatorCode}
        year={year}
        onYearChange={handleYearChange}
        yearMin={yrRangeTopbar?.min ?? year}
        yearMax={yrRangeTopbar?.max ?? year}
        projection={mapProjection}
        onProjectionChange={handleProjectionChange}
        projectionDisabled={!globeProjectionSupported}
        projectionDisabledReason={
          globeProjectionSupported ? undefined : t('worldProjectionUnsupportedHint')
        }
        visibleWidgets={visibleFloatingWidgets}
        onToggleWidget={onToggleFloating}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
          transition: 'all 0.25s ease',
        }}
      >
        {narrow ? (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
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
              floatingVisible={visibleFloatingWidgets}
              onShowFloating={onShowFloating}
              onToggleFloating={onToggleFloating}
              onRemoveFloating={onRemoveFloating}
            />
          </div>
        ) : dock === 'bottom' ? (
          <>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
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
                floatingVisible={visibleFloatingWidgets}
                onShowFloating={onShowFloating}
                onToggleFloating={onToggleFloating}
                onRemoveFloating={onRemoveFloating}
              />
            </div>
            {sidebarOpen ? (
              <CountrySidebar {...countrySidebarProps} sheetLayout={false} />
            ) : null}
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: dock === 'left' ? 'row' : 'row-reverse',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: sidebarWidth,
                flexShrink: 0,
                transition: 'width 0.25s ease',
                overflow: 'hidden',
              }}
            >
              {sidebarOpen ? (
                <CountrySidebar {...countrySidebarProps} sheetLayout={false} />
              ) : null}
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
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
                floatingVisible={visibleFloatingWidgets}
                onShowFloating={onShowFloating}
                onToggleFloating={onToggleFloating}
                onRemoveFloating={onRemoveFloating}
              />
            </div>
          </div>
        )}
      </div>

      {narrow ? (
        <CountrySidebar
          {...countrySidebarProps}
          sheetLayout
          onMinimize={() => {}}
          minimized={false}
        />
      ) : null}
    </div>
  )
}
