import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  DataCard,
  EmptyState,
  PageHeader,
  useTheme,
} from '../design-system'
import { breakpoints, fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { AdvancedAnalysis } from './elections/AdvancedAnalysis'
import { ElectionMap, ElectionMapLegend } from './elections/ElectionMap'
import { mapFillColor } from './elections/mapColors'
import { buildKreiseMap } from './elections/mapGeometry'
import { normalizeMapRow } from './elections/normalizeWahlen'
import {
  MAIN_PARTIES,
  PARTY_LABELS,
  partyColorsForTheme,
} from './elections/partyColors'
import { RegionPanel } from './elections/RegionPanel'
import { useDebouncedValue } from './elections/useDebouncedValue'
import type {
  ElectionType,
  KreiseGeoJson,
  MapRow,
  MapRowFromApi,
} from './elections/types'
import type { I18nKey } from '../design-system/i18n'

const ELECTION_TYPES: ElectionType[] = [
  'federal',
  'state',
  'municipal',
  'european',
  'mayoral',
]

const METRICS = ['winning_party', 'turnout', ...MAIN_PARTIES] as const

function selectCss(c: {
  inputBg: string
  inputBorder: string
  ink: string
}): CSSProperties {
  return {
    minHeight: 44,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${c.inputBorder}`,
    background: c.inputBg,
    color: c.ink,
    fontFamily: fonts.body,
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
  }
}

function typeLabel(t: (k: I18nKey) => string, typ: ElectionType) {
  switch (typ) {
    case 'federal':
      return t('federal')
    case 'state':
      return t('state')
    case 'municipal':
      return t('municipal')
    case 'european':
      return t('european')
    case 'mayoral':
      return t('mayoral')
    default:
      return typ
  }
}

function metricLabel(t: (k: I18nKey) => string, lang: 'de' | 'en', m: string) {
  if (m === 'winning_party') return t('winningParty')
  if (m === 'turnout') return t('turnout')
  return PARTY_LABELS[m]?.[lang] ?? m
}

const KREISE_EXPECTED = 400
const KREISE_COVERAGE_WARN_BELOW = 320

function sparseKreisBannerText(
  lang: 'de' | 'en',
  typ: ElectionType,
  typeName: string,
  year: number,
  count: number,
): string {
  const headDe = `Für ${typeName} ${year} liegen Daten für ${count} von ${KREISE_EXPECTED} Kreisen vor.`
  const headEn = `Data are available for ${count} of ${KREISE_EXPECTED} counties for ${typeName} ${year}.`
  if (lang === 'de') {
    const tail =
      typ === 'state'
        ? 'Landtagswahlen finden nicht in allen Bundesländern gleichzeitig statt.'
        : typ === 'municipal'
          ? 'Kommunalwahlen werden nicht bundesweit gleichzeitig abgehalten.'
          : typ === 'mayoral'
            ? 'Bürgermeisterwahlen finden individuell pro Gemeinde statt.'
            : 'Für dieses Jahr liegen nicht für alle Kreise Daten vor.'
    return `${headDe} ${tail}`
  }
  const tail =
    typ === 'state'
      ? 'State elections are not held simultaneously across all states.'
      : typ === 'municipal'
        ? 'Municipal elections are not held nationwide on the same date.'
        : typ === 'mayoral'
          ? 'Mayoral elections are scheduled individually per municipality.'
          : 'Data are not available for all counties for this year.'
  return `${headEn} ${tail}`
}

export default function Elections() {
  const { c, t, lang, theme } = useTheme()
  const geoRef = useRef<KreiseGeoJson | null>(null)
  const [geojson, setGeojson] = useState<KreiseGeoJson | null>(null)
  const [geoErr, setGeoErr] = useState(false)

  const [electionType, setElectionType] = useState<ElectionType>('federal')
  const [year, setYear] = useState<number>(2025)
  const [metric, setMetric] = useState<string>('winning_party')
  const [selectedAgs, setSelectedAgs] = useState<string | null>(null)
  const [compareAgs, setCompareAgs] = useState<string | null>(null)
  const [comparePicking, setComparePicking] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCompareAgs(null)
    setComparePicking(false)
  }, [selectedAgs])
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

  const agsNameMap = useMemo(
    () => Object.fromEntries(kreisNameByAgs) as Record<string, string>,
    [kreisNameByAgs],
  )

  const searchResults = useMemo(() => {
    const q = searchQuery.trim()
    if (!geojson || q.length < 2) return [] as { ags: string; name: string; state: string }[]
    const ql = q.toLowerCase()
    const out: { ags: string; name: string; state: string }[] = []
    for (const f of geojson.features) {
      const name = String(f.properties.name ?? '')
      if (!name.toLowerCase().includes(ql)) continue
      const ags = f.properties.ags?.replace(/\s/g, '') ?? ''
      if (!ags) continue
      out.push({ ags, name, state: String(f.properties.state ?? '') })
      if (out.length >= 8) break
    }
    return out
  }, [geojson, searchQuery])

  useEffect(() => {
    const t = searchQuery.trim()
    if (t.length < 2) {
      setShowSearchDropdown(false)
      return
    }
    setShowSearchDropdown(searchResults.length > 0)
  }, [searchQuery, searchResults])

  useEffect(() => {
    if (!showSearchDropdown) return
    const onDocMouseDown = (e: MouseEvent) => {
      const root = searchWrapRef.current
      if (root && !root.contains(e.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [showSearchDropdown])

  useEffect(() => {
    if (!showSearchDropdown) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSearchDropdown(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showSearchDropdown])

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

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (mapRows?.length) {
      console.log('[wahlen] map API response (first 5 raw)', mapRows.slice(0, 5))
    }
    if (normalizedRows.length && mapEp) {
      const sample = normalizedRows.slice(0, 5).map((r) => {
        const fill = mapFillColor({
          metric: debouncedMetric,
          value: r.value,
          turnout: r.turnout,
          winningParty: r.winning_party,
          turnoutMin: turnoutStats.minT,
          turnoutMax: turnoutStats.maxT,
          partyColors: partyColorsForTheme(theme === 'dark'),
        })
        return {
          ags: r.ags,
          ags_name: r.ags_name,
          turnout: r.turnout,
          value: r.value,
          winning_party: r.winning_party,
          fill,
        }
      })
      console.log(
        '[wahlen] first 5 kreise (normalized + computed map fill)',
        sample,
      )
    }
  }, [
    mapRows,
    normalizedRows,
    mapEp,
    debouncedMetric,
    turnoutStats.minT,
    turnoutStats.maxT,
    theme,
  ])

  const onMapSelect = useCallback(
    (ags: string) => {
      const k = ags.replace(/\s/g, '')
      if (comparePicking && selectedAgs && k !== selectedAgs) {
        setCompareAgs(k)
        setComparePicking(false)
        return
      }
      setSelectedAgs(k)
      setComparePicking(false)
    },
    [comparePicking, selectedAgs],
  )

  const onPickSearchKreis = useCallback((ags: string) => {
    setSelectedAgs(ags.replace(/\s/g, ''))
    setSearchQuery('')
    setShowSearchDropdown(false)
  }, [])

  const statCard = (title: string, body: string) => (
    <DataCard header={<span style={{ fontFamily: fonts.body, fontSize: '0.8rem', color: c.muted }}>{title}</span>}>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: '1.1rem',
          color: c.ink,
          lineHeight: 1.4,
        }}
      >
        {body}
      </div>
    </DataCard>
  )

  return (
    <div style={{ paddingBottom: spacing.xl }}>
      <PageHeader title={t('electionsTitle')} subtitle={t('electionsSubtitle')} />

      <div
        style={{
          display: 'flex',
          flexDirection: narrow ? 'column' : 'row',
          flexWrap: 'wrap',
          gap: spacing.md,
          marginTop: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <label style={{ flex: narrow ? '1 1 100%' : '1 1 200px' }}>
          <span
            style={{
              display: 'block',
              fontFamily: fonts.body,
              fontSize: '0.8rem',
              color: c.muted,
              marginBottom: 6,
            }}
          >
            {t('electionType')}
          </span>
          <select
            value={electionType}
            onChange={(e) => setElectionType(e.target.value as ElectionType)}
            style={selectCss(c)}
          >
            {ELECTION_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {typeLabel(t, tp)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: narrow ? '1 1 100%' : '1 1 160px' }}>
          <span
            style={{
              display: 'block',
              fontFamily: fonts.body,
              fontSize: '0.8rem',
              color: c.muted,
              marginBottom: 6,
            }}
          >
            {t('electionYear')}
          </span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            disabled={yearsLoading || !years.length}
            style={selectCss(c)}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: narrow ? '1 1 100%' : '1 1 220px' }}>
          <span
            style={{
              display: 'block',
              fontFamily: fonts.body,
              fontSize: '0.8rem',
              color: c.muted,
              marginBottom: 6,
            }}
          >
            {t('metric')}
          </span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            style={selectCss(c)}
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>
                {metricLabel(t, lang, m)}
              </option>
            ))}
          </select>
        </label>
        <div
          ref={searchWrapRef}
          style={{
            flex: narrow ? '1 1 100%' : '1 1 240px',
            position: 'relative',
          }}
        >
          <span
            style={{
              display: 'block',
              fontFamily: fonts.body,
              fontSize: '0.8rem',
              color: c.muted,
              marginBottom: 6,
            }}
          >
            {t('electionsDistrict')}
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              const tq = searchQuery.trim()
              if (tq.length >= 2 && searchResults.length > 0) {
                setShowSearchDropdown(true)
              }
            }}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            autoComplete="off"
            style={{
              ...selectCss(c),
              fontFamily: fonts.body,
              fontSize: '0.9rem',
            }}
          />
          {showSearchDropdown && searchResults.length > 0 && (
            <div
              role="listbox"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                zIndex: 10,
                background: c.surface,
                border: `1px solid ${c.border}`,
                boxShadow: c.shadow,
                borderRadius: 8,
                maxHeight: 300,
                overflowY: 'auto',
              }}
            >
              {searchResults.map((hit, i) => (
                <button
                  key={hit.ags}
                  type="button"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPickSearchKreis(hit.ags)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderBottom:
                      i < searchResults.length - 1
                        ? `1px solid ${c.border}`
                        : 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: fonts.body,
                    fontSize: '0.9rem',
                    color: c.ink,
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = c.bgHover
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span>{hit.name}</span>
                  {hit.state ? (
                    <span style={{ color: c.muted }}> · {hit.state}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {geoErr && (
        <p style={{ color: c.red, fontFamily: fonts.body, marginBottom: spacing.md }}>
          {t('noData')} (GeoJSON)
        </p>
      )}

      {mapError ? (
        <EmptyState text={`${t('dataLoadError')} ${t('noData')}`} />
      ) : (
        <>
          {!mapLoading &&
            !yearsLoading &&
            normalizedRows.length > 0 &&
            normalizedRows.length < KREISE_COVERAGE_WARN_BELOW && (
              <div
                role="status"
                style={{
                  padding: '8px 16px',
                  marginBottom: spacing.md,
                  borderRadius: 4,
                  fontSize: '0.82rem',
                  fontFamily: fonts.body,
                  lineHeight: 1.45,
                  background: theme === 'dark' ? '#332B00' : '#FFF3CD',
                  color: theme === 'dark' ? '#F5E6A3' : '#664D03',
                  border: `1px solid ${theme === 'dark' ? '#5C4D1A' : '#E8D9A8'}`,
                }}
              >
                {sparseKreisBannerText(
                  lang,
                  debouncedType,
                  typeLabel(t, debouncedType),
                  debouncedYear,
                  normalizedRows.length,
                )}
              </div>
            )}
          <ElectionMap
            mapBuild={mapBuild}
            dataByAgs={dataByAgs}
            kreisNameByAgs={kreisNameByAgs}
            metric={debouncedMetric}
            turnoutMin={turnoutStats.minT}
            turnoutMax={turnoutStats.maxT}
            lang={lang}
            onSelectAgs={onMapSelect}
            selectedAgs={selectedAgs}
            comparePickMode={comparePicking}
            loading={mapLoading || yearsLoading}
          />

          <ElectionMapLegend
            metric={debouncedMetric}
            lang={lang}
            turnoutMin={turnoutStats.minT}
            turnoutMax={turnoutStats.maxT}
            partyForScale={debouncedMetric}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: spacing.md,
              marginTop: spacing.xl,
            }}
          >
            {statCard(
              t('avgTurnout'),
              `${turnoutStats.avg.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`,
            )}
            {statCard(
              t('highestTurnout'),
              `${turnoutStats.hi.name} · ${turnoutStats.hi.v.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`,
            )}
            {statCard(
              t('lowestTurnout'),
              `${turnoutStats.lo.name} · ${turnoutStats.lo.v.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`,
            )}
            {statCard(t('counties'), String(turnoutStats.n))}
          </div>
        </>
      )}

      <div style={{ marginTop: spacing.xl }}>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            minHeight: 44,
            padding: '0 18px',
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.inputBg,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          {showAdvanced ? '▼ ' : '▶ '}
          {t('advancedAnalysis')}
        </button>
      </div>

      {showAdvanced && (
        <AdvancedAnalysis
          electionType={debouncedType}
          year={debouncedYear}
          years={years}
          mapBuild={mapBuild}
          winnersByAgs={winnersByAgs}
          kreisNameByAgs={kreisNameByAgs}
          onSelectRegion={(ags) => setSelectedAgs(ags.replace(/\s/g, ''))}
        />
      )}

      {comparePicking && (
        <div
          style={{
            position: 'fixed',
            bottom: narrow ? 100 : 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 125,
            padding: '12px 20px',
            borderRadius: 8,
            background: c.cardBg,
            border: `1px solid ${c.red}`,
            boxShadow: c.shadow,
            fontFamily: fonts.body,
            fontSize: '0.9rem',
            color: c.ink,
            maxWidth: '90vw',
          }}
        >
          {t('electionsCompareHint')}
        </div>
      )}

      {selectedAgs && (
        <RegionPanel
          ags={selectedAgs}
          agsNameMap={agsNameMap}
          mapYear={debouncedYear}
          mapTyp={debouncedType}
          compareAgs={compareAgs}
          comparePicking={comparePicking}
          onClose={() => {
            setSelectedAgs(null)
            setCompareAgs(null)
            setComparePicking(false)
          }}
          onStartCompare={() => setComparePicking(true)}
          onClearCompare={() => {
            setCompareAgs(null)
            setComparePicking(false)
          }}
        />
      )}
    </div>
  )
}
