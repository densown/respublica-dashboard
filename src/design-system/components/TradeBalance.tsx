import type { CSSProperties } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type TradeBalanceProps = {
  exportLabel: string
  importLabel: string
  exportValue: number
  importValue: number
  /** Einheit, z. B. „Mrd. $“ */
  unit?: string
  style?: CSSProperties
}

export default function TradeBalance({
  exportLabel,
  importLabel,
  exportValue,
  importValue,
  unit = '',
  style,
}: TradeBalanceProps) {
  const { c } = useTheme()
  const total = Math.max(exportValue + importValue, 1e-9)
  const exFrac = exportValue / total
  const imFrac = importValue / total
  return (
    <div style={{ minWidth: 0, ...style }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: fonts.mono,
          fontSize: 10,
          color: c.muted,
          marginBottom: spacing.sm,
        }}
      >
        <span>{exportLabel}</span>
        <span>{importLabel}</span>
      </div>
      <div
        style={{
          display: 'flex',
          height: 12,
          borderRadius: 6,
          overflow: 'hidden',
          border: `1px solid ${c.border}`,
        }}
      >
        <div style={{ width: `${exFrac * 100}%`, background: c.red }} />
        <div style={{ width: `${imFrac * 100}%`, background: c.muted, opacity: 0.5 }} />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: spacing.sm,
          fontFamily: fonts.display,
          fontSize: 14,
          fontWeight: 700,
          color: c.text,
        }}
      >
        <span>
          {exportValue}
          {unit ? ` ${unit}` : ''}
        </span>
        <span>
          {importValue}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
    </div>
  )
}
