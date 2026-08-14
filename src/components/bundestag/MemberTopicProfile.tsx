import { useMemo } from 'react'
import { Badge, useTheme } from '../../design-system'
import { fonts, radius, spacing } from '../../design-system/tokens'

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

export type MemberTopicProfileData = {
  gesamt: MemberTopicTotals
  themen: MemberTopicRow[]
}

type Props = {
  data: MemberTopicProfileData | null
  lang: 'de' | 'en'
  title: string
  deviationLabel: string
  deviationHint: string
  emptyText: string
}

/**
 * Abstimmungsverhalten einer oder eines Abgeordneten nach Themenfeld.
 *
 * Zeigt je Thema ein gestapeltes Band aus Ja/Nein/Enthaltung/Nichtteilnahme.
 * Interessant ist weniger die Bilanz als die Abweichung von der eigenen
 * Fraktion — die bekommt deshalb ein eigenes Badge statt einer Spalte.
 */
export function MemberTopicProfile({
  data,
  lang,
  title,
  deviationLabel,
  deviationHint,
  emptyText,
}: Props) {
  const { c } = useTheme()

  const themen = useMemo(
    () => [...(data?.themen ?? [])].sort((a, b) => b.abstimmungen - a.abstimmungen),
    [data],
  )

  if (!data || !themen.length) {
    return <p style={{ color: c.muted, fontFamily: fonts.body, margin: 0 }}>{emptyText}</p>
  }

  const segmente = (t: MemberTopicRow) => [
    { n: t.ja, farbe: c.yes },
    { n: t.nein, farbe: c.no },
    { n: t.enthalten, farbe: c.abstain },
    { n: t.abwesend, farbe: c.absent },
  ].filter((s) => s.n > 0)

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: spacing.sm,
          flexWrap: 'wrap',
          marginBottom: spacing.sm,
        }}
      >
        <h4 style={{ margin: 0, fontFamily: fonts.display, color: c.ink }}>{title}</h4>
        {data.gesamt.abweichungen > 0 && (
          <Badge
            text={`${data.gesamt.abweichungen} ${deviationLabel}`}
            variant="amber"
          />
        )}
      </div>

      <div style={{ display: 'grid', gap: spacing.sm }}>
        {themen.map((t) => {
          const segs = segmente(t)
          return (
            <div key={t.slug}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                  fontFamily: fonts.body,
                  fontSize: '0.84rem',
                  color: c.ink,
                  marginBottom: 3,
                }}
              >
                <span>{lang === 'de' ? t.name_de : t.name_en}</span>
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.74rem',
                    color: t.abweichungen > 0 ? c.red : c.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.abweichungen > 0 && `${t.abweichungen}× ↯ · `}
                  {t.abstimmungen}
                </span>
              </div>
              <div
                title={`${t.ja} / ${t.nein} / ${t.enthalten} / ${t.abwesend}`}
                style={{
                  display: 'flex',
                  height: 8,
                  borderRadius: radius.sm,
                  overflow: 'hidden',
                  background: c.bgAlt,
                }}
              >
                {segs.map((s, i) => (
                  <div
                    key={i}
                    style={{ width: `${(s.n / t.abstimmungen) * 100}%`, background: s.farbe }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p
        style={{
          fontFamily: fonts.body,
          fontSize: '0.78rem',
          color: c.muted,
          margin: 0,
          marginTop: spacing.md,
          lineHeight: 1.6,
        }}
      >
        {deviationHint}
      </p>
    </div>
  )
}
