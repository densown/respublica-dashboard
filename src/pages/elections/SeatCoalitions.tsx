import { useMemo } from 'react'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import type { Lang } from '../../design-system/ThemeContext'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import { PARTY_LABELS, partyColorsForTheme } from './partyColors'
import type { SitzKoalition } from './resultMath'

type SeatCoalitionsProps = {
  koalitionen: SitzKoalition[]
  mehrheit: number | null
  lang: Lang
  t: (key: I18nKey) => string
}

/**
 * Mehrheiten aus echten Sitzen.
 *
 * Gegenstueck zu CoalitionCalculator: dieselbe Formensprache, aber ohne dessen
 * Naeherung. Vor der Wahl muessen Prozente auf 100 normiert werden, weil die
 * Mandatszahl unbekannt ist; liegt das Ergebnis vor, werden Sitze gezaehlt.
 * Deshalb steht hier eine Sitzzahl statt eines Prozentwerts — die Zahl, die
 * bei der Regierungsbildung tatsaechlich zaehlt.
 *
 * Wie dort gilt: alle arithmetischen Mehrheiten, ohne Wertung, welche davon
 * politisch in Frage kommen.
 */
export function SeatCoalitions({
  koalitionen,
  mehrheit,
  lang,
  t,
}: SeatCoalitionsProps) {
  const { c, theme } = useTheme()
  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )

  if (!koalitionen.length) {
    return (
      <p style={{ fontFamily: fonts.body, color: c.muted, margin: 0 }}>
        {t('electionPollsNoCoalition')}
      </p>
    )
  }

  return (
    <div style={{ display: 'grid', gap: spacing.sm }}>
      {koalitionen.map((k) => (
        <div
          key={k.parteien.join('+')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            flexWrap: 'wrap',
            padding: `${spacing.sm}px ${spacing.md}px`,
            border: `1px solid ${c.border}`,
            borderRadius: radius.md,
            background: c.bg,
          }}
        >
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {k.parteien.map((p) => (
              <span
                key={p}
                style={{
                  width: 14,
                  height: 26,
                  background: partyColors[p] ?? partyColors.other,
                  borderRadius: radius.xs,
                  marginRight: 2,
                }}
              />
            ))}
          </div>

          <span
            style={{
              fontFamily: fonts.body,
              fontSize: fontSize.md,
              color: c.ink,
              flex: 1,
              minWidth: 120,
            }}
          >
            {k.parteien.map((p) => PARTY_LABELS[p]?.[lang] ?? p).join(' · ')}
          </span>

          {/* Der Abstand zur Mehrheit sagt mehr als die absolute Sitzzahl:
              eine Koalition mit +1 ist eine andere Lage als eine mit +20. */}
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSize.xs,
              color: k.ueberhang <= 1 ? c.red : c.muted,
              whiteSpace: 'nowrap',
            }}
            title={mehrheit == null ? undefined : `${t('electionResultMajority')}: ${mehrheit}`}
          >
            +{k.ueberhang}
          </span>

          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSize.md,
              fontWeight: 700,
              color: c.ink,
              whiteSpace: 'nowrap',
            }}
          >
            {k.sitze}
            <span style={{ fontSize: fontSize.micro, fontWeight: 400 }}>
              {' '}
              {t('electionResultSeatsShort')}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
