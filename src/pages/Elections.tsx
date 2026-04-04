import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState, PageHeader, useTheme } from '../design-system'
import { breakpoints, fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { buildKreiseMap } from './elections/mapGeometry'
import { DistrictAnalysis } from './elections/DistrictAnalysis'
import { filterKreiseSearchHits } from './elections/KreisAutocomplete'
import { MapMode } from './elections/MapMode'
import { normalizeMapRow } from './elections/normalizeWahlen'
import { useDebouncedValue } from './elections/useDebouncedValue'
import type {
  ElectionType,
  KreiseGeoJson,
  MapRow,
  MapRowFromApi,
} from './elections/types'

export type ElectionsActiveMode = 'map' | 'analysis' | 'compare'

const MODE_TAB_KEYS = {
  map: 'modeMap',
  analysis: 'modeAnalysis',
  compare: 'modeCompare',
} as const

export default function Elections() {
  const { c, t } = useTheme()
  const geoRef = useRef<KreiseGeoJson | null>(null)
  const [geojson, setGeojson] = useState<KreiseGeoJson | null>(null)
  const [geoErr, setGeoErr] = useState(false)

  const [activeMode, setActiveMode] = useState<ElectionsActiveMode>('map')
  const [electionType, setElectionType] = useState<ElectionType>('federal')
  const [year, setYear] = useState<number>(2025)
  const [metric, setMetric] = useState<string>('winning_party')
  const [selectedAgs, setSelectedAgs] = useState<string | null>(null)
  const [compareRegions, setCompareRegions] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')

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
      base === '/' ? '/data/kreise.geojson' : `${base.replace(/\/$/, '')}/data/kreise.geojson`

    fetch(geoUrl)
      .then((r) => {
        console.log('[map] geojson status:', r.status, geoUrl)
        if (!r.ok) {
          throw new Error(`GeoJSON HTTP ${r.status} ${geoUrl}`)
        }
        return r.json() as Promise<KreiseGeoJson>
      })
      .then((data) => {
        if (cancelled) return
        console.log('[map] loaded features:', data.features?.length)
        geoRef.current = data
        setGeojson(data)
        setGeoErr(false)
      })
      .catch((err) => {
        console.error('[map] geojson fetch error:', err)
        if (!cancelled) setGeoErr(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const mapBuild = useMemo(
    () => (geojson ? buildKreiseMap(geojson) : null),
    [geojson],
  )

  const yearsEp = `/api/wahlen/years?typ=${encodeURIComponent(electionType)}`
  const { data: yearsRaw, loading: yearsLoading } = useApi<number[]>(yearsEp)

  const years = useMemo(() => {
    if (!yearsRaw?.length) return [] as number[]
    return [...yearsRaw].sort((a, b) => b - a)
  }, [yearsRaw])

  useEffect(() => {
    if (!years.length) return
    if (!years.includes(year)) setYear(years[0]!)
  }, [years, year])

  const debouncedType = useDebouncedValue(electionType, 300)
  const debouncedYear = useDebouncedValue(year, 300)
  const debouncedMetric = useDebouncedValue(metric, 300)

  const mapEp =
    debouncedType && debouncedYear
      ? `/api/wahlen/map?typ=${encodeURIComponent(debouncedType)}&year=${debouncedYear}&metric=${encodeURIComponent(debouncedMetric)}`
      : ''
  const { data: mapRows, loading: mapLoading, error: mapError } =
    useApi<MapRowFromApi[]>(mapEp)

  const kreisNameByAgs = useMemo(() => {
    const m = new Map<string, string>()
    if (!geojson) return m
    for (const f of geojson.features) {
      const a = f.properties.ags?.replace(/\s/g, '')
      if (a) m.set(a, f.properties.name)
    }
    return m
  }, [geojson])

  const searchResults = useMemo(
    () => filterKreiseSearchHits(geojson, searchQuery),
    [geojson, searchQuery],
  )

  const normalizedRows = useMemo(() => {
    if (!mapRows?.length) return [] as MapRow[]
    return mapRows.map((r) => normalizeMapRow(r, kreisNameByAgs))
  }, [mapRows, kreisNameByAgs])

  const dataByAgs = useMemo(() => {
    const m = new Map<string, MapRow>()
    for (const r of normalizedRows) {
      m.set(r.ags.replace(/\s/g, ''), r)
    }
    return m
  }, [normalizedRows])

  const winnersByAgs = dataByAgs

  const turnoutStats = useMemo(() => {
    if (!normalizedRows.length) {
      return {
        avg: 0,
        hi: { name: '-', v: 0 },
        lo: { name: '-', v: 100 },
        n: 0,
        minT: 0,
        maxT: 100,
      }
    }
    let sum = 0
    let hi = { name: normalizedRows[0]!.ags_name, v: normalizedRows[0]!.turnout }
    let lo = { name: normalizedRows[0]!.ags_name, v: normalizedRows[0]!.turnout }
    let minT = normalizedRows[0]!.turnout
    let maxT = normalizedRows[0]!.turnout
    for (const r of normalizedRows) {
      sum += r.turnout
      if (r.turnout > hi.v) hi = { name: r.ags_name, v: r.turnout }
      if (r.turnout < lo.v) lo = { name: r.ags_name, v: r.turnout }
      minT = Math.min(minT, r.turnout)
      maxT = Math.max(maxT, r.turnout)
    }
    return {
      avg: sum / normalizedRows.length,
      hi,
      lo,
      n: normalizedRows.length,
      minT,
      maxT,
    }
  }, [normalizedRows])

  const onActivateKreis = useCallback((ags: string) => {
    setSelectedAgs(ags.replace(/\s/g, ''))
    setActiveMode('analysis')
  }, [])

  const modeTabs = (
    ['map', 'analysis', 'compare'] as const
  ).map((id) => ({ id, label: t(MODE_TAB_KEYS[id]) }))

  return (
    <div style={{ paddingBottom: spacing.xl }}>
      <PageHeader title={t('electionsTitle')} subtitle={t('electionsSubtitle')} />

      <div
        style={{
          marginTop: spacing.md,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          role="tablist"
          aria-label={t('electionsTitle')}
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
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '12px 24px',
                  flexShrink: 0,
                  border: 'none',
                  borderBottom: isActive
                    ? '3px solid #C8102E'
                    : '3px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? c.ink : c.muted,
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = c.ink
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

      {activeMode === 'map' && (
        <MapMode
          narrow={narrow}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          electionType={electionType}
          setElectionType={setElectionType}
          year={year}
          setYear={setYear}
          metric={metric}
          setMetric={setMetric}
          years={years}
          yearsLoading={yearsLoading}
          geoErr={geoErr}
          mapError={mapError}
          mapLoading={mapLoading}
          mapRows={mapRows}
          mapEp={mapEp}
          debouncedType={debouncedType}
          debouncedYear={debouncedYear}
          debouncedMetric={debouncedMetric}
          normalizedRows={normalizedRows}
          mapBuild={mapBuild}
          dataByAgs={dataByAgs}
          kreisNameByAgs={kreisNameByAgs}
          turnoutStats={turnoutStats}
          selectedAgs={selectedAgs}
          onActivateKreis={onActivateKreis}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          winnersByAgs={winnersByAgs}
        />
      )}

      {activeMode === 'analysis' &&
        (selectedAgs ? (
          <DistrictAnalysis
            ags={selectedAgs}
            kreisNameByAgs={kreisNameByAgs}
            geojson={geojson}
            mapElectionType={electionType}
            mapYear={year}
            narrow={narrow}
            onBackToMap={() => setActiveMode('map')}
            onSelectKreis={(next) => setSelectedAgs(next)}
            onStartCompare={(a) => {
              setCompareRegions([a])
              setActiveMode('compare')
            }}
          />
        ) : (
          <EmptyState
            text={t('electionsTabAnalysisPlaceholder')}
            action={{
              label: t('backToMap'),
              onClick: () => setActiveMode('map'),
            }}
          />
        ))}

      {activeMode === 'compare' && (
        <EmptyState
          text={
            compareRegions.length
              ? `${t('electionsTabComparePlaceholder')} (${compareRegions.length})`
              : t('electionsTabComparePlaceholder')
          }
          action={{
            label: t('backToMap'),
            onClick: () => setActiveMode('map'),
          }}
        />
      )}
    </div>
  )
}
