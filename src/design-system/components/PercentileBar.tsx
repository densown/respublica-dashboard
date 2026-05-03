import type { CSSProperties, ReactNode } from 'react'
import { fonts, spacing } from '../tokens'
import { interpolate } from '../i18n'
import { useTheme } from '../ThemeContext'
import MonoLabel from './MonoLabel'

export type PercentileBarProps = {
  pct: number
  label?: ReactNode
  inverted?: boolean
  /** Zeile unter dem Balken (z. B. i18n „Besser als …“) */
  footer?: ReactNode
  style?: CSSProperties
}

export default function PercentileBar({
  pct,
  label,
  inverted = false,
  footer,
  style,
}: PercentileBarProps) {
  const { c, t } = useTheme()
  const displayed = inverted ? 100 - pct : pct
  const color = displayed > 66 ? c.yes : displayed > 33 ? c.red : c.no
  return (
    <div style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <MonoLabel>{label || 'Perzentil'}</MonoLabel>
        <span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.ink, fontWeight: 500 }}>
          {Math.round(displayed)}. Pz.
        </span>
      </div>
      <div style={{ height: 6, background: c.bgHover, borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${displayed}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
      <div
        style={{
          marginTop: spacing.xs,
          fontFamily: fonts.body,
          fontSize: 11,
          color: c.muted,
          fontStyle: 'italic',
        }}
      >
        {footer ??
          interpolate(t('worldConsolePercentileBetterThan'), {
            n: String(Math.round(displayed)),
          })}
      </div>
    </div>
  )
}
