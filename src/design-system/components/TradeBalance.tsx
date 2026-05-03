import type { CSSProperties } from 'react'
import { fonts, spacing } from '../tokens'
import { interpolate } from '../i18n'
import { useTheme } from '../ThemeContext'

export type TradeBalanceProps = {
  exports: number
  imports: number
  currency?: string
  style?: CSSProperties
}

export default function TradeBalance({
  exports,
  imports,
  currency = 'Mrd. $',
  style,
}: TradeBalanceProps) {
  const { c, t } = useTheme()
  const total = exports + imports
  const safe = total > 0 && Number.isFinite(total)
  const expPct = safe ? (exports / total) * 100 : 50
  const impPct = safe ? (imports / total) * 100 : 50
  const balance = exports - imports
  return (
    <div style={style}>
      <div
        style={{
          display: 'flex',
          height: 20,
          borderRadius: 3,
          overflow: 'hidden',
          marginBottom: spacing.sm,
        }}
      >
        <div
          style={{
            width: `${expPct}%`,
            background: c.yes,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 9,
              color: '#fff',
              letterSpacing: '0.06em',
            }}
          >
            EXP
          </span>
        </div>
        <div
          style={{
            width: `${impPct}%`,
            background: c.no,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 9,
              color: '#fff',
              letterSpacing: '0.06em',
            }}
          >
            IMP
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: fonts.mono, fontSize: 11 }}>
        <span style={{ color: c.yes }}>
          {interpolate(t('worldConsoleTradeExportsLine'), {
            v: String(exports),
            currency,
          })}
        </span>
        <span style={{ color: balance >= 0 ? c.yes : c.no }}>
          {interpolate(t('worldConsoleTradeBalanceMid'), {
            sign: balance >= 0 ? '+' : '',
            v: String(balance),
            currency,
          })}
        </span>
        <span style={{ color: c.no }}>
          {interpolate(t('worldConsoleTradeImportsLine'), {
            v: String(imports),
            currency,
          })}
        </span>
      </div>
    </div>
  )
}
