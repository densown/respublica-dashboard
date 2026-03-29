import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
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
  name: string
  fraktion: string
  wahlkreis: string
  nachname?: string
}

type AbgeordnetenTooltipRow = {
  name: string
  fraktion: string
  wahlkreis: string
}

type RawKategorie =
  | 'Die Linke'
  | 'SPD'
  | 'Grüne'
  | 'SSW'
  | 'CDU/CSU'
  | 'AfD'
  | 'Fraktionslos'

function normalizeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
}

function apiFraktionToRawKategorie(apiFraktion: string): RawKategorie {
  const n = normalizeForMatch(apiFraktion)
  if (n.includes('linke')) return 'Die Linke'
  if (n.includes('spd')) return 'SPD'
  if (n.includes('grune') || n.includes('bundnis')) return 'Grüne'
  if (n.includes('ssw')) return 'SSW'
  if (n.includes('cdu') || n.includes('csu')) return 'CDU/CSU'
  if (n.includes('afd')) return 'AfD'
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

  const { data: sitzverteilung, loading: loadingSitz, error: errSitz } =
    useApi<SitzverteilungRow[]>('/api/bundestag/sitzverteilung')
  const { data: abstimmungen, loading: loadingList, error: errList } = useApi<
    { poll_id: number; poll_titel: string; poll_datum: string }[]
  >('/api/bundestag/abstimmungen')

  const { data: abgeordnete } = useApi<AbgeordnetenApiRow[]>(
    '/api/bundestag/abgeordnete',
  )

  const detailEndpoint =
    selectedPollId != null
      ? `/api/bundestag/abstimmungen/${selectedPollId}`
      : ''
  const {
    data: abstimmungsDetail,
    loading: loadingDetail,
    error: errDetail,
  } = useApi<AbstimmungsDetailData>(detailEndpoint)

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
    const map = new Map<number, AbgeordnetenTooltipRow>()
    if (!abgeordnete) return map

    const rawLabelToKategorie: Partial<Record<string, RawKategorie>> = {
      'Die Linke': 'Die Linke',
      SPD: 'SPD',
      Grüne: 'Grüne',
      SSW: 'SSW',
      'CDU/CSU': 'CDU/CSU',
      AfD: 'AfD',
      Fraktionslos: 'Fraktionslos',
    }

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
      const rawLabel = RAW_SEATS[seatId][2]
      const k = rawLabelToKategorie[rawLabel]
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
      const list = abgByFraktion.get(a.fraktion) ?? []
      list.push(a)
      abgByFraktion.set(a.fraktion, list)
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
          name: abg.name,
          fraktion: shortFraktionName(abg.fraktion),
          wahlkreis: abg.wahlkreis,
        })
      }
      offsetByKategorie[k] = start + take
    }

    return map
  }, [abgeordnete])

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
            <Hemicycle
              sitzverteilung={sitz}
              abstimmung={
                abstimmungsDetail
                  ? { fraktionen: abstimmungsDetail.fraktionen }
                  : undefined
              }
              abgeordnete={abgeordneteBySeatId}
              animating={animating}
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
    </>
  )
}
