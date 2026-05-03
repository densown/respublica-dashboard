import type { ReactNode } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type StatWidgetProps = {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  /** Enge Grids (z. B. Sidebar): minWidth 0, kein fester 140px-Min */
  fluid?: boolean
}

export function StatWidget({ label, value, sub, icon, fluid }: StatWidgetProps) {
  const { c } = useTheme()

  return (
    <div
      style={{
        background: c.cardBg,
        border: `1px solid ${c.cardBorder}`,
        borderRadius: 6,
        padding: spacing.lg,
        boxShadow: c.shadow,
        minWidth: fluid ? 0 : 140,
        flex: fluid ? '1 1 0' : '1 1 140px',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: '0.58rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: c.muted,
          }}
        >
          {label}
        </span>
        {icon && <span style={{ color: c.subtle, lineHeight: 1 }}>{icon}</span>}
      </div>
      <div
        style={{
          marginTop: spacing.sm,
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: 'clamp(1.6rem, 4vw, 2.1rem)',
          color: c.ink,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <p
          style={{
            marginTop: spacing.xs,
            fontFamily: fonts.body,
            fontSize: '0.78rem',
            color: c.muted,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}
