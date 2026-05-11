import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as d3 from 'd3'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Badge,
  DataCard,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Pagination,
  StatWidget,
  useTheme,
} from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'

type LobbyListItem = {
  id: number
  register_number: string
  name: string | null
  legal_form: unknown
  city: string | null
  active: boolean | null
  employee_fte: number | null
  financial_expenses_euro: number | null
  financial_year_start: string | null
  financial_year_end: string | null
  fields_of_interest: unknown
  regulatory_projects_count: number | null
  statements_count: number | null
  details_url: string | null
}

type LobbyListResponse = {
  total: number
  page: number
  limit: number
  items: LobbyListItem[]
}

type LobbyStatsResponse = {
  total: number
  active: number
  mit_finanzdaten: number
  max_ausgaben: number | null
  avg_ausgaben: number | null
  top10: Array<{
    register_number: string
    name: string | null
    city: string | null
    financial_expenses_euro: number | null
    employee_fte: number | null
    details_url: string | null
  }>
}

type LobbyDetail = LobbyListItem & {
  country: string | null
  members_count: number | null
  activity_description: string | null
  first_publication: string | null
  last_update: string | null
}

type LobbyGesetzItem = {
  gesetz_id: number
  kuerzel: string | null
  titel_offiziell: string | null
  name: string | null
  gii_slug: string | null
  projekt_count: number
  aenderung_id: number | null
}

type LobbyGesetzeResponse = {
  items: LobbyGesetzItem[]
  stats: {
    projekte_gesamt: number
    projekte_mit_mapping: number
    unique_gesetze: number
  }
}

type LobbyProjectItem = {
  id: number
  project_number: string | null
  title: string | null
  description: string | null
  affected_laws: unknown
  leading_ministries: unknown
  purpose_description: string | null
  project_url: string | null
  document_url: string | null
  federal_ministry: string | null
}

type LobbyProjectsResponse = {
  items: LobbyProjectItem[]
}

type LobbyByFieldItem = {
  code: string
  de: string | null
  en: string | null
  count: number
  total_expenses: number | null
  avg_expenses: number | null
}

type LobbyByFieldResponse = {
  items: LobbyByFieldItem[]
}

type LobbyByCityItem = {
  city: string
  country: string | null
  count: number
  total_expenses: number | null
  avg_expenses: number | null
}

type LobbyByCityResponse = {
  items: LobbyByCityItem[]
}

type LobbyByTimeItem = {
  month: string
  count: number
  cumulative: number
}

type LobbyByTimeResponse = {
  items: LobbyByTimeItem[]
}

const PAGE_SIZE = 50
const TREEMAP_COLORS = [
  '#C8102E', '#1a5276', '#1e8449', '#7d3c98', '#d35400',
  '#2e86c1', '#a93226', '#117a65', '#6c3483', '#b7950b',
  '#1a252f', '#784212', '#4a235a', '#1b4f72', '#0e6655',
]
const MAP_STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const MAP_STYLE_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const TAB_TRANSITION = 'cubic-bezier(0.4, 0, 0.2, 1)'
const CITY_COORDS: Record<string, [number, number]> = {
  Berlin: [13.405, 52.52],
  Hamburg: [9.993, 53.551],
  München: [11.576, 48.137],
  Frankfurt: [8.682, 50.11],
  'Frankfurt am Main': [8.682, 50.11],
  Köln: [6.961, 50.938],
  Stuttgart: [9.182, 48.776],
  Düsseldorf: [6.773, 51.227],
  Leipzig: [12.374, 51.34],
  Dresden: [13.738, 51.05],
  Hannover: [9.732, 52.374],
  Bremen: [8.808, 53.073],
  Bonn: [7.099, 50.734],
  Karlsruhe: [8.404, 49.009],
  Nürnberg: [11.077, 49.452],
  Mannheim: [8.466, 49.487],
  Saarbrücken: [6.996, 49.235],
  Wiesbaden: [8.241, 50.082],
  Mainz: [8.271, 49.999],
  Münster: [7.626, 51.962],
}

