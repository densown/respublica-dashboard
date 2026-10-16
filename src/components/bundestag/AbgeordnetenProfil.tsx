import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, LoadingSpinner, useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, radius, spacing } from '../../design-system/tokens'
import { stimmFlaeche } from '../../design-system/palettes'
import { useApi } from '../../hooks/useApi'
import { MemberTopicProfile, type MemberTopicProfileData } from './MemberTopicProfile'
import { fraktionsFlaeche } from './fraktion'
import type { SitzAbgeordneter } from './sitzplaetze'
import { normalizeStimme, type Stimme } from './stimmen'

/** Zeile aus /api/abgeordnete/:awId/votes */
type AbgeordnetenVoteRow = {
  poll_id: number
  vote: string
  poll_titel: string
  poll_datum: string
}

const STIMM_ART = {
  yes: 'ja',
  no: 'nein',
  abstain: 'enthalten',
  no_show: 'abwesend',
} as const

/**
 * Stimme als kleines Feld in der Stimmfarbe mit dem Wort daneben, wie in der
 * Legende der Abstimmungskarten. Leiser als ein Badge: in einer Liste mit
 * 630 Zeilen soll die Farbe sortieren, nicht schreien.
 */
export function StimmMarke({ stimme }: { stimme: Stimme }) {
  const { c, t } = useTheme()
  const wort: Record<Stimme, string> = {
    yes: t('yes'),
    no: t('no'),
    abstain: t('abstain'),
    no_show: t('absentL'),
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        fontFamily: fonts.mono,
        fontSize: fontSize.xs,
        color: stimme === 'no_show' ? c.muted : c.ink,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 12,
          height: 12,
          flexShrink: 0,
          background: stimmFlaeche(STIMM_ART[stimme], c),
          // Schraffur braucht eine Kante, sonst verschwindet sie auf Papier
          boxShadow: stimme === 'no_show' ? `inset 0 0 0 1px ${c.hatch}` : undefined,
        }}
      />
      {wort[stimme]}
    </span>
  )
}

export interface AbgeordnetenProfilProps {
  abgeordneter: SitzAbgeordneter
  onClose: () => void
}

/**
 * Profil einer oder eines Abgeordneten als Dialog: Themenprofil und alle
 * namentlichen Abstimmungen, jede verlinkt auf ihre eigene Seite.
 * Halbrund und Liste oeffnen denselben Dialog.
 */
export function AbgeordnetenProfil({ abgeordneter, onClose }: AbgeordnetenProfilProps) {
  const { c, t, lang, theme } = useTheme()

  const {
    data: votes,
    loading: loadingVotes,
    error: errVotes,
  } = useApi<AbgeordnetenVoteRow[]>(`/api/abgeordnete/${abgeordneter.aw_id}/votes`)
  const { data: topics } = useApi<MemberTopicProfileData>(
    `/api/abgeordnete/${abgeordneter.aw_id}/themen`,
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const initialen = useMemo(
    () =>
      abgeordneter.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join(''),
    [abgeordneter.name],
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={abgeordneter.name}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: c.overlay,
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
          borderRadius: radius.lg,
          padding: spacing.lg,
          boxShadow: c.shadow,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="rp-chip"
            onClick={onClose}
            aria-label={t('profileClose')}
            style={{
              minWidth: 44,
              minHeight: 44,
              border: `1px solid ${c.border}`,
              borderRadius: radius.sm,
              background: c.bg,
              color: c.ink,
              fontFamily: fonts.mono,
              fontSize: fontSize.base,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
          {abgeordneter.foto_url ? (
            <img
              src={abgeordneter.foto_url}
              alt={abgeordneter.name}
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
              aria-hidden
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
                fontSize: fontSize.xl,
                fontWeight: 700,
              }}
            >
              {initialen}
            </div>
          )}
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: fontSize.xl,
                lineHeight: lineHeight.tight,
                color: c.ink,
              }}
            >
              {abgeordneter.name}
            </h2>
            <p
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                margin: `${spacing.xs}px 0 0`,
                fontFamily: fonts.body,
                fontSize: fontSize.md,
                color: c.muted,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 4,
                  height: 16,
                  background: fraktionsFlaeche(abgeordneter.fraktion, theme === 'dark'),
                }}
              />
              {abgeordneter.fraktion}
              {abgeordneter.wahlkreis ? `, ${abgeordneter.wahlkreis}` : ''}
            </p>
            {abgeordneter.profil_url && (
              <a
                href={abgeordneter.profil_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: spacing.sm,
                  color: c.red,
                  fontFamily: fonts.mono,
                  fontSize: fontSize.xs,
                }}
              >
                abgeordnetenwatch.de
              </a>
            )}
          </div>
        </div>

        {/*
          Themenprofil vor der Abstimmungsliste: die Liste sagt, wie jemand
          gestimmt hat, das Profil sagt wozu, und wo die Person von der
          eigenen Fraktion abgewichen ist.
        */}
        <div style={{ margin: `${spacing.xl}px 0` }}>
          <MemberTopicProfile
            data={topics}
            lang={lang}
            title={t('memberTopicsTitle')}
            deviationLabel={t('memberDeviations')}
            deviationHint={t('memberDeviationsHint')}
            emptyText={t('memberTopicsEmpty')}
          />
        </div>

        <h3
          style={{
            margin: `0 0 ${spacing.sm}px`,
            fontFamily: fonts.display,
            fontSize: fontSize.lg,
            color: c.ink,
          }}
        >
          {t('votes')}
        </h3>
        {loadingVotes && <LoadingSpinner />}
        {errVotes && <p style={{ color: c.red, margin: 0 }}>{t('dataLoadError')}</p>}
        {!loadingVotes && !errVotes && (
          <DataTable
            columns={[
              {
                key: 'titel',
                header: t('votes'),
                primary: true,
                cell: (r: AbgeordnetenVoteRow) => (
                  <Link
                    to={`/bundestag/${r.poll_id}`}
                    onClick={onClose}
                    style={{ color: c.ink, textDecorationColor: c.border }}
                  >
                    {r.poll_titel}
                  </Link>
                ),
              },
              {
                key: 'datum',
                header: t('profileDate'),
                mono: true,
                cell: (r: AbgeordnetenVoteRow) => r.poll_datum,
              },
              {
                key: 'stimme',
                header: t('profileVote'),
                cell: (r: AbgeordnetenVoteRow) => <StimmMarke stimme={normalizeStimme(r.vote)} />,
              },
            ]}
            rows={votes ?? []}
            rowKey={(r) => `${r.poll_id}-${r.vote}`}
            cardsFrom={3}
          />
        )}
      </div>
    </div>
  )
}
