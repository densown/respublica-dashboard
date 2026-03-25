import { useMemo } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type FilterOption = {
  value: string
  label: string
}

export type FilterDef = {
  label: string
  options: FilterOption[]
}

export type FilterToolbarProps = {
  placeholder?: string
  filters: FilterDef[]
}

const transition = 'cubic-bezier(0.4, 0, 0.2, 1)'

export function FilterToolbar({ placeholder, filters }: FilterToolbarProps) {
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
      <input
        type="search"
        placeholder={placeholder ?? t('search')}
        style={{
          flex: 2,
          minWidth: 160,
          padding: `${spacing.md}px ${spacing.lg}px`,
          border: `1px solid ${c.inputBorder}`,
          borderRadius: 6,
          background: c.inputBg,
          color: c.ink,
          fontFamily: fonts.body,
          fontSize: '0.9rem',
          outline: 'none',
          transition: `border-color 0.2s ${transition}`,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = c.red
        }}
        onBlur={(e) => {
          e.target.style.borderColor = c.inputBorder
        }}
      />
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
              fontSize: '0.6rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: c.muted,
            }}
          >
            {f.label}
          </span>
          <select
            defaultValue={f.options[0]?.value ?? ''}
            style={{
              padding: `${spacing.md}px ${spacing.xl}px ${spacing.md}px ${spacing.md}px`,
              border: `1px solid ${c.inputBorder}`,
              borderRadius: 6,
              background: c.inputBg,
              color: c.ink,
              fontFamily: fonts.body,
              fontSize: '0.88rem',
              appearance: 'none',
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
