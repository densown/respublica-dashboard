import { useTheme } from '../../design-system'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import type { Lang } from '../../design-system/ThemeContext'
import { interpolate, type I18nKey } from '../../design-system/i18n'

type PercentileBarProps = {
  lang: Lang
  t: (k: I18nKey) => string
  min: number
  max: number
  value: number
  rank: number
  total: number
  /** Optional: leichte Partei-Tönung im Verlauf */
  accentColor?: string
}

export function PercentileBar({
  lang,
  t,
  min,
  max,
  value,
  rank,
  total,
  accentColor,
}: PercentileBarProps) {
  const { c } = useTheme()
  const sep = lang === 'de' ? ',' : '.'
  const fmt = (n: number) => n.toFixed(1).replace('.', sep)

  const span = max - min
  const pct =
    span <= 0 || !Number.isFinite(span)
      ? 50
      : Math.min(100, Math.max(0, ((value - min) / span) * 100))

  const gradLeft = c.gradStart
  const gradRight = c.gradEnd
  const gradient = accentColor
    ? `linear-gradient(90deg, ${gradLeft} 0%, ${accentColor}40 50%, ${gradRight} 100%)`
    : `linear-gradient(90deg, ${gradLeft} 0%, ${gradRight} 100%)`

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          position: 'relative',
          height: 44,
          borderRadius: radius.lg,
          background: gradient,
          border: `1px solid ${c.border}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${pct}%`,
            top: 0,
            bottom: 0,
            width: 3,
            marginLeft: -1.5,
            background: c.red,
            borderRadius: radius.xs,
            pointerEvents: 'none',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontFamily: fonts.mono,
          fontSize: fontSize.xs,
          color: c.muted,
        }}
      >
        <span>{fmt(min)}%</span>
        <span>{fmt(max)}%</span>
      </div>
      <div
        style={{
          textAlign: 'center',
          marginTop: spacing.sm,
          fontFamily: fonts.mono,
          fontSize: fontSize.md,
          color: c.text,
        }}
      >
        {fmt(value)}% · {interpolate(t('rankOf'), { rank, total })}
      </div>
    </div>
  )
}
