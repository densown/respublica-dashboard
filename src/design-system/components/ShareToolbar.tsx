import { useCallback, useState, type CSSProperties } from 'react'
import { fontSize, fonts, motion, radius, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import { SHARE_BRAND } from '../palettes'

export type ShareToolbarProps = {
  title: string
  url: string
}

const REDDIT = SHARE_BRAND.reddit
const LINKEDIN = SHARE_BRAND.linkedin
const WHATSAPP = SHARE_BRAND.whatsapp
const TELEGRAM = SHARE_BRAND.telegram

export function ShareToolbar({ title, url }: ShareToolbarProps) {
  const { c, t } = useTheme()
  const [copied, setCopied] = useState(false)

  const encTitle = encodeURIComponent(title)
  const encUrl = encodeURIComponent(url)

  const shareReddit = `https://www.reddit.com/r/Res_Publica_DE/submit?title=${encTitle}&url=${encUrl}`
  const shareX = `https://x.com/intent/tweet?text=${encTitle}&url=${encUrl}`
  const shareLI = `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`
  const shareWA = `https://wa.me/?text=${encTitle}%20${encUrl}`
  const shareTG = `https://t.me/share/url?url=${encUrl}&text=${encTitle}`
  const shareMail = `mailto:?subject=${encTitle}&body=${encUrl}`

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [url])

  const nativeShare = useCallback(async () => {
    if (!navigator.share) return
    try {
      await navigator.share({ title, text: title, url })
    } catch {
      /* ignore */
    }
  }, [title, url])

  const btnBase: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing.sm}px ${spacing.md}px`,
    border: `1px solid ${c.border}`,
    borderRadius: radius.sm,
    background: c.bgAlt,
    color: c.inkSoft,
    fontFamily: fonts.mono,
    fontSize: fontSize.micro,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: `border-color 0.2s ${motion.easing}, color 0.2s ${motion.easing}`,
    whiteSpace: 'nowrap',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.sm,
        paddingTop: spacing.md,
      }}
    >
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: fontSize.micro,
          color: c.muted,
          letterSpacing: '0.08em',
          width: '100%',
          marginBottom: spacing.xs,
        }}
      >
        {t('share')}
      </span>
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
        <button
          type="button"
          onClick={nativeShare}
          style={btnBase}
        >
          {t('share')}
        </button>
      )}
      <a
        href={shareReddit}
        target="_blank"
        rel="noopener noreferrer"
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = REDDIT
          e.currentTarget.style.color = REDDIT
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = c.border
          e.currentTarget.style.color = c.inkSoft
        }}
      >
        {t('shareReddit')}
      </a>
      <a
        href={shareX}
        target="_blank"
        rel="noopener noreferrer"
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = c.ink
          e.currentTarget.style.color = c.ink
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = c.border
          e.currentTarget.style.color = c.inkSoft
        }}
      >
        {t('shareX')}
      </a>
      <a
        href={shareLI}
        target="_blank"
        rel="noopener noreferrer"
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = LINKEDIN
          e.currentTarget.style.color = LINKEDIN
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = c.border
          e.currentTarget.style.color = c.inkSoft
        }}
      >
        {t('shareLI')}
      </a>
      <a
        href={shareWA}
        target="_blank"
        rel="noopener noreferrer"
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = WHATSAPP
          e.currentTarget.style.color = WHATSAPP
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = c.border
          e.currentTarget.style.color = c.inkSoft
        }}
      >
        {t('shareWA')}
      </a>
      <a
        href={shareTG}
        target="_blank"
        rel="noopener noreferrer"
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = TELEGRAM
          e.currentTarget.style.color = TELEGRAM
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = c.border
          e.currentTarget.style.color = c.inkSoft
        }}
      >
        {t('shareTG')}
      </a>
      <a
        href={shareMail}
        rel="noopener noreferrer"
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = c.red
          e.currentTarget.style.color = c.red
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = c.border
          e.currentTarget.style.color = c.inkSoft
        }}
      >
        {t('shareEmail')}
      </a>
      <button
        type="button"
        onClick={copyLink}
        style={btnBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = c.red
          e.currentTarget.style.color = c.red
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = c.border
          e.currentTarget.style.color = c.inkSoft
        }}
      >
        {copied ? t('linkCopied') : t('copyLink')}
      </button>
    </div>
  )
}
