import { useMemo, type CSSProperties } from 'react'
import { fonts } from '../tokens'
import { useTheme } from '../ThemeContext'

const PAD = { l: 36, r: 8, t: 10, b: 22 }

export type LineChartPoint = { x: number; y: number }

export type LineChartProps = {
  data: LineChartPoint[]
  width?: number
  height?: number
  /** Beschriftung X-Achse (z. B. erste und letzte Jahr) */
  formatX?: (x: number) => string
  style?: CSSProperties
}

export default function LineChart({
  data,
  width = 280,
  height = 120,
  formatX = (x) => String(Math.round(x)),
  style,
}: LineChartProps) {
  const { c } = useTheme()

  const { path, x0, x1, ticks } = useMemo(() => {
    const pts = data.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    if (pts.length < 1) {
      return { path: '', x0: 0, x1: 1, ticks: [] as number[] }
    }
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    let minX = Math.min(...xs)
    let maxX = Math.max(...xs)
    let minY = Math.min(...ys)
    let maxY = Math.max(...ys)
    if (minX === maxX) {
      minX -= 1
      maxX += 1
    }
    if (minY === maxY) {
      minY -= 1e-6
      maxY += 1e-6
    }
    const innerW = width - PAD.l - PAD.r
    const innerH = height - PAD.t - PAD.b
    const sx = (x: number) => PAD.l + ((x - minX) / (maxX - minX)) * innerW
    const sy = (y: number) => PAD.t + (1 - (y - minY) / (maxY - minY)) * innerH
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ')
    return { path: d, x0: minX, x1: maxX, ticks: [minX, maxX] }
  }, [data, width, height])

  if (data.length < 1 || !path) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: c.muted,
          fontSize: 12,
          ...style,
        }}
      >
        —
      </div>
    )
  }

  const spanX = x1 - x0 || 1
  const innerW = width - PAD.l - PAD.r

  return (
    <svg width={width} height={height} style={{ display: 'block', maxWidth: '100%', ...style }}>
      <line
        x1={PAD.l}
        y1={height - PAD.b}
        x2={width - PAD.r}
        y2={height - PAD.b}
        stroke={c.border}
        strokeWidth={1}
      />
      <path d={path} fill="none" stroke={c.red} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {ticks.map((tx) => {
        const px = PAD.l + ((tx - x0) / spanX) * innerW
        return (
          <text
            key={tx}
            x={px}
            y={height - 4}
            textAnchor="middle"
            fill={c.muted}
            fontFamily={fonts.mono}
            fontSize={9}
          >
            {formatX(tx)}
          </text>
        )
      })}
    </svg>
  )
}
