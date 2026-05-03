import { useMemo, type CSSProperties } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type RadarAxis = {
  key: string
  label: string
  /** 0–1 für Radius */
  value: number
}

export type RadarChartProps = {
  axes: RadarAxis[]
  size?: number
  style?: CSSProperties
}

export default function RadarChart({ axes, size = 200, style }: RadarChartProps) {
  const { c } = useTheme()
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.36

  const { polygon, labelPts } = useMemo(() => {
    const n = axes.length
    if (n < 3) {
      return { polygon: '', labelPts: [] as { x: number; y: number; label: string }[] }
    }
    const pts: string[] = []
    const labels: { x: number; y: number; label: string }[] = []
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const v = Math.max(0, Math.min(1, axes[i]!.value))
      const x = cx + R * v * Math.cos(ang)
      const y = cy + R * v * Math.sin(ang)
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
      const lx = cx + (R + 14) * Math.cos(ang)
      const ly = cy + (R + 14) * Math.sin(ang)
      labels.push({ x: lx, y: ly, label: axes[i]!.label })
    }
    return { polygon: pts.join(' '), labelPts: labels }
  }, [axes, cx, cy, R])

  if (axes.length < 3 || !polygon) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: c.muted,
          fontSize: 12,
          textAlign: 'center',
          padding: spacing.md,
          ...style,
        }}
      >
        —
      </div>
    )
  }

  const n = axes.length
  const gridPoly = Array.from({ length: n }, (_, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const x = cx + R * Math.cos(ang)
    const y = cy + R * Math.sin(ang)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto', ...style }}>
      <polygon
        points={gridPoly}
        fill="none"
        stroke={c.border}
        strokeWidth={1}
        opacity={0.9}
      />
      <polygon points={polygon} fill={`${c.red}33`} stroke={c.red} strokeWidth={1.8} />
      {labelPts.map((lp) => (
        <text
          key={lp.label}
          x={lp.x}
          y={lp.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={c.muted}
          fontFamily={fonts.mono}
          fontSize={7}
          style={{ textTransform: 'uppercase' }}
        >
          {lp.label.length > 10 ? `${lp.label.slice(0, 9)}…` : lp.label}
        </text>
      ))}
    </svg>
  )
}
