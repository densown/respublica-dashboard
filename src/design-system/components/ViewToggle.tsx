import type { CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'
import { fonts, spacing } from '../tokens'

export type TradeTimeseriesView = 'lines' | 'bars' | 'stacked'
export type ViewToggleValue = TradeTimeseriesView | 'export' | 'import'

export type ViewToggleOption = {
  value: ViewToggleValue
  label: string
}

export type ViewToggleProps = {
  value: ViewToggleValue
  onChange: (next: ViewToggleValue) => void
  options?: ViewToggleOption[]
  style?: CSSProperties
}

const DEFAULT_OPTIONS: ViewToggleOption[] = [
  { value: 'lines', label: 'Lines' },
  { value: 'bars', label: 'Bars' },
  { value: 'stacked', label: 'Stacked' },
]

export default function ViewToggle({ value, onChange, options, style }: ViewToggleProps) {
  const { c } = useTheme()
  const opts = options && options.length ? options : DEFAULT_OPTIONS

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: 3,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        background: c.bg,
        ...style,
      }}
      role="tablist"
      aria-label="trade view toggle"
    >
      {opts.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              minHeight: 32,
              padding: `0 ${spacing.md}px`,
              border: `1px solid ${active ? c.red : 'transparent'}`,
              borderRadius: 6,
              background: active ? c.surface : 'transparent',
              color: active ? c.red : c.muted,
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
