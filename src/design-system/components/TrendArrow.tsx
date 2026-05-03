import type { CSSProperties } from 'react'
import { fonts } from '../tokens'
import { useTheme } from '../ThemeContext'

export type TrendArrowProps = {
  value: number | null | undefined
  inverted?: boolean
  style?: CSSProperties
}

export default function TrendArrow({ value, inverted = false, style }: TrendArrowProps) {
  const { c } = useTheme()
  if (value == null || Number.isNaN(value)) return null
  const positive = inverted ? value < 0 : value > 0
  const neutral = Math.abs(value) < 0.005
  const color = neutral ? c.muted : positive ? c.yes : c.no
  const arrow = neutral ? '→' : value > 0 ? '↑' : '↓'
  const pct = (Math.abs(value) * 100).toFixed(1)
  return (
    <span
      style={{
        fontFamily: fonts.mono,
        fontSize: 11,
        color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        ...style,
      }}
    >
      {arrow} {pct}%
    </span>
  )
}

/** @deprecated Nutze TrendArrow mit value (relative Änderung) */
export function trendDirectionFromValues(
  older: number | null | undefined,
  newer: number | null | undefined,
): 'up' | 'down' | 'flat' {
  if (older == null || newer == null || Number.isNaN(older) || Number.isNaN(newer)) {
    return 'flat'
  }
  if (newer > older) return 'up'
  if (newer < older) return 'down'
  return 'flat'
}
