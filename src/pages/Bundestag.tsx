import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Badge,
  LoadingSpinner,
  PageHeader,
  useTheme,
} from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import {
  AbstimmungsDetail,
  shortFraktionName,
} from '../components/bundestag/AbstimmungsDetail'
import { AbstimmungsListe } from '../components/bundestag/AbstimmungsListe'
import {
  Hemicycle,
  type SitzverteilungRow,
} from '../components/bundestag/Hemicycle'
import { RAW_SEAT_COUNT, RAW_SEATS } from '../data/bundestag-seats'
import type { AbstimmungsDetailData } from '../components/bundestag/AbstimmungsDetail'

type AbgeordnetenApiRow = {
  id: number
  aw_id: number
  name: string
  fraktion: string
  wahlkreis: string
  foto_url: string | null
  profil_url: string | null
  nachname?: string
}

type AbgeordnetenSeatRow = {
  id: number
  aw_id: number
  name: string
  fraktion: string
  wahlkreis: string
  foto_url: string | null
  profil_url: string | null
}

type AbgeordnetenVoteRow = {
  poll_id: number
  vote: string
  poll_titel: string
  poll_datum: string
}

type PollVoteApiRow = {
  mandate_id: number
  vote: string
  abgeordneter_name: string
}

type PollVoteApiResponse = {
  votes: PollVoteApiRow[]
}

type RawKategorie =
  | 'Die Linke'
  | 'SPD'
  | 'Grüne'
  | 'SSW'
  | 'CDU/CSU'
  | 'AfD'
  | 'Fraktionslos'

const normalizeFraktion = (f: string): string => f.replace(/\u00AD/g, '').trim()
const SSW_NAME = 'Stefan Seidler'

function getEffektiveFraktion(abgeordneter: { name: string; fraktion: string }): string {
  if (normalizeFraktion(abgeordneter.name) === SSW_NAME) return 'SSW'
  return normalizeFraktion(abgeordneter.fraktion)
}

function canonicalKey(fraktion: string): string {
  const f = normalizeFraktion(fraktion).toLowerCase()
  if (f.includes('grün') || f.includes('bündnis')) return 'Grüne'
  if (f.includes('linke')) return 'Linke'
  if (f.includes('spd')) return 'SPD'
  if (f.includes('cdu') || f.includes('csu')) return 'CDU/CSU'
  if (f.includes('afd')) return 'AfD'
  if (f.includes('ssw')) return 'SSW'
  if (f === 'fraktionslos') return 'Fraktionslos'
  return fraktion
}

function normalizeForMatch(s: string): string {
  return normalizeFraktion(s)
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
}

function apiFraktionToRawKategorie(apiFraktion: string): RawKategorie {
  const key = canonicalKey(apiFraktion)
  if (key === 'Linke') return 'Die Linke'
  if (key === 'SPD') return 'SPD'
  if (key === 'Grüne') return 'Grüne'
  if (key === 'SSW') return 'SSW'
  if (key === 'CDU/CSU') return 'CDU/CSU'
  if (key === 'AfD') return 'AfD'
  const n = normalizeForMatch(apiFraktion)
  if (n.includes('fraktionslos')) return 'Fraktionslos'
  return 'Fraktionslos'
}

function getNachname(row: AbgeordnetenApiRow): string {
  const n = (row.nachname ?? row.name).trim()
  if (!n) return ''
  const parts = n.replace(/\s+/g, ' ').split(' ')
  return (parts[parts.length - 1] ?? n).trim()
}