export default function LobbyRegister() {
  const { t, c, lang, theme } = useTheme()
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 1024 : window.innerWidth,
  )
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('financial_expenses_euro DESC')
  const [selectedFoi, setSelectedFoi] = useState('')
  const [foiOptions, setFoiOptions] = useState<Array<{ value: string; label: string }>>([])
  const [onlyActive, setOnlyActive] = useState(true)
  const [minExpense, setMinExpense] = useState(0)
  const [selectedCity, setSelectedCity] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedRegisterNumber = searchParams.get('register')
  const setSelectedRegisterNumber = (value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) {
          next.set('register', value)
        } else {
          next.delete('register')
        }
        return next
      },
      { replace: false },
    )
  }
  const [detailTab, setDetailTab] = useState<'overview' | 'projects'>('overview')
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [hoveredTile, setHoveredTile] = useState<{ code: string; x: number; y: number } | null>(null)
  const [geoTab, setGeoTab] = useState<'map' | 'ranking'>('map')
  const treemapRef = useRef<HTMLDivElement | null>(null)
  const geoMapContainerRef = useRef<HTMLDivElement | null>(null)
  const geoMapRef = useRef<maplibregl.Map | null>(null)
  const geoMapPopupRef = useRef<maplibregl.Popup | null>(null)

  const isMobile = viewportWidth < 768
  const treemapHeight = isMobile ? 400 : 500

  const minExpenseOptions = useMemo(
    () => [
      { value: 0, label: lang === 'de' ? 'Alle Ausgaben' : 'All expenses' },
      { value: 100000, label: '> 100.000 €' },
      { value: 500000, label: '> 500.000 €' },
      { value: 1000000, label: '> 1 Mio €' },
      { value: 5000000, label: '> 5 Mio €' },
    ],
    [lang],
  )

  const listEndpoint = useMemo(() => {
    const q = encodeURIComponent(search)
    const s = encodeURIComponent(sort)
    const foi = encodeURIComponent(selectedFoi)
    const city = encodeURIComponent(selectedCity)
    const active = onlyActive ? 'true' : 'false'
    return `/api/lobbyregister?page=${page - 1}&limit=${PAGE_SIZE}&q=${q}&sort=${s}&foi=${foi}&city=${city}&active=${active}&min_expense=${minExpense}`
  }, [page, search, sort, selectedFoi, selectedCity, onlyActive, minExpense])

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedFoi.length > 0 ||
    selectedCity.length > 0 ||
    minExpense > 0 ||
    !onlyActive

  useEffect(() => {
    setPage(1)
  }, [selectedFoi, onlyActive, minExpense, selectedCity])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!selectedRegisterNumber) {
      setDetailTab('overview')
      setExpandedProject(null)
    }
  }, [selectedRegisterNumber])

  const {
    data: listData,
    loading: listLoading,
    error: listError,
  } = useApi<LobbyListResponse>(listEndpoint)
  const {
    data: statsData,
    loading: statsLoading,
    error: statsError,
  } = useApi<LobbyStatsResponse>('/api/lobbyregister/stats')
  const {
    data: detailData,
    loading: detailLoading,
    error: detailError,
  } = useApi<LobbyDetail>(
    selectedRegisterNumber
      ? `/api/lobbyregister/${encodeURIComponent(selectedRegisterNumber)}`
      : '',
  )
  const {
    data: projectsData,
    loading: projectsLoading,
    error: projectsError,
  } = useApi<LobbyProjectsResponse>(
    selectedRegisterNumber
      ? `/api/lobbyregister/${encodeURIComponent(selectedRegisterNumber)}/projects`
      : '',
  )

  const {
    data: lobbyGesetze,
    loading: gesetzeLoading,
    error: gesetzeError,
  } = useApi<LobbyGesetzeResponse>(
    selectedRegisterNumber
      ? `/api/lobbyregister/${encodeURIComponent(selectedRegisterNumber)}/gesetze`
      : '',
  )
  useEffect(() => {
    if (projectsData?.items) {
      // Temporary debug output to verify API project shape in browser devtools.
      console.log('Lobby projects response', projectsData.items)
    }
  }, [projectsData])
  const {
    data: byFieldData,
    loading: byFieldLoading,
    error: byFieldError,
  } = useApi<LobbyByFieldResponse>('/api/lobbyregister/by-field')
  const {
    data: byCityData,
    loading: byCityLoading,
    error: byCityError,
  } = useApi<LobbyByCityResponse>('/api/lobbyregister/by-city')
  const {
    data: byTimeData,
    loading: byTimeLoading,
    error: byTimeError,
  } = useApi<LobbyByTimeResponse>('/api/lobbyregister/by-time')

  const byFieldItems = useMemo(
    () => (byFieldData?.items ?? []).filter((item) => item.total_expenses != null),
    [byFieldData],
  )
  const cityItems = useMemo(
    () =>
      (byCityData?.items ?? []).filter(
        (item): item is LobbyByCityItem =>
          Boolean(item.city?.trim()) && item.total_expenses != null,
      ),
    [byCityData],
  )
  const cityOptions = useMemo(
    () => [
      { value: '', label: t('lobbyFilterCityAll') },
      ...cityItems.map((item) => ({
        value: item.city,
        label: `${item.city} (${item.count.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')})`,
      })),
    ],
    [cityItems, lang, t],
  )
  const cityRankingItems = useMemo(() => cityItems.slice(0, 20), [cityItems])
  const cityMapItems = useMemo(
    () =>
      cityItems
        .map((item) => {
          const coords = CITY_COORDS[item.city]
          if (!coords) return null
          return { ...item, coords }
        })
        .filter((item): item is LobbyByCityItem & { coords: [number, number] } => item != null),
    [cityItems],
  )
  const maxCityExpense = useMemo(
    () => Math.max(1, d3.max(cityMapItems, (item) => item.total_expenses ?? 0) ?? 1),
    [cityMapItems],
  )

  useEffect(() => {
    const dynamicOptions = (byFieldData?.items ?? []).map((item) => ({
      value: item.code,
      label:
        (lang === 'de' ? item.de : item.en) ||
        (lang === 'de' ? item.en : item.de) ||
        item.code,
    }))
    setFoiOptions([
      { value: '', label: lang === 'de' ? 'Alle Interessensgebiete' : 'All fields of interest' },
      ...dynamicOptions,
    ])
  }, [byFieldData, lang])

  const byFieldTiles = useMemo(() => {
    if (!byFieldItems.length) return []
    const root = d3
      .hierarchy<{ children: LobbyByFieldItem[] } & LobbyByFieldItem>({
        children: byFieldItems,
      } as { children: LobbyByFieldItem[] } & LobbyByFieldItem)
      .sum((d) => d.total_expenses ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    d3.treemap<{ children: LobbyByFieldItem[] } & LobbyByFieldItem>()
      .size([Math.max(320, viewportWidth - 64), treemapHeight])
      .paddingInner(2)
      .paddingOuter(2)
      .round(true)(root)

    const sumAll = d3.sum(byFieldItems, (item) => item.total_expenses ?? 0)

    return root.leaves().map((leaf, idx) => {
      const tile = leaf as unknown as d3.HierarchyRectangularNode<LobbyByFieldItem>
      const pct = sumAll > 0 ? ((tile.value ?? 0) / sumAll) * 100 : 0
      return {
        item: tile.data,
        x: tile.x0,
        y: tile.y0,
        width: Math.max(0, tile.x1 - tile.x0),
        height: Math.max(0, tile.y1 - tile.y0),
        fill: TREEMAP_COLORS[idx % TREEMAP_COLORS.length],
        value: tile.value ?? 0,
        pct,
      }
    })
  }, [byFieldItems, treemapHeight, viewportWidth])

  const totalPages = Math.max(
    1,
    Math.ceil((listData?.total ?? 0) / Math.max(1, listData?.limit ?? PAGE_SIZE)),
  )

  function formatMoney(value: number | null): string {
    const locale = lang === 'de' ? 'de-DE' : 'en-GB'
    if (value == null) return '—'
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toLocaleString(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} Mrd €`
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} Mio €`
    }
    return `${value.toLocaleString(locale)} €`
  }

  const selectedFieldTile = useMemo(
    () => (hoveredTile ? byFieldTiles.find((tile) => tile.item.code === hoveredTile.code) ?? null : null),
    [byFieldTiles, hoveredTile],
  )
  const treemapContainerWidth = treemapRef.current?.clientWidth ?? Math.max(320, viewportWidth - 64)
  const treemapContainerHeight = treemapRef.current?.clientHeight ?? treemapHeight
  const tooltipWidth = isMobile ? 250 : 320
  const tooltipHeight = 128
  const tooltipX = hoveredTile
    ? Math.min(hoveredTile.x + 15, treemapContainerWidth - tooltipWidth - 10)
    : 0
  const tooltipY = hoveredTile
    ? Math.min(hoveredTile.y + 15, treemapContainerHeight - tooltipHeight - 10)
    : 0
  const totalTreemapExpenses = useMemo(
    () => byFieldItems.reduce((sum, item) => sum + (item.total_expenses ?? 0), 0),
    [byFieldItems],
  )

  const listAnchorId = 'lobbyregister-list-start'

  const getFoiLabel = (item: LobbyByFieldItem): string =>
    lang === 'de'
      ? item.de || item.en || item.code
      : item.en || item.de || item.code
  const selectedFoiLabel = selectedFoi
    ? foiOptions.find((option) => option.value === selectedFoi)?.label ?? selectedFoi
    : ''
  const selectedMinExpenseLabel = minExpenseOptions.find((option) => option.value === minExpense)?.label ?? String(minExpense)

  const parseMaybeJson = (val: unknown, currentLang: string): string => {
    if (!val) return ''
    if (typeof val === 'object') {
      const obj = val as { de?: unknown; en?: unknown }
      return currentLang === 'de'
        ? String(obj.de ?? obj.en ?? '')
        : String(obj.en ?? obj.de ?? '')
    }
    if (typeof val === 'string') {
      try {
        const p = JSON.parse(val) as { de?: unknown; en?: unknown }
        return currentLang === 'de'
          ? String(p.de ?? p.en ?? val)
          : String(p.en ?? p.de ?? val)
      } catch {
        try {
          const p = JSON.parse(val.replace(/'/g, '"')) as { de?: unknown; en?: unknown }
          return currentLang === 'de'
            ? String(p.de ?? p.en ?? val)
            : String(p.en ?? p.de ?? val)
        } catch {
          const deMatch = val.match(/'de':\s*'([^']*)'/)
          const enMatch = val.match(/'en':\s*'([^']*)'/)
          if (currentLang === 'de' && deMatch) return deMatch[1]
          if (currentLang === 'en' && enMatch) return enMatch[1]
          if (deMatch) return deMatch[1]
          if (enMatch) return enMatch[1]
        }
      }
    }
    return String(val)
  }

  function fieldArray(raw: unknown): string[] {
    let parsed: unknown = raw
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw)
      } catch {
        try {
          parsed = JSON.parse(raw.replace(/'/g, '"'))
        } catch {
          return []
        }
      }
    }
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((field) => parseMaybeJson(field, lang))
      .filter((x) => x.trim().length > 0)
  }

  function getLegalFormLabel(raw: unknown): string | null {
    const label = parseMaybeJson(raw, lang).trim()
    return label || null
  }

  function formatAverageMoney(value: number | null): string {
    if (value == null) return '—'
    const locale = lang === 'de' ? 'de-DE' : 'en-GB'
    const normalized = value > 10_000_000 ? value / 1000 : value
    return `${Math.round(normalized).toLocaleString(locale)} €`
  }

  const getMinistry = (lm: unknown): string => {
    if (!lm) return ''
    let parsed = lm
    if (typeof lm === 'string') {
      try {
        parsed = JSON.parse(lm)
      } catch {
        return ''
      }
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0] as { shortTitle?: unknown; short_title?: unknown; title?: unknown }
      return String(first.shortTitle ?? first.short_title ?? first.title ?? '')
    }
    return ''
  }

  const getAffectedLaws = (al: unknown): string[] => {
    if (!al) return []
    let parsed = al
    if (typeof al === 'string') {
      try {
        parsed = JSON.parse(al)
      } catch {
        return []
      }
    }
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((law) => {
        if (law && typeof law === 'object') {
          const entry = law as { shortTitle?: unknown; short_title?: unknown; title?: unknown }
          return String(entry.shortTitle ?? entry.short_title ?? entry.title ?? '').trim()
        }
        return String(law ?? '').trim()
      })
      .filter(Boolean)
  }

  const chartWidth = Math.max(360, Math.min(900, viewportWidth - 80))
  const chartHeight = 500
  const chartMargin = { top: 16, right: 24, bottom: 44, left: 170 }
  const chartInnerWidth = Math.max(120, chartWidth - chartMargin.left - chartMargin.right)
  const chartInnerHeight = Math.max(120, chartHeight - chartMargin.top - chartMargin.bottom)
  const xScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([
          0,
          d3.max(cityRankingItems, (item) => (item.total_expenses ?? 0) / 1_000_000) ?? 1,
        ])
        .nice()
        .range([0, chartInnerWidth]),
    [cityRankingItems, chartInnerWidth],
  )
  const yScale = useMemo(
    () =>
      d3
        .scaleBand<string>()
        .domain(cityRankingItems.map((item) => item.city))
        .range([0, chartInnerHeight])
        .padding(0.18),
    [cityRankingItems, chartInnerHeight],
  )
  const xTicks = useMemo(() => xScale.ticks(5), [xScale])
  const timeData = useMemo(() => byTimeData?.items ?? [], [byTimeData])
  const monthlyChartHeight = isMobile ? 200 : 300
  const cumulativeChartHeight = isMobile ? 180 : 250
  const formatTimelineTick = (val: string): string => {
    const [year, month] = val.split('-')
    if (!year || !month) return val
    const monthNum = Number(month)
    if (monthNum % 6 !== 1) return ''
    return `${month === '01' ? 'Jan' : 'Jul'} ${year.slice(2)}`
  }
  const formatTooltipNumber = (value: unknown): string => {
    if (typeof value === 'number') return value.toLocaleString('de-DE')
    const asNumber = Number(value)
    return Number.isFinite(asNumber) ? asNumber.toLocaleString('de-DE') : String(value ?? '—')
  }

  useEffect(() => {
    if (geoTab !== 'map') return undefined
    const container = geoMapContainerRef.current
    if (!container) return undefined

    const map = new maplibregl.Map({
      container,
      style: theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
      center: [10.4, 51.2],
      zoom: 5,
      minZoom: 4,
      maxZoom: 9,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    geoMapRef.current = map
    geoMapPopupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '300px',
    })

    map.on('load', () => {
      const cityFeatures: GeoJSON.Feature<GeoJSON.Point>[] = cityMapItems.map((item) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: item.coords,
        },
        properties: {
          city: item.city,
          country: item.country ?? '',
          count: item.count,
          total_expenses: item.total_expenses ?? 0,
          avg_expenses: item.avg_expenses ?? 0,
        },
      }))

      map.addSource('lobby-cities', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: cityFeatures,
        },
      })

      map.addLayer({
        id: 'lobby-cities',
        type: 'circle',
        source: 'lobby-cities',
        paint: {
          'circle-color': '#C8102E',
          'circle-opacity': 0.7,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['case', ['==', ['get', 'city'], selectedCity], 3, 1],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'total_expenses'],
            0,
            6,
            maxCityExpense,
            40,
          ],
        },
      })

      map.on('mousemove', 'lobby-cities', (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as {
          city?: string
          country?: string
          count?: number | string
          total_expenses?: number | string
          avg_expenses?: number | string
        }
        const cityLabel = String(props.city ?? '').trim()
        const countryRaw = String(props.country ?? '').trim()
        const countryLabel = countryRaw ? parseMaybeJson(countryRaw, lang).trim() : ''
        const isHomeCountry = countryLabel === (lang === 'de' ? 'Deutschland' : 'Germany')
        const locationLabel =
          cityLabel && countryLabel && !isHomeCountry
            ? `${cityLabel}, ${countryLabel}`
            : cityLabel || countryLabel
        const count = Number(props.count ?? 0)
        const totalExpenses = Number(props.total_expenses ?? 0)
        const avgExpenses = Number(props.avg_expenses ?? 0)
        const html = `<div style="font-family:${fonts.body};font-size:13px;color:${c.ink};line-height:1.45">
          <div style="font-weight:700;margin-bottom:4px;">${locationLabel}</div>
          <div>${t('lobbyTreemapCount')}: ${count.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')}</div>
          <div>${t('lobbyTreemapTotal')}: ${formatMoney(totalExpenses)}</div>
          <div>${t('lobbyTreemapAvg')}: ${formatMoney(avgExpenses)}</div>
        </div>`
        geoMapPopupRef.current?.setLngLat(e.lngLat).setHTML(html).addTo(map)
      })

      map.on('click', 'lobby-cities', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as { city?: string }
        const city = String(props.city ?? '').trim()
        if (!city) return
        setSelectedCity(city)
        setPage(1)
        document
          .getElementById('lobby-filter-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })

      map.on('mouseleave', 'lobby-cities', () => {
        map.getCanvas().style.cursor = ''
        geoMapPopupRef.current?.remove()
      })
    })

    return () => {
      geoMapPopupRef.current?.remove()
      geoMapPopupRef.current = null
      map.remove()
      geoMapRef.current = null
    }
  }, [geoTab, theme, cityMapItems, maxCityExpense, c.ink, lang, t, selectedCity])

  return (
    <>
      <PageHeader title={t('lobbyPageTitle')} subtitle={t('lobbyPageSubtitle')} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: spacing.md,
          marginBottom: spacing.xl,
        }}
      >
        <StatWidget
          label={t('lobbyStatTotal')}
          value={
            statsLoading
              ? '...'
              : statsError
                ? '-'
                : (statsData?.total ?? '-')
          }
          sub={t('lobbyStatTotalSub')}
          icon={<span aria-hidden>◇</span>}
        />
        <StatWidget
          label={t('lobbyStatActive')}
          value={
            statsLoading
              ? '...'
              : statsError
                ? '-'
                : (statsData?.active ?? '-')
          }
          sub={t('lobbyStatActiveSub')}
          icon={<span aria-hidden>◇</span>}
        />
        <StatWidget
          label={t('lobbyStatAvgExpenses')}
          value={
            statsLoading
              ? '...'
              : statsError
                ? '-'
                : formatAverageMoney(statsData?.avg_ausgaben ?? null)
          }
          sub={t('lobbyStatAvgExpensesSub')}
          icon={<span aria-hidden>◇</span>}
        />
      </div>

      <DataCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <h3 style={{ margin: 0, fontFamily: fonts.display, color: c.ink }}>
              {t('lobbyTreemapTitle')}
            </h3>
            <p style={{ margin: 0, fontFamily: fonts.body, color: c.muted, fontSize: '0.85rem' }}>
              {t('lobbyTreemapTotalAll')}: {formatMoney(totalTreemapExpenses)}
            </p>
            <p style={{ margin: 0, fontFamily: fonts.body, color: c.muted, fontSize: '0.92rem' }}>
              {t('lobbyTreemapSubtitle')}
            </p>
          </div>

          {byFieldLoading ? (
            <div
              role="status"
              aria-busy="true"
              aria-label={t('loading')}
              style={{
                position: 'relative',
                width: '100%',
                minHeight: treemapHeight,
                borderRadius: 10,
                overflow: 'hidden',
                background: c.bgAlt,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: '20px 12px',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  width: 'min(100%, 380px)',
                }}
                aria-hidden
              >
                {[85, 70, 92, 65, 78].map((w, i) => (
                  <div
                    key={i}
                    className="rp-skeleton-bar"
                    style={{
                      width: `${w}%`,
                      height: 10,
                      borderRadius: 5,
                      background: c.subtle,
                      animationDelay: `${i * 0.09}s`,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontFamily: fonts.body,
                  color: c.muted,
                  fontSize: '0.88rem',
                }}
              >
                <LoadingSpinner />
                <span>{t('loading')}</span>
              </div>
            </div>
          ) : byFieldError ? (
            <p style={{ margin: 0, fontFamily: fonts.body, color: c.muted }}>
              {t('dataLoadError')}
            </p>
          ) : !byFieldTiles.length ? (
            <EmptyState text={t('lobbyTreemapEmpty')} />
          ) : (
            <div
              ref={treemapRef}
              style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: 10 }}
            >
              <svg
                viewBox={`0 0 ${Math.max(320, viewportWidth - 64)} ${treemapHeight}`}
                role="img"
                aria-label={t('lobbyTreemapAria')}
                style={{ width: '100%', height: treemapHeight, display: 'block' }}
              >
                {byFieldTiles.map((tile) => {
                  const active = selectedFoi === tile.item.code
                  const label = getFoiLabel(tile.item)
                  const pctLabel = `${tile.pct.toFixed(1)}%`
                  const canShowLabel = tile.width > 60 && tile.height > 40
                  const canShowName = tile.width > 120 && tile.height > 70
                  return (
                    <g
                      key={tile.item.code}
                      transform={`translate(${tile.x},${tile.y})`}
                      onMouseEnter={(e) => {
                        const bounds = treemapRef.current?.getBoundingClientRect()
                        if (!bounds) return
                        setHoveredTile({
                          code: tile.item.code,
                          x: e.clientX - bounds.left + 15,
                          y: e.clientY - bounds.top + 15,
                        })
                      }}
                      onMouseMove={(e) => {
                        const bounds = treemapRef.current?.getBoundingClientRect()
                        if (!bounds) return
                        setHoveredTile({
                          code: tile.item.code,
                          x: e.clientX - bounds.left + 15,
                          y: e.clientY - bounds.top + 15,
                        })
                      }}
                      onMouseLeave={() => setHoveredTile(null)}
                      onFocus={() => setHoveredTile({ code: tile.item.code, x: 24, y: 24 })}
                      onBlur={() => setHoveredTile(null)}
                      onTouchStart={(e) => {
                        const bounds = treemapRef.current?.getBoundingClientRect()
                        const touch = e.touches[0]
                        if (!bounds || !touch) return
                        setHoveredTile({
                          code: tile.item.code,
                          x: touch.clientX - bounds.left,
                          y: touch.clientY - bounds.top,
                        })
                      }}
                      onTouchMove={(e) => {
                        const bounds = treemapRef.current?.getBoundingClientRect()
                        const touch = e.touches[0]
                        if (!bounds || !touch) return
                        setHoveredTile({
                          code: tile.item.code,
                          x: touch.clientX - bounds.left,
                          y: touch.clientY - bounds.top,
                        })
                      }}
                      onClick={() => {
                        setSelectedFoi(tile.item.code)
                        setPage(1)
                        setTimeout(() => {
                          document.getElementById('lobby-filter-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 20)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        width={tile.width}
                        height={tile.height}
                        rx={4}
                        fill={tile.fill}
                        stroke={active ? c.ink : c.border}
                        strokeWidth={active ? 2 : 1}
                      />
                      {canShowLabel ? (
                        <>
                          <text
                            x={8}
                            y={24}
                            style={{
                              fill: '#ffffff',
                              fontFamily: fonts.mono,
                              fontSize: 24,
                              fontWeight: 700,
                              pointerEvents: 'none',
                            }}
                          >
                            {pctLabel}
                          </text>
                          {canShowName ? (
                            <text
                              x={8}
                              y={44}
                              style={{
                                fill: '#ffffff',
                                fontFamily: fonts.body,
                                fontSize: 12,
                                fontWeight: 700,
                                pointerEvents: 'none',
                              }}
                            >
                              {label}
                            </text>
                          ) : null}
                        </>
                      ) : null}
                    </g>
                  )
                })}
              </svg>

              {selectedFieldTile && hoveredTile ? (
                <div
                  style={{
                    position: 'absolute',
                    left: isMobile ? '50%' : Math.max(10, tooltipX),
                    top: isMobile ? undefined : Math.max(10, tooltipY),
                    bottom: isMobile ? 10 : undefined,
                    transform: isMobile ? 'translateX(-50%)' : 'translate(0, 0)',
                    background: c.cardBg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                    padding: spacing.sm,
                    boxShadow: c.shadow,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    maxWidth: isMobile ? 250 : 320,
                    width: isMobile ? 'calc(100% - 20px)' : 'auto',
                    wordWrap: 'break-word',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                >
                  <strong style={{ fontFamily: fonts.body, color: c.ink, fontSize: '0.9rem' }}>
                    {getFoiLabel(selectedFieldTile.item)}
                  </strong>
                  <span style={{ fontFamily: fonts.body, color: c.inkSoft, fontSize: '0.82rem' }}>
                    {t('lobbyTreemapTotal')}: {formatMoney(selectedFieldTile.item.total_expenses)}
                  </span>
                  <span style={{ fontFamily: fonts.body, color: c.inkSoft, fontSize: '0.82rem' }}>
                    {t('lobbyTreemapCount')}:{' '}
                    {selectedFieldTile.item.count.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')}
                  </span>
                  <span style={{ fontFamily: fonts.body, color: c.inkSoft, fontSize: '0.82rem' }}>
                    {t('lobbyTreemapAvg')}: {formatMoney(selectedFieldTile.item.avg_expenses)}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DataCard>

      <DataCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <h3 style={{ margin: 0, fontFamily: fonts.display, color: c.ink }}>
            {t('lobbyGeoTitle')}
          </h3>

          <div
            role="tablist"
            aria-label={t('lobbyGeoTitle')}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing.sm,
              borderBottom: `1px solid ${c.border}`,
              paddingBottom: spacing.sm,
            }}
          >
            {([
              { key: 'map', label: t('lobbyGeoTabMap') },
              { key: 'ranking', label: t('lobbyGeoTabRanking') },
            ] as const).map((tab) => {
              const active = geoTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGeoTab(tab.key)}
                  style={{
                    padding: `${spacing.md}px ${spacing.lg}px`,
                    borderRadius: 6,
                    border: `1px solid ${active ? c.red : c.border}`,
                    background: active ? c.bgHover : c.bgAlt,
                    color: active ? c.red : c.muted,
                    fontFamily: fonts.mono,
                    fontSize: '0.72rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: `border-color 0.2s ${TAB_TRANSITION}, background 0.2s ${TAB_TRANSITION}, color 0.2s ${TAB_TRANSITION}`,
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {byCityLoading ? (
            <LoadingSpinner />
          ) : byCityError ? (
            <p style={{ margin: 0, fontFamily: fonts.body, color: c.muted }}>
              {t('dataLoadError')}
            </p>
          ) : !cityItems.length ? (
            <EmptyState text={t('lobbyGeoEmpty')} />
          ) : geoTab === 'map' ? (
            cityMapItems.length ? (
              <div
                ref={geoMapContainerRef}
                aria-label={t('lobbyGeoMapAria')}
                style={{
                  width: '100%',
                  height: isMobile ? 300 : 450,
                  borderRadius: 10,
                  border: `1px solid ${c.border}`,
                  overflow: 'hidden',
                }}
              />
            ) : (
              <EmptyState text={t('lobbyGeoMapNoCoords')} />
            )
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label={t('lobbyGeoRankingAria')}
                style={{ width: '100%', height: 500, display: 'block' }}
              >
                <g transform={`translate(${chartMargin.left},${chartMargin.top})`}>
                  {xTicks.map((tick) => (
                    <g key={`tick-${tick}`} transform={`translate(${xScale(tick)},0)`}>
                      <line y1={0} y2={chartInnerHeight} stroke={c.border} strokeDasharray="2 4" />
                      <text
                        y={chartInnerHeight + 18}
                        textAnchor="middle"
                        style={{ fontFamily: fonts.mono, fontSize: 10, fill: c.muted }}
                      >
                        {tick.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')}
                      </text>
                    </g>
                  ))}

                  {cityRankingItems.map((item) => {
                    const y = yScale(item.city) ?? 0
                    const width = xScale((item.total_expenses ?? 0) / 1_000_000)
                    const isActiveCity = selectedCity === item.city
                    return (
                      <g key={item.city} transform={`translate(0,${y})`}>
                        <rect
                          x={0}
                          y={0}
                          width={Math.max(0, width)}
                          height={yScale.bandwidth()}
                          rx={4}
                          fill={isActiveCity ? (theme === 'dark' ? '#ff5a6f' : '#8f0018') : '#C8102E'}
                          opacity={isActiveCity ? 1 : 0.9}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedCity(item.city)
                            setPage(1)
                            document
                              .getElementById('lobby-filter-section')
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                        >
                          <title>
                            {`${item.city}${item.country ? ` (${item.country})` : ''}\n${t('lobbyTreemapCount')}: ${item.count.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')}\n${t('lobbyTreemapTotal')}: ${formatMoney(item.total_expenses)}\n${t('lobbyTreemapAvg')}: ${formatMoney(item.avg_expenses)}`}
                          </title>
                        </rect>
                        <text
                          x={-8}
                          y={yScale.bandwidth() / 2}
                          textAnchor="end"
                          dominantBaseline="middle"
                          style={{ fontFamily: fonts.body, fontSize: 12, fill: c.ink }}
                        >
                          {item.city}
                        </text>
                      </g>
                    )
                  })}
                  <text
                    x={chartInnerWidth / 2}
                    y={chartInnerHeight + 36}
                    textAnchor="middle"
                    style={{ fontFamily: fonts.mono, fontSize: 11, fill: c.muted }}
                  >
                    {t('lobbyGeoRankingXAxis')}
                  </text>
                </g>
              </svg>
            </div>
          )}
        </div>
      </DataCard>

      <DataCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <h3 style={{ margin: 0, fontFamily: fonts.display, color: c.ink }}>
            {t('lobbyTimelineTitle')}
          </h3>
          <p style={{ margin: 0, fontFamily: fonts.body, color: c.muted, lineHeight: 1.55 }}>
            {t('lobbyTimelineContext')}
          </p>

          {byTimeLoading ? (
            <LoadingSpinner />
          ) : byTimeError ? (
            <p style={{ margin: 0, fontFamily: fonts.body, color: c.muted }}>
              {t('dataLoadError')}
            </p>
          ) : !timeData.length ? (
            <EmptyState text={t('lobbyTimelineEmpty')} />
          ) : (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <div>
                <p style={{ margin: `0 0 ${spacing.xs}px`, fontFamily: fonts.mono, color: c.muted, fontSize: '0.72rem' }}>
                  {t('lobbyTimelineMonthlyTitle')}
                </p>
                <ResponsiveContainer width="100%" height={monthlyChartHeight}>
                  <BarChart data={timeData} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatTimelineTick}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={60}
                      tick={{ fontSize: 11, fill: c.muted, fontFamily: fonts.mono }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: c.muted, fontFamily: fonts.mono }} />
                    <Tooltip
                      formatter={(value) => [
                        formatTooltipNumber(value),
                        lang === 'de' ? 'Neue Registrierungen' : 'New registrations',
                      ]}
                      labelFormatter={(label) => label}
                      contentStyle={{
                        background: c.surface,
                        border: `1px solid ${c.border}`,
                        borderRadius: 4,
                        fontFamily: fonts.body,
                      }}
                    />
                    <ReferenceLine x="2022-02" stroke={c.red} strokeDasharray="4 4">
                      <Label value="↑ Pflichtregistrierung" position="top" fontSize={10} fill={c.red} />
                    </ReferenceLine>
                    <Bar dataKey="count" fill={c.red} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <p style={{ margin: `0 0 ${spacing.xs}px`, fontFamily: fonts.mono, color: c.muted, fontSize: '0.72rem' }}>
                  {t('lobbyTimelineCumulativeTitle')}
                </p>
                <ResponsiveContainer width="100%" height={cumulativeChartHeight}>
                  <AreaChart data={timeData} margin={{ top: 10, right: 30, bottom: 60, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatTimelineTick}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={60}
                      tick={{ fontSize: 11, fill: c.muted, fontFamily: fonts.mono }}
                    />
                    <YAxis
                      tickFormatter={(val: number) => val.toLocaleString('de-DE')}
                      tick={{ fontSize: 11, fill: c.muted, fontFamily: fonts.mono }}
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatTooltipNumber(value),
                        lang === 'de' ? 'Registrierungen gesamt' : 'Total registrations',
                      ]}
                      labelFormatter={(label) => label}
                      contentStyle={{
                        background: c.surface,
                        border: `1px solid ${c.border}`,
                        borderRadius: 4,
                        fontFamily: fonts.body,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke={c.red}
                      fill={c.red}
                      fillOpacity={0.15}
                      strokeWidth={2}
                      dot={{ r: 2, fill: c.red }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </DataCard>

      <div id="lobby-filter-section">
        <DataCard>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: spacing.md,
            }}
          >
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <label
              htmlFor="lobby-search"
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: c.muted,
              }}
            >
              {t('lobbySearchLabel')}
            </label>
            <input
              id="lobby-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearch(searchInput.trim())
                  setPage(1)
                }
              }}
              placeholder={t('lobbySearchPlaceholder')}
              style={{
                minHeight: 44,
                borderRadius: 8,
                border: `1px solid ${c.inputBorder}`,
                background: c.inputBg,
                color: c.ink,
                fontFamily: fonts.body,
                fontSize: '0.95rem',
                padding: `0 ${spacing.md}px`,
              }}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                gap: spacing.sm,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                <label
                  htmlFor="lobby-foi"
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: c.muted,
                  }}
                >
                  {lang === 'de' ? 'Interessensgebiet' : 'Field of interest'}
                </label>
                <select
                  id="lobby-foi"
                  value={selectedFoi}
                  onChange={(e) => setSelectedFoi(e.target.value)}
                  style={{
                    minHeight: 44,
                    borderRadius: 8,
                    border: `1px solid ${c.inputBorder}`,
                    background: c.inputBg,
                    color: c.ink,
                    fontFamily: fonts.body,
                    fontSize: '0.92rem',
                    padding: `0 ${spacing.md}px`,
                  }}
                >
                  {foiOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                <label
                  htmlFor="lobby-active-only"
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: c.muted,
                  }}
                >
                  {lang === 'de' ? 'Status' : 'Status'}
                </label>
                <label
                  htmlFor="lobby-active-only"
                  style={{
                    minHeight: 44,
                    borderRadius: 8,
                    border: `1px solid ${c.inputBorder}`,
                    background: c.inputBg,
                    color: c.ink,
                    fontFamily: fonts.body,
                    fontSize: '0.92rem',
                    padding: `0 ${spacing.md}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    id="lobby-active-only"
                    type="checkbox"
                    checked={onlyActive}
                    onChange={(e) => setOnlyActive(e.target.checked)}
                  />
                  <span>
                    {onlyActive
                      ? lang === 'de'
                        ? 'Nur aktive Organisationen'
                        : 'Active organizations only'
                      : lang === 'de'
                        ? 'Alle Organisationen (inkl. inaktive)'
                        : 'All organizations (including inactive)'}
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                <label
                  htmlFor="lobby-min-expense"
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: c.muted,
                  }}
                >
                  {lang === 'de' ? 'Mindestausgaben' : 'Minimum expenses'}
                </label>
                <select
                  id="lobby-min-expense"
                  value={String(minExpense)}
                  onChange={(e) => setMinExpense(Number(e.target.value))}
                  style={{
                    minHeight: 44,
                    borderRadius: 8,
                    border: `1px solid ${c.inputBorder}`,
                    background: c.inputBg,
                    color: c.ink,
                    fontFamily: fonts.body,
                    fontSize: '0.92rem',
                    padding: `0 ${spacing.md}px`,
                  }}
                >
                  {minExpenseOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                <label
                  htmlFor="lobby-city"
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: c.muted,
                  }}
                >
                  {t('lobbyFilterCityLabel')}
                </label>
                <select
                  id="lobby-city"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  style={{
                    minHeight: 44,
                    borderRadius: 8,
                    border: `1px solid ${c.inputBorder}`,
                    background: c.inputBg,
                    color: c.ink,
                    fontFamily: fonts.body,
                    fontSize: '0.92rem',
                    padding: `0 ${spacing.md}px`,
                  }}
                >
                  {cityOptions.map((option) => (
                    <option key={option.value || 'all-cities'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch(searchInput.trim())
                setPage(1)
              }}
              style={{
                minHeight: 44,
                borderRadius: 8,
                border: `1px solid ${c.red}`,
                background: c.red,
                color: '#fff',
                fontFamily: fonts.mono,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {t('lobbySearchButton')}
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  setSearch('')
                  setSelectedFoi('')
                  setOnlyActive(true)
                  setMinExpense(0)
                  setSelectedCity('')
                  setPage(1)
                }}
                style={{
                  minHeight: 44,
                  borderRadius: 8,
                  border: `1px solid ${c.border}`,
                  background: c.cardBg,
                  color: c.ink,
                  fontFamily: fonts.mono,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                {t('lobbyFiltersReset')}
              </button>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <label
              htmlFor="lobby-sort"
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: c.muted,
              }}
            >
              {t('lobbySortLabel')}
            </label>
            <select
              id="lobby-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
              style={{
                minHeight: 44,
                borderRadius: 8,
                border: `1px solid ${c.inputBorder}`,
                background: c.inputBg,
                color: c.ink,
                fontFamily: fonts.body,
                fontSize: '0.95rem',
                padding: `0 ${spacing.md}px`,
              }}
            >
              <option value="financial_expenses_euro DESC">{t('lobbySortExpensesDesc')}</option>
              <option value="financial_expenses_euro ASC">{t('lobbySortExpensesAsc')}</option>
              <option value="name ASC">{t('lobbySortNameAsc')}</option>
              <option value="name DESC">{t('lobbySortNameDesc')}</option>
            </select>
          </div>
          </div>
        </DataCard>
      </div>

      <section id={listAnchorId} style={{ marginTop: spacing.xl }}>
        {hasActiveFilters ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            {search.trim() ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  setSearch('')
                  setPage(1)
                }}
                style={{
                  minHeight: 32,
                  borderRadius: 999,
                  border: `1px solid ${c.border}`,
                  background: c.bgAlt,
                  color: c.ink,
                  fontFamily: fonts.body,
                  fontSize: '0.82rem',
                  padding: `0 ${spacing.md}px`,
                  cursor: 'pointer',
                }}
              >
                {`${t('lobbySearchLabel')}: ${search} ×`}
              </button>
            ) : null}
            {selectedFoi ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedFoi('')
                  setPage(1)
                }}
                style={{
                  minHeight: 32,
                  borderRadius: 999,
                  border: `1px solid ${c.border}`,
                  background: c.bgAlt,
                  color: c.ink,
                  fontFamily: fonts.body,
                  fontSize: '0.82rem',
                  padding: `0 ${spacing.md}px`,
                  cursor: 'pointer',
                }}
              >
                {`${t('lobbyFilterTagField')}: ${selectedFoiLabel} ×`}
              </button>
            ) : null}
            {selectedCity ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCity('')
                  setPage(1)
                }}
                style={{
                  minHeight: 32,
                  borderRadius: 999,
                  border: `1px solid ${c.border}`,
                  background: c.bgAlt,
                  color: c.ink,
                  fontFamily: fonts.body,
                  fontSize: '0.82rem',
                  padding: `0 ${spacing.md}px`,
                  cursor: 'pointer',
                }}
              >
                {`${t('lobbyFilterTagCity')}: ${selectedCity} ×`}
              </button>
            ) : null}
            {minExpense > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setMinExpense(0)
                  setPage(1)
                }}
                style={{
                  minHeight: 32,
                  borderRadius: 999,
                  border: `1px solid ${c.border}`,
                  background: c.bgAlt,
                  color: c.ink,
                  fontFamily: fonts.body,
                  fontSize: '0.82rem',
                  padding: `0 ${spacing.md}px`,
                  cursor: 'pointer',
                }}
              >
                {`${t('lobbyFilterTagMinExpense')}: ${selectedMinExpenseLabel} ×`}
              </button>
            ) : null}
            {!onlyActive ? (
              <button
                type="button"
                onClick={() => {
                  setOnlyActive(true)
                  setPage(1)
                }}
                style={{
                  minHeight: 32,
                  borderRadius: 999,
                  border: `1px solid ${c.border}`,
                  background: c.bgAlt,
                  color: c.ink,
                  fontFamily: fonts.body,
                  fontSize: '0.82rem',
                  padding: `0 ${spacing.md}px`,
                  cursor: 'pointer',
                }}
              >
                {`${t('lobbyFilterTagIncludeInactive')} ×`}
              </button>
            ) : null}
          </div>
        ) : null}
        {listLoading ? (
          <LoadingSpinner />
        ) : listError ? (
          <p style={{ fontFamily: fonts.body, fontSize: '0.95rem', color: c.muted }}>
            {t('dataLoadError')}
          </p>
        ) : !listData?.items?.length ? (
          <EmptyState text={`${t('lobbyEmptyTitle')} ${t('lobbyEmptyBody')}`} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {listData.items.map((item) => {
              const fields = fieldArray(item.fields_of_interest)
              const visible = fields.slice(0, 3)
              const extra = Math.max(0, fields.length - visible.length)
              const legalForm = getLegalFormLabel(item.legal_form)
              return (
                <DataCard
                  key={item.register_number}
                  onClick={() => {
                    setDetailTab('overview')
                    setSelectedRegisterNumber(item.register_number)
                  }}
                  header={
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: spacing.md,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: fonts.body,
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: c.ink,
                        }}
                      >
                        {item.name || item.register_number}
                      </span>
                      <Badge
                        text={item.active ? t('lobbyStatusActive') : t('lobbyStatusInactive')}
                        variant={item.active ? 'yes' : 'muted'}
                      />
                    </div>
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    <p style={{ margin: 0, fontFamily: fonts.body, color: c.inkSoft, fontSize: '0.92rem' }}>
                      {[legalForm, item.city].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                      {visible.map((f) => (
                        <Badge key={`${item.register_number}-${f}`} text={f} variant="gray" />
                      ))}
                      {extra > 0 ? <Badge text={`+${extra}`} variant="muted" /> : null}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
                        gap: spacing.md,
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: fonts.mono, color: c.muted, fontSize: '0.68rem' }}>
                          {t('lobbyExpenses')}
                        </div>
                        <div style={{ fontFamily: fonts.body, color: c.ink, fontSize: '0.95rem', fontWeight: 600 }}>
                          {formatMoney(item.financial_expenses_euro)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: fonts.mono, color: c.muted, fontSize: '0.68rem' }}>
                          {t('lobbyFte')}
                        </div>
                        <div style={{ fontFamily: fonts.body, color: c.ink, fontSize: '0.95rem', fontWeight: 600 }}>
                          {item.employee_fte != null ? item.employee_fte.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB') : '—'}
                        </div>
                      </div>
                      <div>
                        <a
                          href={item.details_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: '0.75rem',
                            color: c.red,
                            textDecoration: 'none',
                          }}
                        >
                          {t('lobbyOpenDetails')} →
                        </a>
                      </div>
                    </div>
                  </div>
                </DataCard>
              )
            })}

            <Pagination current={page} total={totalPages} onChange={setPage} />
            <p style={{ margin: 0, color: c.muted, fontFamily: fonts.body, fontSize: '0.88rem' }}>
              {lang === 'de'
                ? `${(listData?.total ?? 0).toLocaleString('de-DE')} Organisationen gefunden`
                : `${(listData?.total ?? 0).toLocaleString('en-GB')} organizations found`}
            </p>
          </div>
        )}
      </section>

      {selectedRegisterNumber ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedRegisterNumber(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: c.overlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.md,
            zIndex: 40,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '95vw' : '100%',
              maxWidth: 720,
              maxHeight: isMobile ? '85vh' : '90vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <DataCard>
              {detailLoading ? (
                <LoadingSpinner />
              ) : detailError || !detailData ? (
                <p style={{ margin: 0, color: c.muted, fontFamily: fonts.body }}>{t('dataLoadError')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRegisterNumber(null)}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      alignSelf: 'flex-end',
                      minHeight: 44,
                      borderRadius: 8,
                      border: `1px solid ${c.border}`,
                      background: c.cardBg,
                      color: c.ink,
                      fontFamily: fonts.mono,
                      fontSize: '0.75rem',
                      padding: `0 ${spacing.md}px`,
                      cursor: 'pointer',
                    }}
                  >
                    {t('electionsClose')}
                  </button>
                  <h3 style={{ margin: 0, fontFamily: fonts.display, color: c.ink }}>
                    {detailData.name || detailData.register_number}
                  </h3>
                  <p style={{ margin: 0, fontFamily: fonts.body, color: c.inkSoft }}>
                    {[
                      getLegalFormLabel(detailData.legal_form),
                      detailData.city,
                    ].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <div
                    role="tablist"
                    aria-label={t('lobbyDetailTabsAria')}
                    style={{
                      display: 'flex',
                      gap: spacing.sm,
                      borderBottom: `1px solid ${c.border}`,
                      overflowX: 'auto',
                      paddingBottom: spacing.sm,
                    }}
                  >
                    {([
                      { key: 'overview', label: t('lobbyDetailTabOverview') },
                      { key: 'projects', label: t('lobbyDetailTabProjects') },
                    ] as const).map((tab) => {
                      const active = detailTab === tab.key
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setDetailTab(tab.key)}
                          style={{
                            minHeight: 44,
                            padding: `0 ${spacing.md}px`,
                            borderRadius: 8,
                            border: `1px solid ${active ? c.red : c.border}`,
                            background: active ? c.bgHover : c.bgAlt,
                            color: active ? c.red : c.muted,
                            fontFamily: fonts.mono,
                            fontSize: '0.72rem',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                  {detailTab === 'overview' ? (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                        {fieldArray(detailData.fields_of_interest).slice(0, 6).map((field) => (
                          <Badge key={`${detailData.register_number}-${field}`} text={field} variant="gray" />
                        ))}
                      </div>
                      <p style={{ margin: 0, fontFamily: fonts.body, color: c.inkSoft, lineHeight: 1.6 }}>
                        {detailData.activity_description || t('lobbyNoDescription')}
                      </p>
                    </>
                  ) : projectsLoading ? (
                    <LoadingSpinner />
                  ) : projectsError ? (
                    <p style={{ margin: 0, color: c.muted, fontFamily: fonts.body }}>{t('dataLoadError')}</p>
                  ) : !(projectsData?.items?.length) ? (
                    <EmptyState text={t('lobbyProjectsEmpty')} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                      {projectsData.items.map((project) => {
                        const lawTags = getAffectedLaws(project.affected_laws).slice(0, 8)
                        const ministry = getMinistry(project.leading_ministries)
                        const projectKey = project.project_number || String(project.id)
                        const isExpanded = expandedProject === projectKey
                        const description = (project.description || '').trim()
                        const shortDesc =
                          description.length > 200
                            ? `${description.slice(0, 200)}...`
                            : description
                        return (
                          <div
                            key={`${project.id}-${project.project_number ?? ''}`}
                            style={{
                              border: `1px solid ${c.border}`,
                              borderRadius: 8,
                              padding: spacing.md,
                              background: c.bgAlt,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: spacing.sm,
                            }}
                          >
                            <div style={{ fontFamily: fonts.body, color: c.ink, fontWeight: 700 }}>
                              {project.title || t('lobbyProjectUntitled')}
                            </div>
                            {lawTags.length ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
                                {lawTags.map((tag) => (
                                  <Badge key={`${project.id}-${tag}`} text={tag} variant="gray" />
                                ))}
                              </div>
                            ) : null}
                            <p
                              style={{
                                margin: 0,
                                fontFamily: fonts.body,
                                color: c.inkSoft,
                                lineHeight: 1.6,
                              }}
                            >
                              {description ? (isExpanded ? description : shortDesc) : '—'}
                            </p>
                            {description.length > 200 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedProject(isExpanded ? null : projectKey)
                                }
                                style={{
                                  alignSelf: 'flex-start',
                                  minHeight: 32,
                                  padding: `0 ${spacing.sm}px`,
                                  borderRadius: 6,
                                  border: `1px solid ${c.border}`,
                                  background: c.cardBg,
                                  color: c.red,
                                  fontFamily: fonts.mono,
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                }}
                              >
                                {isExpanded ? t('expandLess') : t('expandMore')}
                              </button>
                            ) : null}
                            <div style={{ fontFamily: fonts.mono, fontSize: '0.74rem', color: c.muted }}>
                              {t('lobbyProjectMinistry')}: {ministry || project.federal_ministry || '—'}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.md }}>
                              {project.project_url ? (
                                <a
                                  href={project.project_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: c.red, textDecoration: 'none', fontFamily: fonts.mono, fontSize: '0.75rem' }}
                                >
                                  {t('lobbyProjectLinkProject')} →
                                </a>
                              ) : null}
                              {project.document_url ? (
                                <a
                                  href={project.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: c.red, textDecoration: 'none', fontFamily: fonts.mono, fontSize: '0.75rem' }}
                                >
                                  {t('lobbyProjectLinkDocument')} →
                                </a>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {selectedRegisterNumber ? (
                    <div style={{ marginTop: spacing.lg }}>
                      <h4
                        style={{
                          fontFamily: fonts.display,
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: c.ink,
                          margin: 0,
                          marginBottom: spacing.xs,
                        }}
                      >
                        {t('lobbyAffectedLawsTitle')}
                      </h4>
                      {gesetzeLoading ? (
                        <LoadingSpinner />
                      ) : gesetzeError ? (
                        <p
                          style={{
                            fontFamily: fonts.body,
                            color: c.no,
                            fontSize: '0.84rem',
                            margin: 0,
                          }}
                        >
                          {t('dataLoadError')}
                        </p>
                      ) : lobbyGesetze && lobbyGesetze.items.length > 0 ? (
                        <>
                          <p
                            style={{
                              fontFamily: fonts.body,
                              color: c.muted,
                              fontSize: '0.82rem',
                              marginTop: 0,
                              marginBottom: spacing.md,
                            }}
                          >
                            {t('lobbyAffectedLawsSubtitle')
                              .replace('{mapped}', String(lobbyGesetze.stats.projekte_mit_mapping))
                              .replace('{total}', String(lobbyGesetze.stats.projekte_gesamt))
                              .replace('{unique}', String(lobbyGesetze.stats.unique_gesetze))}
                          </p>
                          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                            {lobbyGesetze.items.slice(0, 15).map((item) => (
                              <li
                                key={item.gesetz_id}
                                style={{
                                  borderBottom: `1px solid ${c.border}`,
                                  paddingBottom: spacing.xs,
                                }}
                              >
                                {item.aenderung_id ? (
                                  <Link
                                    to={`/gesetze/${item.aenderung_id}`}
                                    onClick={() => setSelectedRegisterNumber(null)}
                                    style={{
                                      display: 'block',
                                      color: c.red,
                                      textDecoration: 'none',
                                      fontFamily: fonts.body,
                                      fontSize: '0.9rem',
                                    }}
                                  >
                                    <span style={{ fontWeight: 700 }}>
                                      {item.titel_offiziell || item.name || item.kuerzel || '—'}
                                    </span>
                                    {item.kuerzel ? (
                                      <span style={{ color: c.muted, marginLeft: spacing.xs }}>
                                        ({item.kuerzel})
                                      </span>
                                    ) : null}
                                    <div style={{ fontFamily: fonts.mono, fontSize: '0.75rem', color: c.muted }}>
                                      {item.projekt_count} {t('lobbyProjects')}
                                    </div>
                                  </Link>
                                ) : (
                                  <div style={{ fontFamily: fonts.body, fontSize: '0.9rem', color: c.ink }}>
                                    {item.titel_offiziell || item.name || item.kuerzel || '—'}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                          {lobbyGesetze.items.length > 15 ? (
                            <p style={{ fontFamily: fonts.body, color: c.muted, fontSize: '0.82rem', marginTop: spacing.sm }}>
                              {t('lobbyAffectedLawsMore').replace('{count}', String(lobbyGesetze.items.length - 15))}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p
                          style={{
                            fontFamily: fonts.body,
                            color: c.muted,
                            fontSize: '0.84rem',
                            margin: 0,
                          }}
                        >
                          {t('lobbyAffectedLawsEmpty')}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </DataCard>
          </div>
        </div>
      ) : null}
    </>
  )
}
