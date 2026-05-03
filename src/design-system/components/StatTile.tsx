import type { CSSProperties, ReactNode } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import MonoLabel from './MonoLabel'

export type StatTileProps = {
  label: ReactNode
  value: ReactNode
  /** Tooltip / title auf dem Wert */
  valueTitle?: string
  style?: CSSProperties
}

export default function StatTile({ label, value, valueTitle, style }: StatTileProps) {
  const { c } = useTheme()
  return (
    <div
      style={{
        minWidth: 0,
        background: c.cardBg,
        border: `1px solid ${c.cardBorder}`,
        borderRadius: 6,
        padding: spacing.md,
        boxShadow: c.shadow,
        ...style,
      }}
    >
      <MonoLabel muted>{label}</MonoLabel>
      <div
        title={valueTitle}
        style={{
          fontFamily: fonts.display,
          fontSize: '1.05rem',
          fontWeight: 700,
          color: c.text,
          lineHeight: 1.15,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {value}
      </div>
    </div>
  )
}