export default function Bundestag() {
  const { pollId: pollIdParam } = useParams()
  const navigate = useNavigate()
  const { c, t } = useTheme()

  const [selectedPollId, setSelectedPollId] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null)

  const { data: sitzverteilung, loading: loadingSitz, error: errSitz } =
    useApi<SitzverteilungRow[]>('/api/bundestag/sitzverteilung')
  const { data: abstimmungen, loading: loadingList, error: errList } = useApi<
    { poll_id: number; poll_titel: string; poll_datum: string }[]
  >('/api/bundestag/abstimmungen')

  const { data: abgeordnete } = useApi<AbgeordnetenApiRow[]>('/api/abgeordnete')

  const detailEndpoint =
    selectedPollId != null
      ? `/api/bundestag/abstimmungen/${selectedPollId}`
      : ''
  const {
    data: abstimmungsDetail,
    loading: loadingDetail,
    error: errDetail,
  } = useApi<AbstimmungsDetailData>(detailEndpoint)
  const pollVotesEndpoint =
    selectedPollId != null ? `/api/bundestag/poll-votes/${selectedPollId}` : ''
  const { data: pollVotesResponse } = useApi<PollVoteApiResponse>(pollVotesEndpoint)
  useEffect(() => {
    if (pollIdParam) {
      const p = Number.parseInt(pollIdParam, 10)
      if (Number.isFinite(p)) {
        setSelectedPollId(p)
        return
      }
    }
    setSelectedPollId(null)
  }, [pollIdParam])

  useEffect(() => {
    if (!abstimmungsDetail) return
    setAnimating(true)
    const id = window.setTimeout(() => setAnimating(false), 2500)
    return () => window.clearTimeout(id)
  }, [abstimmungsDetail?.poll_id])

  const handleSelect = useCallback(
    (pollId: number) => {
      navigate(`/bundestag/${pollId}`)
    },
    [navigate],
  )

  const loading = loadingSitz || loadingList
  const error = errSitz || errList

  const sitz = sitzverteilung ?? []
  const list = abstimmungen ?? []

  const abgeordneteBySeatId = useMemo(() => {
    const map = new Map<number, AbgeordnetenSeatRow>()
    if (!abgeordnete) return map

    const seatsByKategorie: Record<RawKategorie, number[]> = {
      'Die Linke': [],
      SPD: [],
      Grüne: [],
      SSW: [],
      'CDU/CSU': [],
      AfD: [],
      Fraktionslos: [],
    }

    for (let seatId = 0; seatId < RAW_SEATS.length; seatId++) {
      const rawLabel = normalizeFraktion(RAW_SEATS[seatId][2])
      const k = apiFraktionToRawKategorie(canonicalKey(rawLabel))
      if (!k) continue
      seatsByKategorie[k].push(seatId)
    }

    const offsetByKategorie: Record<RawKategorie, number> = {
      'Die Linke': 0,
      SPD: 0,
      Grüne: 0,
      SSW: 0,
      'CDU/CSU': 0,
      AfD: 0,
      Fraktionslos: 0,
    }

    const abgByFraktion = new Map<string, AbgeordnetenApiRow[]>()
    for (const a of abgeordnete) {
      if (!a?.fraktion) continue
      const fraktionKey = canonicalKey(
        getEffektiveFraktion({ name: a.name, fraktion: a.fraktion }),
      )
      const list = abgByFraktion.get(fraktionKey) ?? []
      list.push(a)
      abgByFraktion.set(fraktionKey, list)
    }

    // Pro RAW-Kategorie fortlaufend zuordnen (falls API mehrere Fraktionen
    // liefert, die auf dieselbe Sitz-Kategorie matchen).
    for (const [fraktion, abgListRaw] of abgByFraktion.entries()) {
      const k = apiFraktionToRawKategorie(fraktion)
      const seatIndices = seatsByKategorie[k]
      const start = offsetByKategorie[k]
      if (start >= seatIndices.length) continue

      const abgListSorted = [...abgListRaw].sort((a, b) =>
        getNachname(a).localeCompare(getNachname(b), 'de', {
          sensitivity: 'base',
        }),
      )

      const room = seatIndices.length - start
      const take = Math.min(room, abgListSorted.length)
      for (let i = 0; i < take; i++) {
        const seatId = seatIndices[start + i]
        const abg = abgListSorted[i]
        map.set(seatId, {
          id: abg.id,
          aw_id: abg.aw_id,
          name: abg.name,
          fraktion: shortFraktionName(abg.fraktion),
          wahlkreis: abg.wahlkreis,
          foto_url: abg.foto_url ?? null,
          profil_url: abg.profil_url ?? null,
        })
      }
      offsetByKategorie[k] = start + take
    }

    return map
  }, [abgeordnete])

  const selectedAbgeordneter = useMemo(
    () =>
      selectedSeatId != null
        ? (abgeordneteBySeatId.get(selectedSeatId) ?? null)
        : null,
    [abgeordneteBySeatId, selectedSeatId],
  )
  const memberVotesEndpoint =
    selectedAbgeordneter != null
      ? `/api/abgeordnete/${selectedAbgeordneter.aw_id}/votes`
      : ''
  const {
    data: memberVotes,
    loading: loadingMemberVotes,
    error: errMemberVotes,
  } = useApi<AbgeordnetenVoteRow[]>(memberVotesEndpoint)

  const individualVotesByMandateId = useMemo(() => {
    const map = new Map<number, 'yes' | 'no' | 'abstain' | 'no_show'>()
    for (const row of pollVotesResponse?.votes ?? []) {
      const raw = row.vote.trim().toLowerCase()
      if (raw === 'yes') map.set(row.mandate_id, 'yes')
      else if (raw === 'no') map.set(row.mandate_id, 'no')
      else if (raw === 'abstain' || raw === 'abstention') {
        map.set(row.mandate_id, 'abstain')
      } else if (raw === 'no_show' || raw === 'not_voted') {
        map.set(row.mandate_id, 'no_show')
      }
    }
    return map
  }, [pollVotesResponse])

  const voteVariant = useCallback((voteRaw: string) => {
    const vote = voteRaw.trim().toLowerCase()
    if (vote === 'yes') return { label: t('yes'), variant: 'yes' as const }
    if (vote === 'no') return { label: t('no'), variant: 'no' as const }
    if (vote === 'abstention' || vote === 'abstain') {
      return { label: t('abstain'), variant: 'muted' as const }
    }
    if (vote === 'not_voted' || vote === 'no_show') {
      return { label: t('absentL'), variant: 'gray' as const }
    }
    return { label: voteRaw, variant: 'default' as const }
  }, [t])

  const selectedAbgInitials = useMemo(() => {
    if (!selectedAbgeordneter) return ''
    return selectedAbgeordneter.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
  }, [selectedAbgeordneter])

  return (
    <>
      <PageHeader title="Bundestag" subtitle={t('bundestagSubtitle')} />

      {loading && (
        <div style={{ marginBottom: spacing.xl }}>
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <p
          style={{
            fontFamily: fonts.body,
            color: c.red,
            marginBottom: spacing.lg,
          }}
        >
          {t('dataLoadError')}
        </p>
      )}

      {!loading && !error && sitz.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: spacing.xl,
            marginBottom: spacing.xl,
          }}
        >
          <div
            style={{
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: 8,
              padding: 24,
              boxShadow: c.shadow,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                gap: spacing.md,
                marginBottom: spacing.lg,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: fonts.display,
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: c.ink,
                }}
              >
                {t('seatDistribution')}
              </h2>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: '0.85rem',
                  color: c.muted,
                }}
              >
                {RAW_SEAT_COUNT} {t('seats')}
              </span>
            </div>
            {selectedPollId != null && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPollId(null)
                  navigate('/bundestag')
                }}
                style={{
                  border: `1px solid ${c.border}`,
                  borderRadius: 4,
                  background: c.bg,
                  color: c.ink,
                  fontFamily: fonts.body,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  minHeight: 44,
                  padding: `${spacing.xs}px ${spacing.sm}px`,
                  marginBottom: spacing.md,
                }}
              >
                {t('backToSeating')}
              </button>
            )}
            <Hemicycle
              sitzverteilung={sitz}
              abstimmung={
                abstimmungsDetail
                  ? { fraktionen: abstimmungsDetail.fraktionen }
                  : undefined
              }
              individuelleVotes={individualVotesByMandateId}
              abgeordnete={abgeordneteBySeatId}
              animating={animating}
              onSeatSelect={setSelectedSeatId}
            />
          </div>

          <div
            style={{
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: 8,
              padding: 24,
              boxShadow: c.shadow,
            }}
          >
            {list.length > 0 ? (
              <AbstimmungsListe
                abstimmungen={list}
                activePollId={selectedPollId ?? undefined}
                onSelect={handleSelect}
              />
            ) : (
              <p style={{ fontFamily: fonts.body, color: c.muted }}>
                {t('emptyStateDemo')}
              </p>
            )}
          </div>

          <div
            style={{
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: 8,
              padding: 24,
              boxShadow: c.shadow,
            }}
          >
            {loadingDetail && selectedPollId != null && (
              <LoadingSpinner />
            )}
            {errDetail && selectedPollId != null && (
              <p style={{ fontFamily: fonts.body, color: c.red }}>
                {t('dataLoadError')}
              </p>
            )}
            {!loadingDetail &&
              !errDetail &&
              abstimmungsDetail &&
              selectedPollId != null && (
                <AbstimmungsDetail
                  data={abstimmungsDetail}
                  sitzverteilung={sitz.map((r) => ({
                    partei: r.partei,
                    farbe: r.farbe,
                  }))}
                />
              )}
            {!loadingDetail &&
              !errDetail &&
              !abstimmungsDetail &&
              selectedPollId != null && (
                <p style={{ fontFamily: fonts.body, color: c.muted }}>
                  {t('dataLoadError')}
                </p>
              )}
            {!loadingDetail && selectedPollId == null && list.length > 0 && (
              <p style={{ fontFamily: fonts.body, color: c.muted }}>
                {t('noVoteSelected')}
              </p>
            )}
          </div>
        </div>
      )}
      {selectedAbgeordneter && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedSeatId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.md,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(920px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: 10,
              padding: spacing.lg,
              boxShadow: c.shadow,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedSeatId(null)}
                style={{
                  border: `1px solid ${c.border}`,
                  borderRadius: 4,
                  background: c.bg,
                  color: c.ink,
                  fontFamily: fonts.mono,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  padding: `${spacing.xs}px ${spacing.sm}px`,
                }}
              >
                X
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
                gap: spacing.md,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  flexWrap: 'wrap',
                }}
              >
                {selectedAbgeordneter.foto_url ? (
                  <img
                    src={selectedAbgeordneter.foto_url}
                    alt={selectedAbgeordneter.name}
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `1px solid ${c.border}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: '50%',
                      border: `1px solid ${c.border}`,
                      background: c.bg,
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: fonts.display,
                      color: c.muted,
                      fontSize: '1.2rem',
                      fontWeight: 700,
                    }}
                  >
                    {selectedAbgInitials}
                  </div>
                )}
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: fonts.display,
                      color: c.ink,
                    }}
                  >
                    {selectedAbgeordneter.name}
                  </h3>
                  <p style={{ margin: `${spacing.xs}px 0 0`, color: c.muted }}>
                    {selectedAbgeordneter.fraktion} - {selectedAbgeordneter.wahlkreis}
                  </p>
                  {selectedAbgeordneter.profil_url && (
                    <a
                      href={selectedAbgeordneter.profil_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-block',
                        marginTop: spacing.sm,
                        color: c.red,
                        fontFamily: fonts.mono,
                        fontSize: '0.74rem',
                      }}
                    >
                      Abgeordnetenwatch
                    </a>
                  )}
                </div>
              </div>
              <div>
                <h4
                  style={{
                    margin: `0 0 ${spacing.sm}px`,
                    fontFamily: fonts.display,
                    color: c.ink,
                  }}
                >
                  {t('votes')}
                </h4>
                {loadingMemberVotes && <LoadingSpinner />}
                {errMemberVotes && (
                  <p style={{ color: c.red, margin: 0 }}>{t('dataLoadError')}</p>
                )}
                {!loadingMemberVotes && !errMemberVotes && (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontFamily: fonts.body,
                        fontSize: '0.84rem',
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                          <th style={{ textAlign: 'left', padding: `${spacing.xs}px 0` }}>
                            {t('votes')}
                          </th>
                          <th style={{ textAlign: 'left', padding: `${spacing.xs}px 0` }}>
                            {t('electionYear')}
                          </th>
                          <th style={{ textAlign: 'left', padding: `${spacing.xs}px 0` }}>
                            {t('result')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(memberVotes ?? []).map((row) => {
                          const vote = voteVariant(row.vote)
                          return (
                            <tr key={`${row.poll_id}-${row.vote}`}>
                              <td style={{ padding: `${spacing.xs}px 0`, color: c.ink }}>
                                {row.poll_titel}
                              </td>
                              <td style={{ padding: `${spacing.xs}px 0`, color: c.muted }}>
                                {row.poll_datum}
                              </td>
                              <td style={{ padding: `${spacing.xs}px 0` }}>
                                <Badge text={vote.label} variant={vote.variant} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
