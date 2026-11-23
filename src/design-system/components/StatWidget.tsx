import type { ReactNode } from 'react'
import { fontSize, fonts, lineHeight, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type StatWidgetProps = {
  label: string
  value: string | number
  sub?: string
  /** Frueher ein Zeichen in der Ecke. Wird nicht mehr gezeigt. */
  icon?: ReactNode
  /** Enge Grids (z. B. Sidebar): minWidth 0, kein fester Mindestwert */
  fluid?: boolean
}

/**
 * Kennzahl ohne Kasten: die Zahl gross, darunter in einem Satzteil, was sie
 * zaehlt. Eine Linie darueber haelt mehrere nebeneinander zusammen. Vier
 * gerahmte Kacheln in einer Reihe waren das austauschbarste Element der App.
 * Ganze Zahlen bekommen ueberall den Tausenderpunkt.
 */
export function StatWidget({ label, value, sub, fluid }: StatWidgetProps) {
  const { c, lang } = useTheme()
  const ganz = typeof value === 'number' ? value : /^\d{4,}$/.test(value) ? Number(value) : null
  const anzeige = ganz != null && Number.isFinite(ganz) ? ganz.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB') : value

  return (
    <div
      style={{
        paddingTop: spacing.sm,
        borderTop: `1px solid ${c.ink}`,
        minWidth: fluid ? 0 : 120,
        flex: fluid ? '1 1 0' : '1 1 120px',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: 'clamp(1.4rem, 3.4vw, 1.9rem)',
          color: c.ink,
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {anzeige}
      </div>
      <div
        style={{
          marginTop: spacing.xs,
          fontFamily: fonts.body,
          fontSize: fontSize.sm,
          lineHeight: lineHeight.tight,
          color: c.inkSoft,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ marginTop: 2, fontFamily: fonts.body, fontSize: fontSize.xs, color: c.muted }}>{sub}</div>
      )}
    </div>
  )
}
