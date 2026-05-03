import type { CSSProperties, ReactNode } from 'react'
import { fonts } from '../tokens'
import { useTheme } from '../ThemeContext'

export type MonoLabelProps = {
  children: ReactNode
  /** Wenn true, nutzt `c.muted` statt `c.text` */
  muted?: boolean
  style?: CSSProperties
}

export default function MonoLabel({ children, muted, style }: MonoLabelProps) {
  const { c } = useTheme()
  const base: CSSProperties = {
    display: 'block',
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 6,
    lineHeight: 1.2,
    color: muted ? c.muted : c.text,
  }
  return <span style={{ ...base, ...style }}>{children}</span>
}
