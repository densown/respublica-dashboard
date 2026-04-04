import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import type { Lang } from '../../design-system/ThemeContext'
import { toDisplayPercent } from './normalizeWahlen'
import { PARTY_LABELS, partyColorsForTheme } from './partyColors'

export type PartyBarRow = { party: string; value: number }

type PartyBarChartProps = {
  data: PartyBarRow[]
  year: number
  lang: Lang
  /** Gemeinsame horizontale Skala (z. B. Kreisvergleich) */
  valueMax?: number
  /** Optional: Kreisname oberhalb der Jahreszeile */
  regionCaption?: string
}

export function PartyBarChart({
  data,
  year,
  lang,
  valueMax,
  regionCaption,
}: PartyBarChartProps) {
  const { c, theme } = useTheme()
  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const xMax =
    valueMax != null && valueMax > 0
      ? valueMax
      : ('dataMax' as const)

  return (
    <div style={{ width: '100%', minHeight: 220 }}>
      {regionCaption ? (
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: '0.9rem',
            fontWeight: 600,
            color: c.text,
            marginBottom: 4,
          }}
        >
          {regionCaption}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: '0.85rem',
          color: c.muted,
          marginBottom: 8,
        }}
      >
        {year}
      </div>
      <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 28)}>
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
        >
          <XAxis type="number" domain={[0, xMax]} hide />
          <YAxis
            type="category"
            dataKey="party"
            width={92}
            tickFormatter={(party) => PARTY_LABELS[party]?.[lang] ?? party}
            tick={{ fill: c.inkSoft, fontSize: 11, fontFamily: fonts.body }}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: unknown) => {
                const n = typeof v === 'number' ? v : Number(v)
                if (!Number.isFinite(n)) return ''
                const pct = toDisplayPercent(n)
                return `${pct.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`
              }}
              style={{
                fill: c.text,
                fontFamily: fonts.mono,
                fontSize: 11,
              }}
            />
            {sorted.map((entry) => (
              <Cell
                key={entry.party}
                fill={partyColors[entry.party] ?? partyColors.other}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
