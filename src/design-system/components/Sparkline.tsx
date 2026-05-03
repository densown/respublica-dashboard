import { useMemo, type CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'

export type SparklinePoint = { value: number; year?: number }

export type SparklineProps = {
  points: SparklinePoint[]
  height?: number
  /** Peak- und Tiefpunkt als Kreise markieren */
  showPeakTrough?: boolean
  style?: CSSProperties
}

export default function Sparkline({
  points,
  height = 44,
  showPeakTrough = true,
  style,
}: SparklineProps) {
  const { c } = useTheme()
  const w = 120
  const pad = 4

    const { pathD, markers } = useMemo(() => {
    const valid = points.filter((p) => Number.isFinite(p.value))
    if (valid.length < 1) {
      return { pathD: '', markers: [] as { i: number; x: number; y: number; kind: 'peak' | 'trough' }[] }
    }
    const vals = valid.map((p) => p.value)
    let peakI = 0
    let troughI = 0
    for (let i = 1; i < vals.length; i++) {
      if (vals[i]! > vals[peakI]!) peakI = i
      if (vals[i]! < vals[troughI]!) troughI = i
    }
    const vmin = Math.min(...vals)
    const vmax = Math.max(...vals)
    const span = vmax - vmin || 1
    const n = valid.length
    const coords = valid.map((p, i) => {
      const x = n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad)
      const y = pad + (1 - (p.value - vmin) / span) * (height - 2 * pad)
      return { x, y }
    })
    const d =
      coords.length > 0
        ? `M ${coords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`
        : ''
    const markers: { i: number; x: number; y: number; kind: 'peak' | 'trough' }[] = []
    if (showPeakTrough && n > 1) {
      if (peakI === troughI) {
        markers.push({ i: peakI, x: coords[peakI]!.x, y: coords[peakI]!.y, kind: 'peak' })
      } else {
        markers.push({ i: peakI, x: coords[peakI]!.x, y: coords[peakI]!.y, kind: 'peak' })
        markers.push({ i: troughI, x: coords[troughI]!.x, y: coords[troughI]!.y, kind: 'trough' })
      }
    }
    return { pathD: d, markers }
  }, [points, height, showPeakTrough])

  if (points.length < 1 || !pathD) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          color: c.muted,
          fontSize: 11,
          ...style,
        }}
      >
        —
      </div>
    )
  }

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', maxWidth: '100%', ...style }}
      aria-hidden
    >
      <path
        d={pathD}
        fill="none"
        stroke={c.red}
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
      />
      {markers.map((m) => (
        <circle
          key={`${m.kind}-${m.i}`}
          cx={m.x}
          cy={m.y}
          r={m.kind === 'peak' ? 3.5 : 3}
          fill={m.kind === 'peak' ? c.red : c.muted}
          stroke={c.cardBg}
          strokeWidth={1}
        />
      ))}
    </svg>
  )
}
