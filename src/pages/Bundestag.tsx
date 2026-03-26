import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LoadingSpinner,
  PageHeader,
  useTheme,
} from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { AbstimmungsDetail } from '../components/bundestag/AbstimmungsDetail'
import { AbstimmungsListe } from '../components/bundestag/AbstimmungsListe'
import {
  Hemicycle,
  type SitzverteilungRow,
} from '../components/bundestag/Hemicycle'
import { RAW_SEAT_COUNT } from '../data/bundestag-seats'
import type { AbstimmungsDetailData } from '../components/bundestag/AbstimmungsDetail'

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
