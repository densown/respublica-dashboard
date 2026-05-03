import { useState, type CSSProperties, type ReactNode } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type InfoToggleProps = {
  text: ReactNode
  style?: CSSProperties
}

export default function InfoToggle({ text, style }: InfoToggleProps) {
  const { c } = useTheme()
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 4, ...style }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: fonts.mono,
          fontSize: 11,
          color: c.muted,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ⓘ
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '120%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: c.cardBg,
            border: `1px solid ${c.border}`,
            borderRadius: 6,
            padding: `${spacing.sm}px ${spacing.md}px`,
            width: 220,
            zIndex: 20,
            fontFamily: fonts.body,
            fontSize: 12,
            color: c.inkSoft,
            lineHeight: 1.5,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          {text}
        </div>
      )}
    </span>
  )
}
