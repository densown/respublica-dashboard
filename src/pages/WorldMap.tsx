import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTheme } from '../design-system'
import { breakpoints, fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import type { WorldCategoryApi, WorldGeoJson, WorldStats } from './worldmap/worldTypes'

const WorldMapMode = lazy(() =>
  import('./worldmap/WorldMapMode').then((m) => ({ default: m.WorldMapMode })),
)
const CountryAnalysis = lazy(() =>
  import('./worldmap/CountryAnalysis').then((m) => ({
    default: m.CountryAnalysis,
  })),
)
const CountryCompare = lazy(() =>
  import('./worldmap/CountryCompare').then((m) => ({
    default: m.CountryCompare,
  })),
)
const WorldScatterMode = lazy(() =>
  import('./worldmap/WorldScatterMode').then((m) => ({
    default: m.WorldScatterMode,
  })),
)
const WorldRankingMode = lazy(() =>
  import('./worldmap/WorldRankingMode').then((m) => ({
    default: m.WorldRankingMode,
  })),
)

export type WorldActiveMode =
  | 'map'
  | 'analysis'
  | 'compare'
  | 'scatter'
  | 'ranking'

const MODE_TAB_KEYS = {
  map: 'worldTabMap',
  analysis: 'worldTabCountry',
  compare: 'worldTabCompare',
  scatter: 'worldTabScatter',
  ranking: 'worldTabRanking',
} as const

const MODE_ORDER: WorldActiveMode[] = [
  'map',
  'analysis',
  'compare',
  'scatter',
  'ranking',
]

export default function WorldMap() {
  const { c, t } = useTheme()
  const geoRef = useRef<WorldGeoJson | null>(null)
  const [geojson, setGeojson] = useState<WorldGeoJson | null>(null)
  const [geoErr, setGeoErr] = useState(false)

  const [activeMode, setActiveMode] = useState<WorldActiveMode>('map')
  const [categoryId, setCategoryId] = useState('')
  const [indicatorCode, setIndicatorCode] = useState('NY.GDP.PCAP.CD')
  const [scatterIndicatorY, setScatterIndicatorY] = useState('SP.DYN.LE00.IN')
  const [year, setYear] = useState(2023)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

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

  const onSelectCountry = useCallback((iso3: string) => {
    setSelectedCountry(iso3.trim().toUpperCase())
    setActiveMode('analysis')
  }, [])

  const onBackToMap = useCallback(() => {
    setActiveMode('map')
  }, [])

  const modeTabs = MODE_ORDER.map((id) => ({
    id,
    label: t(MODE_TAB_KEYS[id]),
  }))

  return (
    <div style={{ paddingBottom: spacing.xl }}>
      <div style={{ marginBottom: spacing.sm }}>
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: narrow ? '1.55rem' : '1.85rem',
            lineHeight: 1.1,
            color: c.text,
          }}
        >
          {t('worldMap')}
        </h1>
        <p
          style={{
            margin: `${spacing.xs}px 0 0`,
            fontFamily: fonts.body,
            fontSize: narrow ? '0.86rem' : '0.92rem',
            lineHeight: 1.35,
            color: c.muted,
          }}
        >
          {t('worldPageSubtitle')}
        </p>
      </div>

      {geoErr && (
        <p
          style={{
            marginTop: spacing.md,
            color: '#b00020',
            fontFamily: fonts.body,
            fontSize: '0.9rem',
          }}
        >
          {t('dataLoadError')} (world.geojson)
        </p>
      )}

      <div
        style={{
          marginTop: spacing.sm,
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box',
        }}
      >
        <div
          role="tablist"
          aria-label={t('worldMap')}
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: `1px solid ${c.border}`,
            minWidth: 'min-content',
          }}
        >
          {modeTabs.map(({ id, label }) => {
            const isActive = activeMode === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveMode(id)}
                style={{
                  fontFamily: fonts.mono,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: narrow ? '8px 10px' : '9px 14px',
                  flexShrink: 0,
                  border: 'none',
                  borderBottom: isActive
                    ? '2px solid #C8102E'
                    : '2px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? c.text : c.muted,
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = c.text
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = c.muted
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <Suspense
        fallback={
          <div
            style={{
              padding: spacing.xl,
              textAlign: 'center',
              fontFamily: fonts.body,
              color: c.muted,
            }}
          >
            {t('loading')}
          </div>
        }
      >
        {activeMode === 'map' && (
          <div
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              minHeight: narrow ? '60vh' : 'calc(100vh - 260px)',
            }}
          >
            <WorldMapMode
              narrow={narrow}
              geojson={geojson}
              categories={categories}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              indicatorCode={indicatorCode}
              setIndicatorCode={setIndicatorCode}
              year={year}
              setYear={setYear}
              stats={stats}
              selectedIso={selectedCountry}
              onSelectCountry={onSelectCountry}
            />
          </div>
        )}
        {activeMode === 'analysis' && (
          <CountryAnalysis
            narrow={narrow}
            geojson={geojson}
            countryCode={selectedCountry}
            onCountryCode={setSelectedCountry}
            onBack={onBackToMap}
            indicatorCode={indicatorCode}
            setIndicatorCode={setIndicatorCode}
            year={year}
            categories={categories}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            statsYears={stats?.years_range ?? null}
          />
        )}
        {activeMode === 'compare' && (
          <CountryCompare
            narrow={narrow}
            geojson={geojson}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            indicatorCode={indicatorCode}
            setIndicatorCode={setIndicatorCode}
            statsYears={stats?.years_range ?? null}
            categories={categories}
            year={year}
          />
        )}
        {activeMode === 'scatter' && (
          <WorldScatterMode
            narrow={narrow}
            categories={categories}
            setCategoryId={setCategoryId}
            indicatorX={indicatorCode}
            setIndicatorX={setIndicatorCode}
            indicatorY={scatterIndicatorY}
            setIndicatorY={setScatterIndicatorY}
            year={year}
            setYear={setYear}
            statsYears={stats?.years_range ?? null}
            onSelectCountry={onSelectCountry}
          />
        )}
        {activeMode === 'ranking' && (
          <WorldRankingMode
            narrow={narrow}
            geojson={geojson}
            categories={categories}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            indicatorCode={indicatorCode}
            setIndicatorCode={setIndicatorCode}
            year={year}
            setYear={setYear}
            statsYears={stats?.years_range ?? null}
            highlightIso3="DEU"
          />
        )}
      </Suspense>
    </div>
  )
}
