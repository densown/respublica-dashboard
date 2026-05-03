import type { CSSProperties } from 'react'
import { fonts } from '../tokens'
import { useTheme } from '../ThemeContext'

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendArrowProps = {
  direction: TrendDirection
  /** Optional numerischer Hinweis (nicht als Diagramm) */
  title?: string
  style?: CSSProperties
}

const GLYPH: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

export default function TrendArrow({ direction, title, style }: TrendArrowProps) {
  const { c } = useTheme()
  return (
    <span
      title={title}
      aria-hidden
      style={{
        fontFamily: fonts.mono,
        fontSize: '1.1rem',
        fontWeight: 700,
        color: direction === 'flat' ? c.muted : c.red,
        lineHeight: 1,
        ...style,
      }}
    >
      {GLYPH[direction]}
    </span>
  )
}

/** Aus zwei Werten (älter → jünger) eine Richtung ableiten */
export function trendDirectionFromValues(
  older: number | null | undefined,
  newer: number | null | undefined,
): TrendDirection {
  if (older == null || newer == null || Number.isNaN(older) || Number.isNaN(newer)) {
    return 'flat'
  }
  if (newer > older) return 'up'
  if (newer < older) return 'down'
  return 'flat'
}
