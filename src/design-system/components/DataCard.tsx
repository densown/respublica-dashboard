import type { ReactNode } from 'react'
import { spacing, radius, motion } from '../tokens'
import { useTheme } from '../ThemeContext'

export type DataCardProps = {
  header?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  onClick?: () => void
  active?: boolean
}

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
        borderRadius: radius.lg,
        boxShadow: c.shadow,
        overflow: 'hidden',
        cursor: interactive ? 'pointer' : 'default',
        transition: `border-color ${motion.normal} ${motion.easing}, box-shadow ${motion.normal} ${motion.easing}, transform 0.2s ${motion.easing}`,
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
