import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../../design-system'
import { fonts, radius, spacing } from '../../design-system/tokens'
import type { Luecke, Punkt } from './zeitachse'

type Props = {
  punkte: Punkt[]
  luecken: Luecke[]
  woche: boolean
  label: string
}

const MONATE_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const MONATE_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function VerlaufChart({ punkte, luecken, woche, label }: Props) {
  const { c, t, lang } = useTheme()
  const monate = lang === 'de' ? MONATE_DE : MONATE_EN
  const zahl = (n: number) => n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')
  // Fester Y-Bereich: ohne einen einzigen Wert (Jahr fast ganz in einer
  // Luecke) kann Recharts keinen berechnen und laesst auch die Luecke weg.
  const hoechster = punkte.reduce((m, p) => (p.wert != null && p.wert > m ? p.wert : m), 0)
  const yMax = hoechster > 0 ? Math.ceil((hoechster * 1.1) / 10) * 10 : 10

  // Monatsachse: nur Januar beschriften (Jahreszahl), sonst wird es bei
  // neun Jahren unlesbar. Wochenachse: Monatsanfang.
  const tick = (p: string) => {
    if (woche) {
      const [, m, d] = p.split('-')
      return Number(d) <= 7 ? monate[Number(m) - 1] : ''
    }
    return p.endsWith('-01') ? p.slice(0, 4) : ''
  }
  const titel = (p: string) => {
    if (woche) {
      const [y, m, d] = p.split('-')
      return lang === 'de' ? `Woche ab ${Number(d)}.${Number(m)}.${y}` : `Week of ${y}-${m}-${d}`
    }
    const [y, m] = p.split('-')
    return `${monate[Number(m) - 1]} ${y}`
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={punkte} margin={{ top: spacing.sm, right: spacing.sm, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.border} />
          {luecken.map((l) => (
            <ReferenceArea
              key={l.von}
              x1={l.von}
              x2={l.bis}
              fill={c.border}
              fillOpacity={0.6}
              stroke="none"
              ifOverflow="extendDomain"
              label={{
                value: t('versammlungenLuecke'),
                position: 'insideTop',
                fill: c.muted,
                fontSize: 11,
                fontFamily: fonts.mono,
              }}
            />
          ))}
          <XAxis
            dataKey="periode"
            tickFormatter={tick}
            interval={0}
            tickLine={false}
            axisLine={{ stroke: c.border }}
            tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
            minTickGap={0}
          />
          <YAxis
            domain={[0, yMax]}
            width={44}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => zahl(v)}
            tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: c.borderHover }}
            content={({ active, payload, label: periode }) => {
              if (!active || !payload?.length) return null
              const v = payload[0].value
              return (
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.border}`,
                    borderRadius: radius.lg,
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: c.ink,
                  }}
                >
                  <div style={{ color: c.muted, marginBottom: spacing.xs }}>{titel(String(periode))}</div>
                  {typeof v === 'number' ? `${zahl(v)} ${label}` : t('versammlungenLuecke')}
                </div>
              )
            }}
          />
          {/* linear statt monotone: Glaettung schwingt ueber die Zaehlwerte hinaus */}
          <Line
            type="linear"
            dataKey="wert"
            name={label}
            stroke={c.ink}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
