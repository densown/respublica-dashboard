import type { CSSProperties, ReactNode } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import type { I18nKey } from '../i18n'
import MonoLabel from './MonoLabel'

export type CompareBarProps = {
  label: ReactNode
  countryVal: number
  regionVal: number
  worldVal: number
  fmt: (v: number) => string
  inverted?: boolean
  style?: CSSProperties
}

const ROW_KEYS: [I18nKey, I18nKey, I18nKey] = [
  'worldConsoleCompareLand',
  'worldConsoleCompareRegion',
  'worldConsoleCompareWorld',
]

export default function CompareBar({
  label,
  countryVal,
  regionVal,
  worldVal,
  fmt,
  style,
}: CompareBarProps) {
  const { c, t } = useTheme()
  const items = [
    { k: ROW_KEYS[0], v: countryVal, col: c.red },
    { k: ROW_KEYS[1], v: regionVal, col: c.inkSoft },
    { k: ROW_KEYS[2], v: worldVal, col: c.subtle },
  ]
  const max = Math.max(...items.map((x) => x.v), 1e-12)
  return (
    <div style={{ marginBottom: spacing.lg, ...style }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: spacing.sm,
        }}
      >
        <span style={{ fontFamily: fonts.body, fontSize: 13, color: c.ink, fontWeight: 600 }}>{label}</span>
      </div>
      {items.map((item) => (
        <div
          key={item.k}
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 60px',
            gap: spacing.sm,
            alignItems: 'center',
            marginBottom: spacing.xs,
          }}
        >
          <MonoLabel style={{ margin: 0 }}>{t(item.k)}</MonoLabel>
          <div style={{ height: 8, background: c.bgHover, borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(item.v / max) * 100}%`,
                background: item.col,
                borderRadius: 2,
              }}
            />
          </div>
          <span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.ink, textAlign: 'right' }}>
            {fmt(item.v)}
          </span>
        </div>
      ))}
    </div>
  )
}
