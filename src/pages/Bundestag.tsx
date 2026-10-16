import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExportableContainer,
  LoadingSpinner,
  PageHeader,
  useTheme,
} from '../design-system'
import { fontSize, fonts, radius, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { AbstimmungsListe } from '../components/bundestag/AbstimmungsListe'
import { AbgeordnetenProfil } from '../components/bundestag/AbgeordnetenProfil'
import {
  Hemicycle,
  type SitzverteilungRow,
} from '../components/bundestag/Hemicycle'
import {
  nachAwId,
  sitzeZuordnen,
  type AbgeordnetenApiRow,
} from '../components/bundestag/sitzplaetze'
import { RAW_SEAT_COUNT } from '../data/bundestag-seats'
import { useSeo } from '../hooks/useSeo'

/**
 * Bundestag: Sitzverteilung und Liste der namentlichen Abstimmungen. Jede
 * Abstimmung hat ihre eigene Seite unter /bundestag/:pollId (Abstimmung.tsx).
 */
export default function Bundestag() {
  const navigate = useNavigate()
  const { c, t } = useTheme()
  useSeo({ titel: "Namentliche Abstimmungen im Bundestag", beschreibung: "Wie jede und jeder Abgeordnete abgestimmt hat, nach Themenfeld — und wo sie von der eigenen Fraktion abweichen." })

  // Auswahl ueber aw_id statt Sitznummer: so oeffnen Halbrund und Liste
  // dasselbe Profil.
  const [selectedAwId, setSelectedAwId] = useState<number | null>(null)

  const { data: sitzverteilung, loading: loadingSitz, error: errSitz } =
    useApi<SitzverteilungRow[]>('/api/bundestag/sitzverteilung')
  const { data: abstimmungen, loading: loadingList, error: errList } = useApi<
    { poll_id: number; poll_titel: string; poll_datum: string }[]
  >('/api/bundestag/abstimmungen')

  const { data: abgeordnete } = useApi<AbgeordnetenApiRow[]>('/api/abgeordnete')

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

  const abgeordneteBySeatId = useMemo(() => sitzeZuordnen(abgeordnete ?? []), [abgeordnete])
  const abgeordneteByAwId = useMemo(() => nachAwId(abgeordnete ?? []), [abgeordnete])

  const handleSeatSelect = useCallback(
    (seatId: number) => {
      const abg = abgeordneteBySeatId.get(seatId)
      if (abg) setSelectedAwId(abg.aw_id)
    },
    [abgeordneteBySeatId],
  )

  const selectedAbgeordneter = useMemo(
    () =>
      selectedAwId != null
        ? (abgeordneteByAwId.get(selectedAwId) ?? null)
        : null,
    [abgeordneteByAwId, selectedAwId],
  )
  const closeProfil = useCallback(() => setSelectedAwId(null), [])

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
          <ExportableContainer title={t('seatDistribution')}>
          <div
            style={{
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: radius.lg,
              padding: spacing.xl,
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
                  fontSize: fontSize.lg,
                  fontWeight: 700,
                  color: c.ink,
                }}
              >
                {t('seatDistribution')}
              </h2>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.md,
                  color: c.muted,
                }}
              >
                {RAW_SEAT_COUNT} {t('seats')}
              </span>
            </div>
            <Hemicycle
              sitzverteilung={sitz}
              abgeordnete={abgeordneteBySeatId}
              onSeatSelect={handleSeatSelect}
            />
          </div>
          </ExportableContainer>

          <div
            style={{
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: radius.lg,
              padding: spacing.xl,
              boxShadow: c.shadow,
            }}
          >
            {list.length > 0 ? (
              <AbstimmungsListe
                abstimmungen={list}
                onSelect={handleSelect}
              />
            ) : (
              <p style={{ fontFamily: fonts.body, color: c.muted }}>
                {t('emptyStateDemo')}
              </p>
            )}
          </div>
        </div>
      )}
      {selectedAbgeordneter && (
        <AbgeordnetenProfil abgeordneter={selectedAbgeordneter} onClose={closeProfil} />
      )}
    </>
  )
}
