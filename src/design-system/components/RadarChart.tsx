import type { CSSProperties } from 'react'
import { fonts } from '../tokens'
import { useTheme } from '../ThemeContext'

export type RadarChartAxis = {
  label: string
  /** 0–1 entlang der Achse */
  value: number
}

export type RadarChartProps = {
  axes: RadarChartAxis[]
  color?: string
  style?: CSSProperties
}

export default function RadarChart({ axes, color, style }: RadarChartProps) {
  const { c } = useTheme()
  const col = color || c.red
  const N = axes.length
  const CX = 120,
    CY = 100,
    R = 72
  const angle = (i: number) => (i / N) * 2 * Math.PI - Math.PI / 2
  const pt = (radius: number, i: number) => {
    const a = angle(i)
    return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) }
  }
  if (N < 3) return null

  const gridLevels = [0.25, 0.5, 0.75, 1]
  const dataPoly = axes
    .map((a, i) => {
      const v = Math.max(0, Math.min(1, a.value))
      const p = pt(R * v, i)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox="0 0 240 200"
      width="100%"
      height={200}
      style={{ display: 'block', overflow: 'visible', ...style }}
      aria-hidden
    >
      {gridLevels.map((g, gi) => (
        <polygon
          key={gi}
          points={axes
            .map((_, i) => {
              const p = pt(R * g, i)
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
            })
            .join(' ')}
          fill="none"
          stroke={c.border}
          strokeWidth={0.5}
        />
      ))}
      {axes.map((_, i) => {
        const p0 = pt(0, i)
        const p1 = pt(R, i)
        return (
          <line
            key={`spoke${i}`}
            x1={p0.x}
            y1={p0.y}
            x2={p1.x}
            y2={p1.y}
            stroke={c.border}
            strokeWidth={0.5}
          />
        )
      })}
      <polygon points={dataPoly} fill="none" stroke={col} strokeWidth={1.5} />
      {axes.map((a, i) => {
        const v = Math.max(0, Math.min(1, a.value))
        const p = pt(R * v, i)
        return <circle key={`d${i}`} cx={p.x} cy={p.y} r={3} fill={col} />
      })}
      {axes.map((a, i) => {
        const lp = pt(R + 18, i)
        return (
          <text
            key={`lb${i}-${a.label}`}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={fonts.mono}
            fontSize={8.5}
            fill={c.muted}
            letterSpacing="0.06em"
          >
            {a.label.toUpperCase()}
          </text>
        )
      })}
    </svg>
  )
}
