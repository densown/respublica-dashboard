import { useTheme } from '../ThemeContext'
import { fonts, spacing } from '../tokens'

export type MapProjectionMode = 'mercator' | 'globe'

type ProjectionToggleProps = {
  value: MapProjectionMode
  onChange: (next: MapProjectionMode) => void
  disabled?: boolean
  disabledReason?: string
}

export default function ProjectionToggle({
  value,
  onChange,
  disabled = false,
  disabledReason,
}: ProjectionToggleProps) {
  const { c, t } = useTheme()

  const options: { value: MapProjectionMode; label: string }[] = [
    { value: 'mercator', label: t('worldProjectionMercator') },
    { value: 'globe', label: t('worldProjectionGlobe') },
  ]

  return (
    <div
      role="group"
      aria-label={t('worldProjectionLabel')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: 3,
        border: `1px solid ${c.border}`,
        borderRadius: 999,
        background: c.bg,
        opacity: disabled ? 0.55 : 1,
      }}
      title={disabled ? disabledReason : undefined}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            aria-pressed={active}
            style={{
              minHeight: 38,
              padding: `0 ${spacing.sm}px`,
              border: `1px solid ${active ? c.red : 'transparent'}`,
              borderRadius: 999,
              background: active ? c.surface : 'transparent',
              color: active ? c.red : c.muted,
              fontFamily: fonts.mono,
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
