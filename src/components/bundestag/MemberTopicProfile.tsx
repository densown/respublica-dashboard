import { useMemo } from 'react'
import { EmptyState, useTheme, VoteBar } from '../../design-system'
import { fontSize, fonts, lineHeight, measure, spacing } from '../../design-system/tokens'
import { stimmenKurz } from './abstimmungText'

export type MemberTopicRow = {
  slug: string
  name_de: string
  name_en: string
  abstimmungen: number
  ja: number
  nein: number
  enthalten: number
  abwesend: number
  abweichungen: number
}

export type MemberTopicTotals = {
  abstimmungen: number
  ja: number
  nein: number
  enthalten: number
  abwesend: number
  abweichungen: number
}

/** Antwort von /api/abgeordnete/:awId/themen */
export type MemberTopicProfileData = {
  /** Die Person selbst; mandat_von und mandat_bis ab API-Migration 019 */
  abgeordnete?: {
    aw_id: number
    name: string
    fraktion: string
    wahlkreis: string | null
    foto_url: string | null
    profil_url: string | null
    mandat_von?: string | null
    mandat_bis?: string | null
  }
  gesamt: MemberTopicTotals
  themen: MemberTopicRow[]
}

/**
 * Abstimmungsverhalten einer oder eines Abgeordneten nach Themenfeld: je
 * Thema ein Stimmbalken wie auf der Abstimmungsseite, rechts die Zahl der
 * Abstimmungen und in Rot, wie oft die Person dort anders gestimmt hat als
 * die eigene Fraktion. Die Abweichung ist die eigentliche Nachricht.
 */
export function MemberTopicProfile({ data }: { data: MemberTopicProfileData | null }) {
  const { c, t, lang } = useTheme()

  const themen = useMemo(
    () => [...(data?.themen ?? [])].sort((a, b) => b.abstimmungen - a.abstimmungen),
    [data],
  )

  if (!data || !themen.length) return <EmptyState text={t('memberTopicsEmpty')} />

  return (
    <ul
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: spacing.md, maxWidth: measure.liste }}
    >
      {themen.map((th) => (
        <li key={th.slug}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: spacing.sm,
              marginBottom: spacing.xs,
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: fontSize.md,
                lineHeight: lineHeight.tight,
                color: c.ink,
              }}
            >
              {lang === 'de' ? th.name_de : th.name_en}
            </span>
            <span
              style={{
                display: 'inline-flex',
                gap: spacing.sm,
                fontFamily: fonts.mono,
                fontSize: fontSize.xs,
                color: c.muted,
                whiteSpace: 'nowrap',
              }}
            >
              {th.abweichungen > 0 && (
                <span style={{ color: c.red }}>
                  {t('profileTopicDeviations').replace('{n}', String(th.abweichungen))}
                </span>
              )}
              {th.abstimmungen}
            </span>
          </div>
          <VoteBar
            ja={th.ja}
            nein={th.nein}
            enthalten={th.enthalten}
            abwesend={th.abwesend}
            height={12}
            beschriftung="keine"
            animiert={false}
            ariaLabel={stimmenKurz(th, t)}
          />
        </li>
      ))}
    </ul>
  )
}
