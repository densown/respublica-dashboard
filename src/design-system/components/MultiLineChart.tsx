import { useMemo, useState, type CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'
import { fonts, spacing } from '../tokens'

export type TradeTimeseriesPoint = {
  year: number
  total_export_usd: number
  total_import_usd: number
}

export type MultiLineChartProps = {
  data: TradeTimeseriesPoint[]
  sourceLabel: string
  height?: number
  style?: CSSProperties
}

function fmtUsdShort(v: number, locale: string) {
  const abs = Math.abs(v)
  if (abs >= 1e12) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v / 1e12)} T$`
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v / 1e9)} B$`
}

export default function MultiLineChart({ data, sourceLabel, height = 170, style }: MultiLineChartProps) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const clean = useMemo(
    () =>
      (data || [])
        .filter((d) => Number.isFinite(d.total_export_usd) && Number.isFinite(d.total_import_usd))
        .sort((a, b) => a.year - b.year),
    [data],
  )

  if (clean.length < 2) {
    return (
      <div style={{ ...style }}>
        <div style={{ color: c.muted, fontFamily: fonts.body, fontSize: 12, fontStyle: 'italic' }}>
          {t('worldConsoleTradeNoTimeseriesData')}
        </div>
      </div>
    )
  }

  const W = 320
  const H = height
  const padX = 16
  const padY = 14
  const maxV = Math.max(...clean.flatMap((d) => [d.total_export_usd, d.total_import_usd]), 1)
  const minV = 0
  const range = maxV - minV || 1
  const toX = (idx: number) => padX + (idx / (clean.length - 1)) * (W - 2 * padX)
  const toY = (v: number) => H - padY - ((v - minV) / range) * (H - 2 * padY - 16)
  const yZero = toY(0)

  const expPts = clean.map((d, i) => `${toX(i).toFixed(1)},${toY(d.total_export_usd).toFixed(1)}`).join(' ')
  const impPts = clean.map((d, i) => `${toX(i).toFixed(1)},${toY(d.total_import_usd).toFixed(1)}`).join(' ')
  const idx = activeIndex ?? clean.length - 1
  const active = clean[idx]!
  const activeX = toX(idx)

  return (
    <div style={style}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
        onClick={(ev) => {
          const rect = (ev.currentTarget as SVGSVGElement).getBoundingClientRect()
          const x = ((ev.clientX - rect.left) / rect.width) * W
          let nearest = 0
          let best = Number.POSITIVE_INFINITY
          for (let i = 0; i < clean.length; i++) {
            const dist = Math.abs(toX(i) - x)
            if (dist < best) {
              best = dist
              nearest = i
            }
          }
          setActiveIndex(nearest)
        }}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const y = toY(range * f)
          return (
            <line key={f} x1={padX} y1={y} x2={W - padX} y2={y} stroke={c.border} strokeWidth={0.7} strokeDasharray="3 3" />
          )
        })}
        <line x1={padX} y1={yZero} x2={W - padX} y2={yZero} stroke={c.border} strokeWidth={1} />
        <polyline points={expPts} fill="none" stroke={c.yes} strokeWidth={1.8} strokeLinecap="round" />
        <polyline points={impPts} fill="none" stroke={c.no} strokeWidth={1.8} strokeLinecap="round" />
        <line x1={activeX} y1={padY} x2={activeX} y2={H - padY - 12} stroke={c.subtle} strokeWidth={1} strokeDasharray="2 2" />
        <circle cx={activeX} cy={toY(active.total_export_usd)} r={3} fill={c.yes} />
        <circle cx={activeX} cy={toY(active.total_import_usd)} r={3} fill={c.no} />
        <text x={padX} y={H - 1} fontFamily={fonts.mono} fontSize={8} fill={c.muted}>
          {clean[0]!.year}
        </text>
        <text x={W - padX} y={H - 1} fontFamily={fonts.mono} fontSize={8} fill={c.muted} textAnchor="end">
          {clean[clean.length - 1]!.year}
        </text>
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.xs }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.yes }}>
          EXP {active.year}: {fmtUsdShort(active.total_export_usd, locale)}
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.no }}>
          IMP {active.year}: {fmtUsdShort(active.total_import_usd, locale)}
        </span>
      </div>
      <div style={{ marginTop: spacing.xs, fontFamily: fonts.body, fontSize: 11, color: c.muted }}>{sourceLabel}</div>
    </div>
  )
}
