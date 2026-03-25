import { useCallback } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type PaginationProps = {
  current: number
  total: number
  onChange: (page: number) => void
}

const transition = 'cubic-bezier(0.4, 0, 0.2, 1)'

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

  const pages = Array.from({ length: total }, (_, i) => i + 1)

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
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => go(p)}
          style={btn(p === current)}
          aria-current={p === current ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
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
