import { useMemo } from 'react'
import { fontSize, fontSize as fs, fonts, motion, radius, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type FilterOption = {
  value: string
  label: string
}

export type FilterDef = {
  label: string
  options: FilterOption[]
  /** Kontrollierter Wert. Ohne `value` bleibt das Feld unkontrolliert (alter Stand). */
  value?: string
  onChange?: (value: string) => void
}

export type FilterToolbarProps = {
  placeholder?: string
  filters: FilterDef[]
  /** Kontrolliertes Suchfeld. `false` blendet es aus. */
  search?: { value: string; onChange: (value: string) => void } | false
}

export function FilterToolbar({ placeholder, filters, search }: FilterToolbarProps) {
  const { c, t } = useTheme()

  const selectArrowDataUrl = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="${c.muted}" stroke-width="1.5" stroke-linecap="round"/></svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  }, [c.muted])

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing.md,
        alignItems: 'stretch',
        marginBottom: spacing.xl,
      }}
    >
      {search !== false && (
      <input
        type="search"
        placeholder={placeholder ?? t('search')}
        aria-label={placeholder ?? t('search')}
        {...(search ? { value: search.value, onChange: (e) => search.onChange(e.target.value) } : {})}
        style={{
          flex: 2,
          minHeight: 44,
          minWidth: 160,
          padding: `${spacing.md}px ${spacing.lg}px`,
          border: `1px solid ${c.inputBorder}`,
          borderRadius: radius.md,
          background: c.inputBg,
          color: c.ink,
          fontFamily: fonts.body,
          fontSize: fontSize.md,
          outline: 'none',
          transition: `border-color ${motion.fast} ${motion.easing}`,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = c.red
        }}
        onBlur={(e) => {
          e.target.style.borderColor = c.inputBorder
        }}
      />
      )}
      {filters.map((f) => (
        <label
          key={f.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.xs,
            flex: '1 1 140px',
            minWidth: 140,
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fs.sm,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: c.muted,
            }}
          >
            {f.label}
          </span>
          <select
            {...(f.value !== undefined
              ? { value: f.value, onChange: (e) => f.onChange?.(e.target.value) }
              : { defaultValue: f.options[0]?.value ?? '' })}
            style={{
              padding: `${spacing.md}px ${spacing.xl}px ${spacing.md}px ${spacing.md}px`,
              border: `1px solid ${c.inputBorder}`,
              borderRadius: radius.md,
              background: c.inputBg,
              color: c.ink,
              fontFamily: fonts.body,
              fontSize: fontSize.md,
              appearance: 'none',
              minHeight: 44,
              WebkitAppearance: 'none',
              backgroundImage: selectArrowDataUrl,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              cursor: 'pointer',
            }}
          >
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}
