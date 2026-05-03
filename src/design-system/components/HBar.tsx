import type { CSSProperties, ReactNode } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type HBarProps = {
  label: ReactNode
  value: number
  max: number
  formatted: ReactNode
  color?: string
  icon?: ReactNode
  style?: CSSProperties
}

export default function HBar({ label, value, max, formatted, color, icon, style }: HBarProps) {
  const { c } = useTheme()
  const col = color || c.red
  return (
    <div style={{ marginBottom: spacing.md, ...style }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xs,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0, flex: 1 }}>
          {icon && <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>}
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: c.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            color: c.muted,
            flexShrink: 0,
            marginLeft: spacing.sm,
          }}
        >
          {formatted}
        </span>
      </div>
      <div style={{ height: 5, background: c.bgHover, borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, (value / max) * 100)}%`,
            background: col,
            borderRadius: 2,
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
    </div>
  )
}
