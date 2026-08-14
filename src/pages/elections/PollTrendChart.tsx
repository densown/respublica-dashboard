import { useMemo, useState } from 'react'
import {
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../../design-system'
import { fonts, radius } from '../../design-system/tokens'
import type { Lang } from '../../design-system/ThemeContext'
import { PARTY_LABELS, partyColorsForTheme } from './partyColors'
import type { PollRow } from './pollTypes'

type PollTrendChartProps = {
  data: PollRow[]
  parties: readonly string[]
  lang: Lang
  /** Wahltag — wird als senkrechte Markierung eingezeichnet, wenn im Zeitraum. */
  wahlDatum?: string | null
  height?: number
}

/** Achsenbeschriftung: "Aug 26" statt "2026-08-13". */
function shortMonth(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    month: 'short',
    year: '2-digit',
  }).format(d)
}

function fullDate(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Umfrage-Zeitreihe, eine Linie je Partei.
 *
 * Aufbau bewusst analog zu TimeSeriesChart.tsx (gleiche recharts-Bausteine,
 * gleiche Farbquelle), aber auf Datum statt Wahljahr als x-Achse. Die Werte
 * kommen bereits in Prozent aus der API — kein toDisplayPercent noetig.
 */
export function PollTrendChart({
  data,
  parties,
  lang,
  wahlDatum,
  height = 360,
}: PollTrendChartProps) {
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
        if (typeof v === 'number' && Number.isFinite(v)) m = Math.max(m, v)
      }
    }
    return Math.min(60, Math.ceil(m / 5) * 5 + 5)
  }, [data, parties])

  // Wahltag nur markieren, wenn er im dargestellten Zeitraum liegt — sonst
  // staucht recharts die Achse auf einen Punkt am Rand zusammen.
  const wahltagImZeitraum = useMemo(() => {
    if (!wahlDatum || !data.length) return false
    const letzte = data[data.length - 1]?.veroeffentlicht
    return typeof letzte === 'string' && wahlDatum <= letzte
  }, [wahlDatum, data])

  const toggle = (key: string) => {
    setHidden((h) => ({ ...h, [key]: !h[key] }))
  }

  return (
    <div style={{ width: '100%', minHeight: 320 }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <XAxis
            dataKey="veroeffentlicht"
            tickFormatter={(v) => shortMonth(String(v), lang)}
            minTickGap={28}
            tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
          />
          <YAxis
            domain={[0, maxY]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
            width={40}
          />
          {/* Sperrklausel: erklaert auf einen Blick, wer um den Einzug zittert */}
          <ReferenceLine
            y={5}
            stroke={c.muted}
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
          {wahltagImZeitraum && wahlDatum && (
            <ReferenceLine x={wahlDatum} stroke={c.red} strokeWidth={1.5} />
          )}
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const row = payload[0]?.payload as PollRow | undefined
              return (
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.border}`,
                    borderRadius: radius.lg,
                    padding: '8px 10px',
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: c.ink,
                  }}
                >
                  <div style={{ marginBottom: 2, color: c.ink }}>
                    {fullDate(String(label), lang)}
                  </div>
                  {row?.institut && (
                    <div style={{ marginBottom: 6, color: c.muted }}>
                      {row.institut}
                      {row.befragte ? ` · n=${row.befragte}` : ''}
                    </div>
                  )}
                  {payload.map((item) => {
                    const num = Number(item.value)
                    const pct = Number.isFinite(num)
                      ? `${num.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`
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
            formatter={(value) => <span style={{ color: c.inkSoft }}>{value}</span>}
          />
          {parties.map((p) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              name={PARTY_LABELS[p]?.[lang] ?? p}
              stroke={partyColors[p] ?? partyColors.other}
              strokeWidth={2}
              dot={false}
              connectNulls
              hide={hidden[p]}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
