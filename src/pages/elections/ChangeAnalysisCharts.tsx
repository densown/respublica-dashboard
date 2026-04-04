import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../../design-system'
import { interpolate } from '../../design-system/i18n'
import { fonts } from '../../design-system/tokens'
import { statePrefixFromAgs } from './partyColors'
import type { ChangeRow } from './types'

const HIST_BINS = 30

const STATE_ABBR: Record<string, string> = {
  '01': 'SH',
  '02': 'HH',
  '03': 'NI',
  '04': 'HB',
  '05': 'NW',
  '06': 'HE',
  '07': 'RP',
  '08': 'BW',
  '09': 'BY',
  '10': 'SL',
  '11': 'BE',
  '12': 'BB',
  '13': 'MV',
  '14': 'SN',
  '15': 'ST',
  '16': 'TH',
}

const STATE_ORDER = (Object.keys(STATE_ABBR) as string[]).sort()

function normAgs(ags: string): string {
  return ags.replace(/\s/g, '')
}

function truncLabel(s: string, max = 24): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}

function formatPp(n: number, lang: 'de' | 'en'): string {
  const sep = lang === 'de' ? ',' : '.'
  const s = Math.abs(n).toFixed(1).replace('.', sep)
  if (n > 0) return `+${s} Pp`
  if (n < 0) return `${lang === 'de' ? '−' : '-'}${s} Pp`
  return `${(0).toFixed(1).replace('.', sep)} Pp`
}

function formatNum(n: number, lang: 'de' | 'en'): string {
  return n.toFixed(1).replace('.', lang === 'de' ? ',' : '.')
}

type GainsLossesProps = {
  gains: ChangeRow[]
  losses: ChangeRow[]
  kreisLabel: (ags: string, apiName?: string | null) => string
  onSelectAgs: (ags: string) => void
  narrow: boolean
}

export function ChangeGainsLossesBarCharts({
  gains,
  losses,
  kreisLabel,
  onSelectAgs,
  narrow,
}: GainsLossesProps) {
  const { c, t, lang } = useTheme()
  const gainFill = c.yes
  const lossFill = c.no

  const gainData = useMemo(
    () =>
      gains.map((r) => ({
        ags: normAgs(r.ags),
        name: truncLabel(kreisLabel(r.ags, r.name)),
        value: r.change,
      })),
    [gains, kreisLabel],
  )

  const lossData = useMemo(
    () =>
      losses.map((r) => ({
        ags: normAgs(r.ags),
        name: truncLabel(kreisLabel(r.ags, r.name)),
        value: r.change,
      })),
    [losses, kreisLabel],
  )

  const hGain = Math.max(220, Math.max(gainData.length, 1) * 28)
  const hLoss = Math.max(220, Math.max(lossData.length, 1) * 28)

  const barBlock = (
    title: string,
    data: { ags: string; name: string; value: number }[],
    fill: string,
    xDomain: [number | string, number | string],
    labelPos: 'right' | 'left',
    chartHeight: number,
  ) => (
    <div style={{ width: '100%', minWidth: 0 }}>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: '0.9rem',
          fontWeight: 600,
          color: c.ink,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {data.length === 0 ? (
        <p
          style={{
            color: c.muted,
            fontFamily: fonts.body,
            fontSize: '0.85rem',
            margin: '12px 0 0',
            minHeight: 44,
          }}
        >
          {t('noData')}
        </p>
      ) : (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{
            top: 4,
            right: labelPos === 'right' ? 52 : 12,
            left: 4,
            bottom: 4,
          }}
        >
          <CartesianGrid stroke={c.border} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={xDomain} tick={{ fill: c.muted, fontSize: 10, fontFamily: fonts.mono }} />
          <YAxis
            type="category"
            dataKey="name"
            width={narrow ? 100 : 120}
            tick={{ fill: c.inkSoft, fontSize: 10, fontFamily: fonts.body }}
            axisLine={false}
            tickLine={false}
          />
          {labelPos === 'left' ? <ReferenceLine x={0} stroke={c.muted} strokeWidth={1} /> : null}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} fill={fill}>
            <LabelList
              dataKey="value"
              position={labelPos}
              formatter={(v: unknown) => formatPp(typeof v === 'number' ? v : Number(v), lang)}
              style={{
                fill: c.ink,
                fontFamily: fonts.mono,
                fontSize: 10,
              }}
            />
            {data.map((d) => (
              <Cell
                key={d.ags}
                fill={fill}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectAgs(d.ags)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  )

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: narrow ? '1fr' : '1fr 1fr',
        gap: narrow ? 20 : 24,
        marginTop: 28,
        width: '100%',
      }}
    >
      {barBlock(t('topGains'), gainData, gainFill, [0, 'dataMax'], 'right', hGain)}
      {barBlock(t('topLosses'), lossData, lossFill, ['dataMin', 0], 'left', hLoss)}
    </div>
  )
}

type HistogramProps = {
  rows: ChangeRow[]
  narrow: boolean
}

type HistBin = {
  binId: string
  lo: number
  hi: number
  mid: number
  count: number
  fill: string
}

