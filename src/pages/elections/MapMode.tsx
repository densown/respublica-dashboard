import {
  useEffect,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  DataCard,
  EmptyState,
  useTheme,
} from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import { AdvancedAnalysis } from './AdvancedAnalysis'
import { ElectionMap, ElectionMapLegend } from './ElectionMap'
import { mapFillColor } from './mapColors'
import { KreisAutocomplete, type KreisSearchHit } from './KreisAutocomplete'
import {
  MAIN_PARTIES,
  PARTY_LABELS,
  partyColorsForTheme,
} from './partyColors'
import type { KreiseMapBuild } from './mapGeometry'
import type {
  ElectionType,
  MapRow,
  MapRowFromApi,
} from './types'
import type { I18nKey } from '../../design-system/i18n'

const ELECTION_TYPES: ElectionType[] = [
  'federal',
  'state',
  'municipal',
  'european',
  'mayoral',
]

const METRICS = ['winning_party', 'turnout', ...MAIN_PARTIES] as const

const KREISE_EXPECTED = 400
const KREISE_COVERAGE_WARN_BELOW = 320

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

export type MapModeProps = {
  narrow: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: KreisSearchHit[]
  electionType: ElectionType
  setElectionType: (v: ElectionType) => void
  year: number
  setYear: (v: number) => void
  metric: string
  setMetric: (v: string) => void
  years: number[]
  yearsLoading: boolean
  geoErr: boolean
  mapError: string | null
  mapLoading: boolean
  mapRows: MapRowFromApi[] | null
  mapEp: string
  debouncedType: ElectionType
  debouncedYear: number
  debouncedMetric: string
  normalizedRows: MapRow[]
  mapBuild: KreiseMapBuild | null
  dataByAgs: Map<string, MapRow>
  kreisNameByAgs: Map<string, string>
  turnoutStats: {
    avg: number
    hi: { name: string; v: number }
    lo: { name: string; v: number }
    n: number
    minT: number
    maxT: number
  }
  selectedAgs: string | null
  onActivateKreis: (ags: string) => void
  showAdvanced: boolean
  setShowAdvanced: Dispatch<SetStateAction<boolean>>
  winnersByAgs: Map<string, MapRow>
}

export function MapMode({
  narrow,
  searchQuery,
  setSearchQuery,
  searchResults,
  electionType,
  setElectionType,
  year,
  setYear,
  metric,
  setMetric,
  years,
  yearsLoading,
  geoErr,
  mapError,
  mapLoading,
  mapRows,
  mapEp,
  debouncedType,
  debouncedYear,
  debouncedMetric,
  normalizedRows,
  mapBuild,
  dataByAgs,
  kreisNameByAgs,
  turnoutStats,
  selectedAgs,
  onActivateKreis,
  showAdvanced,
  setShowAdvanced,
  winnersByAgs,
}: MapModeProps) {
  const { c, t, lang, theme } = useTheme()

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

  const onMapSelect = (ags: string) => {
    onActivateKreis(ags.replace(/\s/g, ''))
  }

  const onPickSearchKreis = (ags: string) => {
    onActivateKreis(ags.replace(/\s/g, ''))
    setSearchQuery('')
  }

  return (
    <>
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
        <KreisAutocomplete
          label={t('electionsDistrict')}
          placeholder={t('searchPlaceholder')}
          ariaLabel={t('searchPlaceholder')}
          narrow={narrow}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          results={searchResults}
          onPick={onPickSearchKreis}
        />
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
          onSelectRegion={(ags) => onActivateKreis(ags.replace(/\s/g, ''))}
        />
      )}
    </>
  )
}
