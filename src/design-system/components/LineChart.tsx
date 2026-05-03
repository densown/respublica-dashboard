import type { CSSProperties, ReactNode } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import MonoLabel from './MonoLabel'

export type LineChartPoint = { y: number; v: number }

export type LineChartAnnotation = { year: number; label: string }

export type LineChartProps = {
  data: LineChartPoint[]
  color?: string
  yLabel?: ReactNode
  height?: number
  showArea?: boolean
  annotations?: LineChartAnnotation[]
  style?: CSSProperties
}

export default function LineChart({
  data,
  color,
  yLabel,
  height = 100,
  showArea = true,
  annotations = [],
  style,
}: LineChartProps) {
  const { c } = useTheme()
  const col = color || c.red
  if (!data || data.length < 2) return null
  const vals = data.map((d) => d.v)
  const years = data.map((d) => d.y)
  const min = Math.min(...vals),
    max = Math.max(...vals),
    range = max - min || 1
  const W = 260,
    H = height
  const toX = (i: number) => (i / (data.length - 1)) * W
  const toY = (v: number) => H - 4 - ((v - min) / range) * (H - 12)
  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.v).toFixed(1)}`).join(' ')
  const areaBottom = `${toX(data.length - 1)},${H} 0,${H}`
  const firstY = years[0],
    lastY = years[years.length - 1]
  return (
    <div style={style}>
      {yLabel && <MonoLabel style={{ marginBottom: spacing.xs }}>{yLabel}</MonoLabel>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
        aria-hidden
      >
        {showArea && (
          <polygon points={`0,${toY(data[0]!.v)} ${pts} ${areaBottom}`} fill={col} fillOpacity={0.07} />
        )}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={0}
            y1={toY(min + range * f)}
            x2={W}
            y2={toY(min + range * f)}
            stroke={c.border}
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
        ))}
        <polyline
          points={pts}
          fill="none"
          stroke={col}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={toX(data.length - 1)} cy={toY(vals[vals.length - 1]!)} r={3} fill={col} />
        {annotations.map((a, i) => {
          const idx = data.findIndex((d) => d.y >= a.year)
          if (idx < 0) return null
          const x = toX(idx)
          return (
            <g key={i}>
              <line x1={x} y1={0} x2={x} y2={H} stroke={c.subtle} strokeWidth={1} strokeDasharray="2 2" />
              <text x={x + 3} y={10} fontFamily={fonts.mono} fontSize={8} fill={c.muted}>
                {a.label}
              </text>
            </g>
          )
        })}
        <text x={0} y={H + 12} fontFamily={fonts.mono} fontSize={8} fill={c.muted}>
          {firstY}
        </text>
        <text x={W} y={H + 12} fontFamily={fonts.mono} fontSize={8} fill={c.muted} textAnchor="end">
          {lastY}
        </text>
      </svg>
    </div>
  )
}