export function ChangeDeltaHistogram({ rows, narrow }: HistogramProps) {
  const { c, t, lang } = useTheme()
  const posFill = c.yes
  const negFill = c.no
  const neuFill = c.muted

  const { histData, zeroBinId } = useMemo(() => {
    if (!rows.length) {
      return { histData: [] as HistBin[], zeroBinId: null as string | null }
    }
    const vals = rows.map((r) => r.change)
    let min = Math.min(...vals)
    let max = Math.max(...vals)
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { histData: [] as HistBin[], zeroBinId: null }
    }
    if (Math.abs(max - min) < 1e-9) {
      min -= 0.5
      max += 0.5
    }
    const w = (max - min) / HIST_BINS
    const bins: { lo: number; hi: number; mid: number; count: number; binId: string }[] = []
    for (let i = 0; i < HIST_BINS; i++) {
      const lo = min + i * w
      const hi = i === HIST_BINS - 1 ? max : min + (i + 1) * w
      const mid = (lo + hi) / 2
      bins.push({ lo, hi, mid, count: 0, binId: `b${i}` })
    }
    for (const v of vals) {
      if (v === max) {
        bins[HIST_BINS - 1]!.count++
        continue
      }
      let idx = Math.floor((v - min) / w)
      if (idx >= HIST_BINS) idx = HIST_BINS - 1
      if (idx < 0) idx = 0
      bins[idx]!.count++
    }
    let zeroBinId: string | null = null
    const histData: HistBin[] = bins.map((b) => {
      const fill = b.mid < 0 ? negFill : b.mid > 0 ? posFill : neuFill
      if (b.lo <= 0 && b.hi > 0) zeroBinId = b.binId
      return { ...b, fill }
    })
    return { histData, zeroBinId }
  }, [rows, posFill, negFill, neuFill])

  const mb = narrow ? 56 : 48

  return (
    <div style={{ width: '100%', marginTop: 32 }}>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: '0.9rem',
          fontWeight: 600,
          color: c.ink,
          marginBottom: 10,
        }}
      >
        {t('changeDistribution')}
      </div>
      <div style={{ width: '100%', height: narrow ? 300 : 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histData} margin={{ top: 8, right: 8, left: 4, bottom: mb }}>
            <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="binId"
              tickFormatter={(id) => {
                const b = histData.find((h) => h.binId === id)
                if (!b) return ''
                return formatNum(b.mid, lang)
              }}
              interval="preserveStartEnd"
              angle={narrow ? -50 : -40}
              textAnchor="end"
              height={mb - 8}
              tick={{ fill: c.muted, fontSize: 9, fontFamily: fonts.mono }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: c.muted, fontSize: 10, fontFamily: fonts.mono }}
              label={{
                value: t('changeHistYLabel'),
                angle: -90,
                position: 'insideLeft',
                fill: c.muted,
                fontSize: 10,
                style: { fontFamily: fonts.body },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as HistBin
                if (!p) return null
                const lo = formatNum(p.lo, lang)
                const hi = formatNum(p.hi, lang)
                const text = interpolate(t('changeHistBinTooltip'), {
                  lo,
                  hi,
                  count: p.count,
                })
                return (
                  <div
                    style={{
                      background: c.cardBg,
                      border: `1px solid ${c.border}`,
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontFamily: fonts.body,
                      fontSize: '0.8rem',
                      color: c.ink,
                      boxShadow: c.shadow,
                    }}
                  >
                    {text}
                  </div>
                )
              }}
            />
            {zeroBinId ? (
              <ReferenceLine x={zeroBinId} stroke={c.ink} strokeOpacity={0.35} strokeWidth={2} />
            ) : null}
            <Bar dataKey="count" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {histData.map((d) => (
                <Cell key={d.binId} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

type StateAvgProps = {
  rows: ChangeRow[]
  narrow: boolean
}

export function ChangeStateAverageBars({ rows, narrow }: StateAvgProps) {
  const { c, t, lang } = useTheme()
  const posFill = c.yes
  const negFill = c.no

  const chartData = useMemo(() => {
    const sums = new Map<string, { sum: number; n: number }>()
    for (const code of STATE_ORDER) sums.set(code, { sum: 0, n: 0 })
    for (const r of rows) {
      const p = statePrefixFromAgs(r.ags)
      if (!sums.has(p)) continue
      const cur = sums.get(p)!
      cur.sum += r.change
      cur.n += 1
    }
    const list = STATE_ORDER.map((code) => {
      const { sum, n } = sums.get(code) ?? { sum: 0, n: 0 }
      const avg = n > 0 ? sum / n : 0
      return {
        code,
        abbr: STATE_ABBR[code] ?? code,
        avg,
        fill: avg >= 0 ? posFill : negFill,
      }
    })
    list.sort((a, b) => b.avg - a.avg)
    return list
  }, [rows, posFill, negFill])

  return (
    <div style={{ width: '100%', marginTop: 32 }}>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: '0.9rem',
          fontWeight: 600,
          color: c.ink,
          marginBottom: 10,
        }}
      >
        {t('changeStateComparison')}
      </div>
      <div style={{ width: '100%', height: narrow ? 300 : 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: narrow ? 36 : 28 }}>
            <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="abbr"
              tick={{ fill: c.muted, fontSize: 10, fontFamily: fonts.mono }}
              interval={0}
            />
            <YAxis
              tick={{ fill: c.muted, fontSize: 10, fontFamily: fonts.mono }}
              tickFormatter={(v) => formatNum(v, lang)}
              label={{
                value: t('changeStateYLabel'),
                angle: -90,
                position: 'insideLeft',
                fill: c.muted,
                fontSize: 10,
                style: { fontFamily: fonts.body },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as (typeof chartData)[0]
                if (!p) return null
                return (
                  <div
                    style={{
                      background: c.cardBg,
                      border: `1px solid ${c.border}`,
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontFamily: fonts.body,
                      fontSize: '0.8rem',
                      color: c.ink,
                      boxShadow: c.shadow,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{p.abbr}</div>
                    <div style={{ fontFamily: fonts.mono, color: c.inkSoft, marginTop: 4 }}>
                      {formatPp(p.avg, lang)}
                    </div>
                  </div>
                )
              }}
            />
            <ReferenceLine y={0} stroke={c.muted} strokeWidth={1} />
            <Bar dataKey="avg" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {chartData.map((d) => (
                <Cell key={d.code} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
