import type { CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'

export type SparklineDatum = number | { v: number }

export type SparklineProps = {
  data: SparklineDatum[]
  color?: string
  height?: number
  showMarkers?: boolean
  width?: number
  style?: CSSProperties
}

export default function Sparkline({
  data,
  color,
  height = 48,
  showMarkers = false,
  width = 260,
  style,
}: SparklineProps) {
  const { c } = useTheme()
  const col = color || c.red
  if (!data || data.length < 2) return null
  const vals = data.map((d) => (typeof d === 'object' ? d.v : d))
  const min = Math.min(...vals),
    max = Math.max(...vals),
    range = max - min || 1
  const W = width,
    H = height
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return { x, y, v }
  })
  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const maxIdx = vals.indexOf(max),
    minIdx = vals.indexOf(min)
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      style={{ display: 'block', overflow: 'visible', ...style }}
      aria-hidden
    >
      <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke={c.border} strokeWidth={1} />
      <polyline
        points={polyline}
        fill="none"
        stroke={col}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pts[pts.length - 1]!.x} cy={pts[pts.length - 1]!.y} r={3} fill={col} />
      {showMarkers && (
        <>
          <circle
            cx={pts[maxIdx]!.x}
            cy={pts[maxIdx]!.y}
            r={3.5}
            fill="none"
            stroke={c.yes}
            strokeWidth={1.5}
          />
          <circle
            cx={pts[minIdx]!.x}
            cy={pts[minIdx]!.y}
            r={3.5}
            fill="none"
            stroke={c.no}
            strokeWidth={1.5}
          />
        </>
      )}
    </svg>
  )
}
