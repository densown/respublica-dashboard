import {
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  EmptyState,
  ExportableContainer,
  useTheme,
} from '../../design-system'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import { AdvancedAnalysis } from './AdvancedAnalysis'
import { Gesamtergebnis, type GesamtErgebnis } from './Gesamtergebnis'
import { ElectionMap, ElectionMapLegend } from './ElectionMap'
import { KreisAutocomplete, type KreisSearchHit } from './KreisAutocomplete'
import {
  MAIN_PARTIES,
  PARTY_LABELS,
} from './partyColors'
import type { KreiseMapBuild } from './mapGeometry'
import { resolveKreisDisplayName } from './normalizeWahlen'
import type {
  ElectionType,
  MapRow,
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
  cardBg: string
  border: string
  text: string
}): CSSProperties {
  return {
    minHeight: 44,
    padding: '0 12px',
    borderRadius: radius.lg,
    border: `1px solid ${c.border}`,
    background: c.cardBg,
    color: c.text,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    width: '100%',
    maxWidth: '100%',
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
  /** Ergebnis der ganzen Wahl, nur bei bundesweiten Wahlen */
  gesamt: GesamtErgebnis | null
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
  debouncedType,
  debouncedYear,
  debouncedMetric,
  normalizedRows,
  mapBuild,
  dataByAgs,
  kreisNameByAgs,
  turnoutStats,
  gesamt,
  selectedAgs,
  onActivateKreis,
  showAdvanced,
  setShowAdvanced,
  winnersByAgs,
}: MapModeProps) {
  const { c, t, lang } = useTheme()

  const turnoutPct = (v: number) =>
    Number.isFinite(v)
      ? `${v.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`
      : t('electionsMapNoData')

  // Kennzahl als Zeile mit Linie darueber statt als Kasten
  const statCard = (title: string, body: string) => (
    <div style={{ paddingTop: spacing.sm, borderTop: `1px solid ${c.ink}`, minWidth: 0 }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.base, color: c.text, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
        {body}
      </div>
      <div style={{ marginTop: 2, fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted }}>{title}</div>
    </div>
  )

  // Legende nur mit Parteien, die irgendwo vorn liegen
  const sieger = new Set<string>()
  for (const r of normalizedRows) if (r.winning_party) sieger.add(r.winning_party)
  // Ein Tipp auf die Karte merkt den Kreis nur vor und zeigt darunter, wer
  // dort vorn liegt. Vorher sprang die Seite sofort in die Kreisanalyse; auf
  // dem Handy gibt es kein Hover, man wusste nicht, was man angetippt hatte.
  const [vorgemerkt, setVorgemerkt] = useState<string | null>(null)
  const onMapSelect = (ags: string) => {
    setVorgemerkt(ags.replace(/\s/g, ''))
  }
  const vorZeile = vorgemerkt ? dataByAgs.get(vorgemerkt) : undefined
  const vorName = vorgemerkt
    ? resolveKreisDisplayName(vorgemerkt, kreisNameByAgs, vorZeile?.ags_name)
    : ''

  const onPickSearchKreis = (ags: string) => {
    onActivateKreis(ags.replace(/\s/g, ''))
    setSearchQuery('')
  }

  return (
    <>
      <div
        style={{
          display: narrow ? 'grid' : 'flex',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          flexWrap: 'wrap',
          gap: spacing.md,
          marginTop: 0,
          marginBottom: spacing.xl,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <label style={{ flex: narrow ? '1 1 100%' : '1 1 200px' }}>
          <span
            style={{
              display: 'block',
              fontFamily: fonts.body,
              fontSize: fontSize.sm,
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
              fontSize: fontSize.sm,
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
              fontSize: fontSize.sm,
              color: c.muted,
              marginBottom: 6,
            }}
          >
            {t('electionsMapShows')}
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
                  borderRadius: radius.sm,
                  fontSize: fontSize.sm,
                  fontFamily: fonts.body,
                  lineHeight: 1.45,
                  background: c.noticeBg,
                  color: c.noticeFg,
                  border: `1px solid ${c.noticeBorder}`,
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
          {gesamt && <Gesamtergebnis daten={gesamt} />}
          {gesamt && debouncedMetric === 'winning_party' && (
            <h2
              style={{
                margin: `0 0 ${spacing.md}px`,
                paddingBottom: spacing.sm,
                borderBottom: `1px solid ${c.border}`,
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: fontSize.xl,
                color: c.ink,
              }}
            >
              {t('electionsWhereLeads')}
            </h2>
          )}
          <ExportableContainer title={t('electionsTitle')}>
          <div
            style={{
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <ElectionMap
              mapBuild={mapBuild}
              dataByAgs={dataByAgs}
              kreisNameByAgs={kreisNameByAgs}
              metric={debouncedMetric}
              turnoutMin={turnoutStats.minT}
              turnoutMax={turnoutStats.maxT}
              lang={lang}
              onSelectAgs={onMapSelect}
              selectedAgs={vorgemerkt ?? selectedAgs}
              loading={mapLoading || yearsLoading}
            />
          </div>

          <ElectionMapLegend
            metric={debouncedMetric}
            lang={lang}
            turnoutMin={turnoutStats.minT}
            turnoutMax={turnoutStats.maxT}
            partyForScale={debouncedMetric}
            nurSieger={sieger}
          />
          </ExportableContainer>
          {vorgemerkt ? (
            <div
              aria-live="polite"
              style={{
                marginTop: spacing.md,
                paddingTop: spacing.sm,
                borderTop: `2px solid ${c.ink}`,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 900,
                    fontSize: fontSize.lg,
                    color: c.ink,
                    lineHeight: 1.2,
                  }}
                >
                  {vorName}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontFamily: fonts.body,
                    fontSize: fontSize.sm,
                    color: c.muted,
                  }}
                >
                  {vorZeile
                    ? [
                        vorZeile.winning_party
                          ? `${t('electionsLeads')}: ${PARTY_LABELS[vorZeile.winning_party]?.[lang] ?? vorZeile.winning_party}`
                          : null,
                        Number.isFinite(vorZeile.turnout)
                          ? `${t('turnout')}: ${turnoutPct(vorZeile.turnout)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || t('electionsMapNoData')
                    : t('electionsMapNoData')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onActivateKreis(vorgemerkt)}
                style={{
                  minHeight: 44,
                  padding: '0 18px',
                  borderRadius: radius.sm,
                  border: `1px solid ${c.ink}`,
                  background: c.ink,
                  color: c.bg,
                  fontFamily: fonts.body,
                  fontSize: fontSize.base,
                  cursor: 'pointer',
                }}
              >
                {t('electionsOpenDistrict')}
              </button>
            </div>
          ) : (
            <p
              style={{
                margin: `${spacing.md}px 0 0`,
                fontFamily: fonts.body,
                fontStyle: 'italic',
                fontSize: fontSize.sm,
                color: c.muted,
              }}
            >
              {t('electionsMapHint')}
            </p>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: narrow
                ? 'repeat(2, minmax(0, 1fr))'
                : 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: spacing.md,
              marginTop: spacing.xl,
              width: '100%',
              maxWidth: '100%',
            }}
          >
            {gesamt?.turnout != null
              ? statCard(t('electionsTurnoutAll'), turnoutPct(gesamt.turnout * 100))
              : statCard(t('avgTurnout'), turnoutPct(turnoutStats.avg))}
            {statCard(
              t('highestTurnout'),
              Number.isFinite(turnoutStats.hi.v)
                ? `${turnoutStats.hi.name} · ${turnoutPct(turnoutStats.hi.v)}`
                : t('electionsMapNoData'),
            )}
            {statCard(
              t('lowestTurnout'),
              Number.isFinite(turnoutStats.lo.v)
                ? `${turnoutStats.lo.name} · ${turnoutPct(turnoutStats.lo.v)}`
                : t('electionsMapNoData'),
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
            borderRadius: radius.sm,
            border: `1px solid ${c.ink}`,
            background: 'transparent',
            color: c.text,
            fontFamily: fonts.body,
            fontSize: fontSize.base,
            cursor: 'pointer',
          }}
        >
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
