import type { CSSProperties, ReactNode } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type SectionDividerProps = {
  label: ReactNode
  style?: CSSProperties
}

export default function SectionDivider({ label, style }: SectionDividerProps) {
  const { c } = useTheme()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: `${spacing.lg}px 0 ${spacing.md}px`,
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: c.muted,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: c.border }} />
    </div>
  )
}
