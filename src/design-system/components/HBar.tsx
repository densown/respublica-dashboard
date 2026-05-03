import { useMemo, type CSSProperties } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type HBarRow = { label: string; value: number; valueLabel?: string }

export type HBarProps = {
  rows: HBarRow[]
  /** Maximale Balkenbreite als Anteil 0–1 */
  maxFraction?: number
  style?: CSSProperties
}

export default function HBar({ rows, maxFraction = 0.92, style }: HBarProps) {
  const { c } = useTheme()
  const maxV = useMemo(() => {
    if (!rows.length) return 1
    return Math.max(...rows.map((r) => r.value), 1e-9)
  }, [rows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, ...style }}>
      {rows.map((r) => (
        <div key={r.label} style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: spacing.sm,
              marginBottom: 4,
              fontFamily: fonts.body,
              fontSize: 12,
              color: c.text,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.label}
            </span>
            <span style={{ fontFamily: fonts.mono, fontSize: 11, flexShrink: 0 }}>
              {r.valueLabel ?? r.value}
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: c.bgHover,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${maxFraction * 100 * (r.value / maxV)}%`,
                maxWidth: `${maxFraction * 100}%`,
                height: '100%',
                background: c.red,
                opacity: 0.85,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
