import type { CSSProperties } from 'react'
import { fontSize, fonts, radius, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import { BADGE } from '../palettes'

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

const BLUE = BADGE.blue
const AMBER = BADGE.amber
const PURPLE = BADGE.purple
const TEAL = BADGE.teal
const GRAY = BADGE.gray

export function Badge({ text, variant = 'default' }: BadgeProps) {
  const { c } = useTheme()

  const base = {
    display: 'inline-block',
    fontFamily: fonts.mono,
    fontSize: fontSize.micro,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    padding: `${spacing.xs}px ${spacing.sm}px`,
    borderRadius: radius.xs,
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
      color: c.badgeText,
    },
    purple: {
      background: PURPLE,
      color: c.badgeText,
    },
    teal: {
      background: TEAL,
      color: c.badgeText,
    },
    gray: {
      background: GRAY,
      color: c.badgeText,
    },
  }

  return (
    <span style={{ ...base, ...styles[variant] }}>{text}</span>
  )
}
