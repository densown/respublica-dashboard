import type { CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'
import { fonts, fontSize, radius, spacing } from '../tokens'

export type TradeTimeseriesView = 'lines' | 'bars' | 'stacked'
export type ViewToggleValue = TradeTimeseriesView | 'export' | 'import'

export type ViewToggleOption<T extends string = ViewToggleValue> = {
  value: T
  label: string
}

export type ViewToggleProps<T extends string = ViewToggleValue> = {
  value: T
  onChange: (next: T) => void
  options?: ViewToggleOption<T>[]
  /** Wofuer der Umschalter ist, fuer Screenreader. */
  ariaLabel?: string
  style?: CSSProperties
}

const DEFAULT_OPTIONS: ViewToggleOption[] = [
  { value: 'lines', label: 'Lines' },
  { value: 'bars', label: 'Bars' },
  { value: 'stacked', label: 'Stacked' },
]

/**
 * Umschalter zwischen Ansichten, die sich ausschliessen (docs/DESIGN.md,
 * Abschnitt 6). Urspruenglich nur fuer die Handelsdaten gebaut; seit der
 * Bundestag-Uebersicht mit beliebigen Werten und 44 px Touch-Ziel.
 */
export default function ViewToggle<T extends string = ViewToggleValue>({
  value,
  onChange,
  options,
  ariaLabel,
  style,
}: ViewToggleProps<T>) {
  const { c } = useTheme()
  const opts = options && options.length ? options : (DEFAULT_OPTIONS as ViewToggleOption<string>[] as ViewToggleOption<T>[])

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: 3,
        border: `1px solid ${c.border}`,
        borderRadius: radius.lg,
        background: c.bg,
        ...style,
      }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {opts.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            className="rp-chip"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              minHeight: 44,
              padding: `0 ${spacing.md}px`,
              border: `1px solid ${active ? c.red : 'transparent'}`,
              borderRadius: radius.md,
              background: active ? c.surface : 'transparent',
              color: active ? c.red : c.muted,
              fontFamily: fonts.mono,
              fontSize: fontSize.micro,
              fontWeight: active ? 600 : 400,
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
