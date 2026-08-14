import type { ReactNode } from 'react'
import { fonts, fontSize, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type ToolbarProps = {
  /** Beschriftung links, in Versalien. Etwa "Einfärbung" oder "Zeitraum". */
  label?: string
  children: ReactNode
  /** Letzte Leiste vor dem Inhalt: kleinerer Abstand nach unten. */
  tight?: boolean
}

/**
 * Eine Zeile Bedienelemente mit vorangestellter Beschriftung.
 *
 * Bedienleisten waren im Bestand jedes Mal neu gebaut, mit jeweils eigenen
 * Abstaenden — dadurch stapelten sich auf einer Seite mehrere Leisten, die
 * sich nicht ansahen wie dieselbe Sache. Siehe docs/DESIGN.md, Abschnitt 6.
 *
 * Umbricht auf schmalen Schirmen und scrollt nicht waagerecht; die Kinder
 * sind Chips oder Auswahlfelder, keine frei gebauten Knoepfe.
 */
export function Toolbar({ label, children, tight }: ToolbarProps) {
  const { c } = useTheme()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        flexWrap: 'wrap',
        marginBottom: tight ? spacing.md : spacing.lg,
      }}
    >
      {label && (
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSize.micro,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: c.muted,
            marginRight: spacing.xs,
          }}
        >
          {label}
        </span>
      )}
      {children}
    </div>
  )
}
