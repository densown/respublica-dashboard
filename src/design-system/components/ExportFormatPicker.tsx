import { useRef, useEffect } from 'react'
import { fonts, spacing, radius, motion } from '../tokens'
import { useTheme } from '../ThemeContext'
import { FORMAT_PRESETS, type ExportFormat } from '../export/exportFormats'

type Props = {
  onSelect: (format: ExportFormat) => void
  onClose: () => void
  loading?: boolean
}

const FORMAT_ORDER: ExportFormat[] = ['social', 'academic', 'presentation']

const FORMAT_HINTS: Record<ExportFormat, { de: string; en: string }> = {
  social: { de: '1200 x 675 · Reddit, X, Instagram', en: '1200 x 675 · Reddit, X, Instagram' },
  academic: { de: 'Originalformat · 300 DPI', en: 'Original ratio · 300 DPI' },
  presentation: { de: '1920 x 1080 · 16:9 HD', en: '1920 x 1080 · 16:9 HD' },
}

export function ExportFormatPicker({ onSelect, onClose, loading }: Props) {
  const { c, t, lang } = useTheme()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 4,
        zIndex: 50,
        background: c.bgAlt,
        border: `1px solid ${c.border}`,
        borderRadius: radius.lg,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        minWidth: 220,
        padding: spacing.xs,
        fontFamily: fonts.mono,
      }}
    >
      {loading && (
        <div
          style={{
            padding: spacing.md,
            textAlign: 'center',
            color: c.muted,
            fontSize: '0.75rem',
          }}
        >
          {t('exportGenerating')}
        </div>
      )}
      {!loading &&
        FORMAT_ORDER.map((key) => {
          const preset = FORMAT_PRESETS[key]
          const hint = FORMAT_HINTS[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              style={{
                display: 'block',
                width: '100%',
                padding: `${spacing.sm}px ${spacing.md}px`,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: radius.md,
                transition: `background ${motion.fast} ${motion.easing}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = c.bgHover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: c.ink }}>
                {t(preset.labelKey)}
              </div>
              <div style={{ fontSize: '0.65rem', color: c.muted, marginTop: 2 }}>
                {hint[lang]}
              </div>
            </button>
          )
        })}
    </div>
  )
}
