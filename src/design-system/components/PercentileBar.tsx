import type { CSSProperties } from 'react'
import { spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type PercentileBarProps = {
  /** 0–1: relative Stellung (1 = beste Position) */
  fraction: number
  /** Zeile darunter, z. B. „12 / 180“ */
  caption?: string
  style?: CSSProperties
}

export default function PercentileBar({ fraction, caption, style }: PercentileBarProps) {
  const { c } = useTheme()
  const f = Math.max(0, Math.min(1, fraction))
  return (
    <div style={{ minWidth: 0, ...style }}>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: c.bgHover,
          border: `1px solid ${c.border}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${f * 100}%`,
            height: '100%',
            background: c.red,
            borderRadius: 3,
            transition: 'width 0.35s ease',
          }}
        />
      </div>
      {caption ? (
        <p
          style={{
            margin: `${spacing.xs}px 0 0`,
            fontFamily: 'inherit',
            fontSize: 11,
            color: c.muted,
          }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  )
}
