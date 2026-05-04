import { useMemo, useState, type CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'
import { fonts, spacing } from '../tokens'

export type TradeTimeseriesPoint = {
  year: number
  total_export_usd: number
  total_import_usd: number
}

export type BalanceBarChartProps = {
  data: TradeTimeseriesPoint[]
  sourceLabel: string
  height?: number
  style?: CSSProperties
}

function fmtBn(v: number, locale: string) {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v / 1e9)} B$`
}

export default function BalanceBarChart({ data, sourceLabel, height = 170, style }: BalanceBarChartProps) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const clean = useMemo(
    () =>
      (data || [])
        .filter((d) => Number.isFinite(d.total_export_usd) && Number.isFinite(d.total_import_usd))
        .sort((a, b) => a.year - b.year)
        .map((d) => ({ ...d, balance_usd: d.total_export_usd - d.total_import_usd })),
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
  const maxAbs = Math.max(...clean.map((d) => Math.abs(d.balance_usd)), 1)
  const toY = (v: number) => padY + ((maxAbs - v) / (2 * maxAbs)) * (H - 2 * padY - 16)
  const yZero = toY(0)
  const barGap = 4
  const barW = Math.max(5, ((W - 2 * padX) / clean.length) - barGap)

  const idx = activeIndex ?? clean.length - 1
  const active = clean[idx]!

  return (
    <div style={style}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
        <line x1={padX} y1={yZero} x2={W - padX} y2={yZero} stroke={c.border} strokeWidth={1.1} />
        {clean.map((d, i) => {
          const x = padX + i * (barW + barGap)
          const y = Math.min(yZero, toY(d.balance_usd))
          const h = Math.abs(toY(d.balance_usd) - yZero)
          const isActive = i === idx
          return (
            <g key={d.year}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(1, h)}
                rx={2}
                fill={d.balance_usd >= 0 ? c.yes : c.no}
                opacity={isActive ? 1 : 0.82}
                style={{ transition: 'all 0.3s ease-out', cursor: 'pointer' }}
                onClick={() => setActiveIndex(i)}
              />
              {isActive ? <rect x={x - 1} y={y - 1} width={barW + 2} height={Math.max(2, h + 2)} rx={3} fill="none" stroke={c.red} strokeWidth={1} /> : null}
            </g>
          )
        })}
        <text x={padX} y={H - 1} fontFamily={fonts.mono} fontSize={8} fill={c.muted}>
          {clean[0]!.year}
        </text>
        <text x={W - padX} y={H - 1} fontFamily={fonts.mono} fontSize={8} fill={c.muted} textAnchor="end">
          {clean[clean.length - 1]!.year}
        </text>
      </svg>
      <div style={{ marginTop: spacing.xs, fontFamily: fonts.mono, fontSize: 10, color: active.balance_usd >= 0 ? c.yes : c.no }}>
        {active.year}: {active.balance_usd >= 0 ? '+' : ''}
        {fmtBn(active.balance_usd, locale)}
      </div>
      <div style={{ marginTop: spacing.xs, fontFamily: fonts.body, fontSize: 11, color: c.muted }}>{sourceLabel}</div>
    </div>
  )
}
