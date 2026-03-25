import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export function LegalFooter() {
  const { c, t } = useTheme()

  const linkStyle = {
    fontFamily: fonts.mono,
    fontSize: '0.67rem',
    color: c.footerLink,
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  } as const

  const textStyle = {
    fontFamily: fonts.body,
    fontSize: '0.68rem',
    color: c.footerText,
    lineHeight: 1.5,
    maxWidth: 720,
  } as const

  return (
    <footer
      style={{
        marginTop: spacing.xxxl,
        width: '100%',
        background: c.footerBg,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          width: '100%',
          padding: `${spacing.xxl}px ${spacing.xl}px`,
        }}
      >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: `${spacing.md}px ${spacing.xl}px`,
          marginBottom: spacing.lg,
        }}
      >
        <a
          href="https://respublica.media/impressum/"
          target="_blank"
          rel="noopener"
          style={linkStyle}
        >
          {t('impressum')}
        </a>
        <a
          href="https://respublica.media/datenschutz/"
          target="_blank"
          rel="noopener"
          style={linkStyle}
        >
          {t('datenschutz')}
        </a>
        <a
          href="https://respublica.media"
          target="_blank"
          rel="noopener"
          style={linkStyle}
        >
          {t('backToArticles')}
        </a>
        <a
          href="https://www.reddit.com/r/Res_Publica_DE/"
          target="_blank"
          rel="noopener"
          style={linkStyle}
        >
          {t('joinReddit')}
        </a>
      </div>
      <p style={{ ...textStyle, marginBottom: spacing.sm }}>{t('sources')}</p>
      <p style={{ ...textStyle, marginBottom: spacing.sm }}>{t('aiHint')}</p>
      <p style={{ ...textStyle, marginBottom: spacing.sm }}>{t('noCookies')}</p>
      <p style={textStyle}>{t('copyright')}</p>
      </div>
    </footer>
  )
}
