import { useState, type CSSProperties, type ReactNode } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type InfoToggleProps = {
  summary: ReactNode
  children: ReactNode
  /** Aria-Label für den Schalter */
  toggleLabel: string
  defaultOpen?: boolean
  style?: CSSProperties
}

export default function InfoToggle({
  summary,
  children,
  toggleLabel,
  defaultOpen = false,
  style,
}: InfoToggleProps) {
  const { c } = useTheme()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ minWidth: 0, ...style }}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={toggleLabel}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          width: '100%',
          minHeight: 44,
          padding: `${spacing.xs}px 0`,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: c.text,
          fontFamily: fonts.body,
          fontSize: '0.82rem',
          textAlign: 'left',
        }}
      >
        <span
          aria-hidden
          style={{
            fontFamily: fonts.mono,
            fontSize: 12,
            color: c.red,
            width: 22,
            flexShrink: 0,
          }}
        >
          {open ? '▾' : '▸'}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>{summary}</span>
      </button>
      {open ? (
        <div
          style={{
            marginTop: spacing.sm,
            paddingLeft: 30,
            fontFamily: fonts.body,
            fontSize: '0.8rem',
            lineHeight: 1.45,
            color: c.muted,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
