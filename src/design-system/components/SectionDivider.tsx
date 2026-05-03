import type { CSSProperties } from 'react'
import { spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type SectionDividerProps = {
  style?: CSSProperties
}

export default function SectionDivider({ style }: SectionDividerProps) {
  const { c } = useTheme()
  return (
    <div
      role="separator"
      style={{
        height: 1,
        margin: `${spacing.md}px 0`,
        background: c.border,
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
