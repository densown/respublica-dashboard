import { useMemo, useState, type CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'
import { fonts, spacing } from '../tokens'

export type TradeTimeseriesPoint = {
  year: number
  total_export_usd: number
  total_import_usd: number
}

export type StackedAreaChartProps = {
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

export default function StackedAreaChart({ data, sourceLabel, height = 170, style }: StackedAreaChartProps) {
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
  const totals = clean.map((d) => d.total_export_usd + d.total_import_usd)
  const maxV = Math.max(...totals, 1)
  const toX = (idx: number) => padX + (idx / (clean.length - 1)) * (W - 2 * padX)
  const toY = (v: number) => H - padY - (v / maxV) * (H - 2 * padY - 16)
  const yZero = toY(0)

  const importTop = clean.map((d, i) => `${toX(i).toFixed(1)},${toY(d.total_import_usd).toFixed(1)}`).join(' ')
  const totalTop = clean
    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.total_import_usd + d.total_export_usd).toFixed(1)}`)
    .join(' ')
  const importArea = `${importTop} ${toX(clean.length - 1)},${yZero} ${toX(0)},${yZero}`
  const totalPathTop = clean
    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.total_import_usd + d.total_export_usd).toFixed(1)}`)
    .join(' ')
  const totalPathBottom = clean
    .slice()
    .reverse()
    .map((d, i) => {
      const idx = clean.length - 1 - i
      return `${toX(idx).toFixed(1)},${toY(d.total_import_usd).toFixed(1)}`
    })
    .join(' ')
  const exportArea = `${totalPathTop} ${totalPathBottom}`

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
        <line x1={padX} y1={yZero} x2={W - padX} y2={yZero} stroke={c.border} strokeWidth={1} />
        <polygon points={importArea} fill={c.no} fillOpacity={0.25} />
        <polygon points={exportArea} fill={c.yes} fillOpacity={0.23} />
        <polyline points={importTop} fill="none" stroke={c.no} strokeWidth={1.4} />
        <polyline points={totalTop} fill="none" stroke={c.yes} strokeWidth={1.4} />
        <line x1={activeX} y1={padY} x2={activeX} y2={yZero} stroke={c.subtle} strokeWidth={1} strokeDasharray="2 2" />
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
