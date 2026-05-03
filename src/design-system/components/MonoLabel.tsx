import type { CSSProperties, ReactNode } from 'react'
import { fonts } from '../tokens'
import { useTheme } from '../ThemeContext'

export type MonoLabelProps = {
  children: ReactNode
  style?: CSSProperties
}

export default function MonoLabel({ children, style }: MonoLabelProps) {
  const { c } = useTheme()
  return (
    <span
      style={{
        display: 'block',
        fontFamily: fonts.mono,
        fontSize: 9,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: c.muted,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {children}
    </span>
  )
}
