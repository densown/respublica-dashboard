import { useCallback } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type PaginationProps = {
  current: number
  total: number
  onChange: (page: number) => void
}

const transition = 'cubic-bezier(0.4, 0, 0.2, 1)'

function getPaginationItems(
  current: number,
  total: number,
): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const items: (number | 'ellipsis')[] = []

  // Immer Seite 1
  items.push(1)

  // Linker Bereich
  if (current <= 4) {
    // current ist nahe Anfang: 1 2 3 4 5 ... last
    items.push(2, 3, 4, 5)
    items.push('ellipsis')
  } else if (current >= total - 3) {
    // current ist nahe Ende: 1 ... (last-4) (last-3) (last-2) (last-1)
    items.push('ellipsis')
    items.push(total - 4, total - 3, total - 2, total - 1)
  } else {
    // current in der Mitte: 1 ... (c-1) c (c+1) ... last
    items.push('ellipsis')
    items.push(current - 1, current, current + 1)
    items.push('ellipsis')
  }

  // Immer letzte Seite
  items.push(total)

  return items
}

export function Pagination({ current, total, onChange }: PaginationProps) {
  const { c } = useTheme()

  const go = useCallback(
    (p: number) => {
      if (p < 1 || p > total) return
      onChange(p)
    },
    [onChange, total],
  )

  const btn = useCallback(
    (active: boolean) => ({
      minWidth: 36,
      height: 36,
      padding: `0 ${spacing.sm}px`,
      border: `1px solid ${active ? c.red : c.border}`,
      borderRadius: 6,
      background: active ? c.bgHover : c.bgAlt,
      color: active ? c.red : c.inkSoft,
      fontFamily: fonts.mono,
      fontSize: '0.75rem',
      cursor: 'pointer',
      transition: `border-color 0.2s ${transition}, color 0.2s ${transition}, background 0.2s ${transition}`,
    }),
    [c],
  )

  const items = getPaginationItems(current, total)

  return (
    <nav
      aria-label="Pagination"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.xl,
      }}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={current <= 1}
        onClick={() => go(current - 1)}
        style={{
          ...btn(false),
          opacity: current <= 1 ? 0.4 : 1,
          pointerEvents: current <= 1 ? 'none' : 'auto',
        }}
      >
        ‹
      </button>
      {items.map((item, idx) => {
        if (item === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${idx}`}
              style={{
                padding: `0 ${spacing.xs ?? spacing.sm}px`,
                color: c.inkSoft,
                fontFamily: fonts.mono,
                fontSize: '0.75rem',
                userSelect: 'none',
              }}
            >
              ...
            </span>
          )
        }
        return (
          <button
            key={item}
            type="button"
            onClick={() => go(item)}
            style={btn(item === current)}
            aria-current={item === current ? 'page' : undefined}
          >
            {item}
          </button>
        )
      })}
      <button
        type="button"
        aria-label="Next page"
        disabled={current >= total}
        onClick={() => go(current + 1)}
        style={{
          ...btn(false),
          opacity: current >= total ? 0.4 : 1,
          pointerEvents: current >= total ? 'none' : 'auto',
        }}
      >
        ›
      </button>
    </nav>
  )
}
