import type { ReactNode } from 'react'
import { spacing, motion } from '../tokens'
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
      // Zeitungsspalte statt Kasten: die Karte liegt auf dem Papier, eine
      // Linie oben trennt sie von der vorigen (wie die Kleine-Anfragen-Liste)
      style={{
        background: 'transparent',
        borderTop: `${active ? 2 : 1}px solid ${active ? c.red : c.border}`,
        cursor: interactive ? 'pointer' : 'default',
        transition: `border-color ${motion.normal} ${motion.easing}`,
      }}
      onMouseEnter={
        interactive
          ? (e) => {
              if (!active) e.currentTarget.style.borderTopColor = c.ink
            }
          : undefined
      }
      onMouseLeave={
        interactive
          ? (e) => {
              e.currentTarget.style.borderTopColor = active ? c.red : c.border
            }
          : undefined
      }
    >
      {header && (
        <div
          style={{
            paddingTop: spacing.lg,
          }}
        >
          {header}
        </div>
      )}
      <div style={{ padding: `${header ? spacing.md : spacing.lg}px 0 ${spacing.lg}px` }}>{children}</div>
      {footer && (
        <div
          style={{
            paddingBottom: spacing.lg,
          }}
        >
          {footer}
        </div>
      )}
    </article>
  )
}
