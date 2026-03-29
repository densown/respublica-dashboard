import type { CSSProperties } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type BadgeVariant =
  | 'default'
  | 'yes'
  | 'no'
  | 'muted'
  | 'blue'
  | 'amber'
  | 'purple'
  | 'teal'
  | 'gray'

export type BadgeProps = {
  text: string
  variant?: BadgeVariant
}

const BLUE = '#1E40AF'
const AMBER = '#C2410C'
const PURPLE = '#6B21A8'
const TEAL = '#0F766E'
const GRAY = '#6B7280'

export function Badge({ text, variant = 'default' }: BadgeProps) {
  const { c } = useTheme()

  const base = {
    display: 'inline-block',
    fontFamily: fonts.mono,
    fontSize: '0.63rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    padding: `${spacing.xs}px ${spacing.sm}px`,
    borderRadius: 3,
    lineHeight: 1.2,
  }

  const styles: Record<BadgeVariant, CSSProperties> = {
    default: {
      background: c.badgeBg,
      color: c.badgeText,
    },
    yes: {
      background: c.yes,
      color: c.badgeText,
    },
    no: {
      background: c.no,
      color: c.badgeText,
    },
    muted: {
      background: c.bgHover,
      color: c.muted,
      border: `1px solid ${c.border}`,
    },
    blue: {
      background: BLUE,
      color: c.badgeText,
    },
    amber: {
      background: AMBER,
      color: '#FFFFFF',
    },
    purple: {
      background: PURPLE,
      color: '#FFFFFF',
    },
    teal: {
      background: TEAL,
      color: '#FFFFFF',
    },
    gray: {
      background: GRAY,
      color: '#FFFFFF',
    },
  }

  return (
    <span style={{ ...base, ...styles[variant] }}>{text}</span>
  )
}
