import { useMemo } from 'react'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import type { Lang } from '../../design-system/ThemeContext'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import { PARTY_LABELS, partyColorsForTheme } from './partyColors'
import { coalitions, type Standing } from './pollMath'

type CoalitionCalculatorProps = {
  werte: Standing[]
  lang: Lang
  t: (key: I18nKey) => string
}

/**
 * Rechnerische Mehrheiten aus dem aktuellen Stand.
 *
 * Zeigt bewusst ALLE arithmetisch moeglichen Buendnisse. Welche davon
 * politisch realistisch sind, ist eine redaktionelle Wertung — die trifft
 * diese Komponente nicht.
 */
export function CoalitionCalculator({ werte, lang, t }: CoalitionCalculatorProps) {
  const { c, theme } = useTheme()
  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )
  const moeglich = useMemo(() => coalitions(werte), [werte])

  if (!moeglich.length) {
    return (
      <p style={{ fontFamily: fonts.body, color: c.muted, margin: 0 }}>
        {t('electionPollsNoCoalition')}
      </p>
    )
  }

  return (
    <div style={{ display: 'grid', gap: spacing.sm }}>
      {moeglich.map((k) => (
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
          {/* Farbstreifen als sofort lesbare Signatur des Buendnisses */}
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

          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSize.md,
              fontWeight: 700,
              color: c.ink,
            }}
          >
            {k.anteil.toFixed(1).replace('.', lang === 'de' ? ',' : '.')}
            <span style={{ fontSize: fontSize.micro, fontWeight: 400 }}> %</span>
          </span>
        </div>
      ))}
    </div>
  )
}
