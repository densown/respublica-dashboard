import type { CSSProperties } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type CompareBarPair = { label: string; a: number; b: number; aLabel?: string; bLabel?: string }

export type CompareBarProps = {
  pairs: CompareBarPair[]
  style?: CSSProperties
}

export default function CompareBar({ pairs, style }: CompareBarProps) {
  const { c } = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, ...style }}>
      {pairs.map((p) => {
        const max = Math.max(p.a, p.b, 1e-9)
        return (
          <div key={p.label} style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                color: c.text,
                marginBottom: 6,
              }}
            >
              {p.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.sm }}>
              <div>
                <div style={{ fontFamily: fonts.mono, fontSize: 9, color: c.muted, marginBottom: 4 }}>
                  {p.aLabel ?? 'A'}
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: c.bgHover,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ width: `${(p.a / max) * 100}%`, height: '100%', background: c.red }} />
                </div>
              </div>
              <div>
                <div style={{ fontFamily: fonts.mono, fontSize: 9, color: c.muted, marginBottom: 4 }}>
                  {p.bLabel ?? 'B'}
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: c.bgHover,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(p.b / max) * 100}%`,
                      height: '100%',
                      background: c.muted,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
