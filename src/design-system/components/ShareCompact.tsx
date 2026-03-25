import { useCallback, useState } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

const REDDIT = '#FF4500'
const WHATSAPP = '#25D366'

export type ShareCompactProps = {
  title: string
  url: string
  /** Narrow column (e.g. collapsed sidebar): icon-only stack */
  compact?: boolean
  /** Mobile drawer uses light surface tokens */
  variant?: 'sidebar' | 'mobile'
}

const transition = 'cubic-bezier(0.4, 0, 0.2, 1)'

export function ShareCompact({
  title,
  url,
  compact,
  variant = 'sidebar',
}: ShareCompactProps) {
  const { c, t } = useTheme()
  const [copied, setCopied] = useState(false)
  const mobile = variant === 'mobile'

  const encTitle = encodeURIComponent(title)
  const encUrl = encodeURIComponent(url)

  const shareReddit = `https://www.reddit.com/r/Res_Publica_DE/submit?title=${encTitle}&url=${encUrl}`
  const shareX = `https://x.com/intent/tweet?text=${encTitle}&url=${encUrl}`
  const shareWA = `https://wa.me/?text=${encTitle}%20${encUrl}`

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [url])

  const defaultBorder = mobile ? c.border : 'rgba(255,255,255,0.12)'
  const defaultBg = mobile ? c.bgAlt : 'rgba(255,255,255,0.04)'
  const defaultColor = mobile ? c.inkSoft : c.footerLink
  const labelMuted = mobile ? c.muted : 'rgba(255,255,255,0.35)'

  const baseLink = (
    href: string,
    label: string,
    hoverBorder: string,
    hoverColor: string,
  ) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: compact ? 32 : 36,
        padding: compact ? `${spacing.xs}px` : `${spacing.xs}px ${spacing.sm}px`,
        border: `1px solid ${defaultBorder}`,
        borderRadius: 4,
        background: defaultBg,
        color: defaultColor,
        fontFamily: fonts.mono,
        fontSize: compact ? '0.62rem' : '0.65rem',
        textDecoration: 'none',
        transition: `border-color 0.2s ${transition}, color 0.2s ${transition}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hoverBorder
        e.currentTarget.style.color = hoverColor
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = defaultBorder
        e.currentTarget.style.color = defaultColor
      }}
    >
      {label}
    </a>
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: compact ? 'column' : 'row',
        flexWrap: compact ? 'nowrap' : 'wrap',
        alignItems: compact ? 'stretch' : 'center',
        gap: spacing.xs,
      }}
    >
      {!compact && (
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: '0.58rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: labelMuted,
            width: '100%',
            marginBottom: 2,
          }}
        >
          {t('share')}
        </span>
      )}
      {baseLink(shareReddit, compact ? 'R' : t('shareReddit').slice(0, 2), REDDIT, REDDIT)}
      {baseLink(shareX, 'X', c.ink, c.ink)}
      {baseLink(shareWA, compact ? 'Wa' : 'WA', WHATSAPP, WHATSAPP)}
      <button
        type="button"
        onClick={copyLink}
        title={t('copyLink')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: compact ? 32 : 36,
          padding: compact ? `${spacing.xs}px` : `${spacing.xs}px ${spacing.sm}px`,
          border: `1px solid ${defaultBorder}`,
          borderRadius: 4,
          background: defaultBg,
          color: defaultColor,
          fontFamily: fonts.mono,
          fontSize: compact ? '0.62rem' : '0.65rem',
          cursor: 'pointer',
          transition: `border-color 0.2s ${transition}, color 0.2s ${transition}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = c.red
          e.currentTarget.style.color = c.red
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = defaultBorder
          e.currentTarget.style.color = defaultColor
        }}
      >
        {copied ? '✓' : '⧉'}
      </button>
    </div>
  )
}
