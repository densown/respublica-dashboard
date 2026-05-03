import type { CSSProperties, ReactNode } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import MonoLabel from './MonoLabel'

export type StatTileProps = {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  style?: CSSProperties
}

export default function StatTile({ label, value, sub, icon, style }: StatTileProps) {
  const { c } = useTheme()
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        padding: `${spacing.sm}px ${spacing.md}px`,
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <MonoLabel>{label}</MonoLabel>
        {icon && (
          <span style={{ color: c.subtle, fontSize: 11, fontFamily: fonts.mono }}>{icon}</span>
        )}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: 20,
          color: c.ink,
          lineHeight: 1.1,
          marginTop: spacing.xs,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: fonts.body, fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  )
}
