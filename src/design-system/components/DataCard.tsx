import type { ReactNode } from 'react'
import { spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type DataCardProps = {
  header?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  onClick?: () => void
  active?: boolean
}

const transition = 'cubic-bezier(0.4, 0, 0.2, 1)'

export function DataCard({
  header,
  children,
  footer,
  onClick,
  active,
}: DataCardProps) {
  const { c } = useTheme()
  const interactive = Boolean(onClick)

  return (
    <article
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      style={{
        background: c.cardBg,
        border: `1px solid ${active ? c.red : c.cardBorder}`,
        borderRadius: 8,
        boxShadow: c.shadow,
        overflow: 'hidden',
        cursor: interactive ? 'pointer' : 'default',
        transition: `border-color 0.25s ${transition}, box-shadow 0.25s ${transition}, transform 0.2s ${transition}`,
      }}
      onMouseEnter={
        interactive
          ? (e) => {
              e.currentTarget.style.borderColor = c.borderHover
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          : undefined
      }
      onMouseLeave={
        interactive
          ? (e) => {
              e.currentTarget.style.borderColor = active ? c.red : c.cardBorder
              e.currentTarget.style.transform = 'none'
            }
          : undefined
      }
    >
      {header && (
        <div
          style={{
            padding: `${spacing.lg}px ${spacing.lg}px 0`,
            borderBottom: `1px solid ${c.border}`,
            paddingBottom: spacing.md,
          }}
        >
          {header}
        </div>
      )}
      <div style={{ padding: spacing.lg }}>{children}</div>
      {footer && (
        <div
          style={{
            padding: `0 ${spacing.lg}px ${spacing.lg}px`,
            borderTop: `1px solid ${c.border}`,
            paddingTop: spacing.md,
          }}
        >
          {footer}
        </div>
      )}
    </article>
  )
}
