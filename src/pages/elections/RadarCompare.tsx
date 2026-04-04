import { useMemo } from 'react'
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import type { Lang } from '../../design-system/ThemeContext'
import { PARTY_LABELS } from './partyColors'
import { toDisplayPercent } from './normalizeWahlen'

/** CDU, SPD, Grüne, FDP, AfD, Linke – wie im Prompt */
export const RADAR_COMPARE_KEYS = [
  'cdu_csu',
  'spd',
  'gruene',
  'fdp',
  'afd',
  'linke_pds',
] as const

export type RadarCompareSeries = {
  dataKey: string
  name: string
  stroke: string
  fill: string
}

type RadarCompareProps = {
  lang: Lang
  /** Eine Zeile pro Achse (Partei), Spalten r0..rN aus series */
  chartData: Record<string, string | number>[]
  series: RadarCompareSeries[]
  domainMax: number
}

export function RadarCompare({
  lang,
  chartData,
  series,
  domainMax,
}: RadarCompareProps) {
  const { c } = useTheme()
  const sep = lang === 'de' ? ',' : '.'

  const fmtPct = useMemo(
    () => (n: number) =>
      `${toDisplayPercent(n).toFixed(1).replace('.', sep)} %`,
    [sep],
  )

  if (!chartData.length || !series.length) return null

  return (
    <div style={{ width: '100%', minHeight: 360 }}>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
          <PolarGrid stroke={c.border} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, domainMax]}
            tick={{ fill: c.muted, fontSize: 10, fontFamily: fonts.mono }}
            tickFormatter={(v) => `${Number(v).toFixed(0)}`}
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
            formatter={(value) => {
              if (value == null) return '—'
              const n = typeof value === 'number' ? value : Number(value)
              return Number.isFinite(n) ? fmtPct(n) : '—'
            }}
          />
          <Legend
            wrapperStyle={{ fontFamily: fonts.body, fontSize: 12 }}
            formatter={(v) => <span style={{ color: c.inkSoft }}>{v}</span>}
          />
          {series.map((s) => (
            <Radar
              key={s.dataKey}
              name={s.name}
              dataKey={s.dataKey}
              stroke={s.stroke}
              fill={s.fill}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function radarSubjectLabel(lang: Lang, key: string): string {
  return PARTY_LABELS[key]?.[lang] ?? key
}
