import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { EmptyState, PageHeader, useTheme, ViewToggle } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { buildKreiseMap } from './elections/mapGeometry'
import { filterKreiseSearchHits } from './elections/KreisAutocomplete'
import { normalizeMapRow } from './elections/normalizeWahlen'
import { mitNachfolgern } from './elections/electionUiUtils'
import type { GesamtErgebnis } from './elections/Gesamtergebnis'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useSeo } from '../hooks/useSeo'
import type {
  ElectionType,
  KreiseGeoJson,
  MapRow,
  MapRowFromApi,
} from './elections/types'

const MapMode = lazy(() =>
  import('./elections/MapMode').then((m) => ({ default: m.MapMode })),
)
const DistrictAnalysis = lazy(() =>
  import('./elections/DistrictAnalysis').then((m) => ({
    default: m.DistrictAnalysis,
  })),
)
const CompareMode = lazy(() =>
  import('./elections/CompareMode').then((m) => ({ default: m.CompareMode })),
)

export type ElectionsActiveMode = 'map' | 'analysis' | 'compare'

/** Nur diese Wahlen finden bundesweit am selben Tag statt */
const BUNDESWEIT = new Set<ElectionType>(['federal', 'european'])

const MODE_TAB_KEYS = {
  map: 'modeMap',
  analysis: 'modeAnalysis',
  compare: 'modeCompare',
} as const

export default function Elections() {
  const { c, t } = useTheme()
  useSeo({ titel: "Wahlergebnisse in Deutschland seit 1990", beschreibung: "Ergebnisse aller Bundestags-, Landtags- und Kommunalwahlen seit 1990, nach Kreis und Bundesland." })
  const geoRef = useRef<KreiseGeoJson | null>(null)
  const [geojson, setGeojson] = useState<KreiseGeoJson | null>(null)
  const [geoErr, setGeoErr] = useState(false)

  const [activeMode, setActiveMode] = useState<ElectionsActiveMode>('map')
  const [electionType, setElectionType] = useState<ElectionType>('federal')
  const [year, setYear] = useState<number>(2025)
  const [metric, setMetric] = useState<string>('winning_party')
  const [selectedAgs, setSelectedAgs] = useState<string | null>(null)
  const [compareRegions, setCompareRegions] = useState<string[]>([])

  const [searchQuery, setSearchQuery] = useState('')

  const narrow = useIsMobile()

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
        if (!r.ok) {
          throw new Error(`GeoJSON HTTP ${r.status} ${geoUrl}`)
        }
        return r.json() as Promise<KreiseGeoJson>
      })
      .then((data) => {
        if (cancelled) return
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
    return mitNachfolgern(m)
  }, [normalizedRows])

  const winnersByAgs = dataByAgs

  // Ergebnis der ganzen Wahl. Bei Landtags- und Kommunalwahlen waehlen die
  // Laender in verschiedenen Jahren, eine Summe ueber alle waere irrefuehrend.
  const gesamtEp =
    BUNDESWEIT.has(debouncedType) && debouncedYear
      ? `/api/wahlen/gesamt?typ=${encodeURIComponent(debouncedType)}&year=${debouncedYear}`
      : ''
  const { data: gesamtRoh } = useApi<GesamtErgebnis>(gesamtEp)
  const gesamt =
    gesamtRoh && gesamtRoh.typ === debouncedType && gesamtRoh.year === debouncedYear && gesamtRoh.parteien?.length
      ? gesamtRoh
      : null

  const turnoutStats = useMemo(() => {
    // Nur Kreise mit Wahlbeteiligung: eine Luecke (NaN) ist keine 0 %
    const withTurnout = normalizedRows.filter((r) => Number.isFinite(r.turnout))
    const n = normalizedRows.length
    if (!withTurnout.length) {
      return {
        avg: Number.NaN,
        hi: { name: '-', v: Number.NaN },
        lo: { name: '-', v: Number.NaN },
        n,
        minT: 0,
        maxT: 100,
      }
    }
    let sum = 0
    let hi = { name: withTurnout[0]!.ags_name, v: withTurnout[0]!.turnout }
    let lo = hi
    for (const r of withTurnout) {
      sum += r.turnout
      if (r.turnout > hi.v) hi = { name: r.ags_name, v: r.turnout }
      if (r.turnout < lo.v) lo = { name: r.ags_name, v: r.turnout }
    }
    return {
      avg: sum / withTurnout.length,
      hi,
      lo,
      n,
      minT: lo.v,
      maxT: hi.v,
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
      <PageHeader title={t('electionsResultsTitle')} subtitle={t('electionsResultsSubtitle')} />

      <ViewToggle
        value={activeMode}
        onChange={setActiveMode}
        ariaLabel={t('electionsTitle')}
        options={modeTabs.map((m) => ({ value: m.id, label: m.label }))}
        style={{ marginBottom: spacing.lg }}
      />

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
            debouncedType={debouncedType}
            debouncedYear={debouncedYear}
            debouncedMetric={debouncedMetric}
            normalizedRows={normalizedRows}
            mapBuild={mapBuild}
            dataByAgs={dataByAgs}
            kreisNameByAgs={kreisNameByAgs}
            turnoutStats={turnoutStats}
            gesamt={gesamt}
            selectedAgs={selectedAgs}
            onActivateKreis={onActivateKreis}
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
              compareRegions={compareRegions}
              setCompareRegions={setCompareRegions}
              onOpenCompare={() => setActiveMode('compare')}
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
          <CompareMode
            compareRegions={compareRegions}
            setCompareRegions={setCompareRegions}
            kreisNameByAgs={kreisNameByAgs}
            geojson={geojson}
            narrow={narrow}
            initialElectionType={electionType}
            onBackToMap={() => setActiveMode('map')}
          />
        )}
      </Suspense>
    </div>
  )
}
