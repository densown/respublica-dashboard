import { useMemo, useState } from 'react'
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import type { Lang } from '../../design-system/ThemeContext'
import { toDisplayPercent } from './normalizeWahlen'
import { MAIN_PARTIES, PARTY_LABELS, partyColorsForTheme } from './partyColors'

export type TsRow = Record<string, number | undefined> & { year: number }

type TimeSeriesChartProps = {
  data: TsRow[]
  parties: readonly string[]
  lang: Lang
  compareLabel?: string
}

export function TimeSeriesChart({
  data,
  parties,
  lang,
  compareLabel,
}: TimeSeriesChartProps) {
  const { c, theme } = useTheme()
  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )
  const [hidden, setHidden] = useState<Record<string, boolean>>({})

  const maxY = useMemo(() => {
    let m = 5
    for (const row of data) {
      for (const p of parties) {
        const v = row[p]
        if (typeof v === 'number' && !Number.isNaN(v))
          m = Math.max(m, toDisplayPercent(v))
        const ck = `${p}_cmp`
        const v2 = row[ck]
        if (typeof v2 === 'number' && !Number.isNaN(v2))
          m = Math.max(m, toDisplayPercent(v2))
      }
    }
    return Math.min(55, Math.ceil(m / 5) * 5 + 5)
  }, [data, parties])

  const toggle = (key: string) => {
    setHidden((h) => ({ ...h, [key]: !h[key] }))
  }

  return (
    <div style={{ width: '100%', minHeight: 320 }}>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <XAxis
            dataKey="year"
            tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
          />
          <YAxis
            domain={[0, maxY]}
            tickFormatter={(v) =>
              `${toDisplayPercent(v).toFixed(0).replace('.', lang === 'de' ? ',' : '.')}%`
            }
            tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              fontFamily: fonts.mono,
              fontSize: 12,
              color: c.ink,
            }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: c.ink,
                  }}
                >
                  <div style={{ marginBottom: 6, color: c.muted }}>{label}</div>
                  {payload.map((item) => {
                    const v = item.value
                    const num =
                      typeof v === 'number' ? v : Number(v)
                    const pct = Number.isFinite(num)
                      ? `${toDisplayPercent(num).toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`
                      : '—'
                    return (
                      <div key={String(item.dataKey)} style={{ color: c.inkSoft }}>
                        {item.name}: {pct}
                      </div>
                    )
                  })}
                </div>
              )
            }}
          />
          <Legend
            wrapperStyle={{ fontFamily: fonts.body, fontSize: 12 }}
            onClick={(e: unknown) => {
              const d = (e as { dataKey?: unknown }).dataKey
              if (typeof d === 'string' && d) toggle(d)
            }}
            formatter={(value) => (
              <span style={{ color: c.inkSoft }}>{value}</span>
            )}
          />
          {parties.map((p) => {
            const color = partyColors[p] ?? partyColors.other
            const label = PARTY_LABELS[p]?.[lang] ?? p
            return (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                name={label}
                stroke={color}
                strokeWidth={2}
                dot={false}
                connectNulls
                hide={hidden[p]}
                isAnimationActive={false}
              />
            )
          })}
          {compareLabel &&
            parties.map((p) => {
              const key = `${p}_cmp`
              const color = partyColors[p] ?? partyColors.other
              const label = `${PARTY_LABELS[p]?.[lang] ?? p} (${compareLabel})`
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={label}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls
                  hide={hidden[key]}
                  strokeOpacity={0.85}
                  isAnimationActive={false}
                />
              )
            })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export const TIMESERIES_PARTIES = MAIN_PARTIES
