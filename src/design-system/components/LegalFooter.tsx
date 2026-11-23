import { useLocation } from 'react-router-dom'
import { fontSize, fonts, lineHeight, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import { footerSourcesLineKey } from '../../data/sourcesCatalog'

/**
 * Fuss der Seite. Hell und klein: der fruehere schwarze Block stand auf
 * kurzen Seiten mitten im Bild und war schwerer als der Inhalt darueber.
 */
export function LegalFooter() {
  const { pathname } = useLocation()
  const { c, t } = useTheme()
  const sourcesLineKey = footerSourcesLineKey(pathname)

  const linkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 44,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: c.inkSoft,
    textDecoration: 'none',
  } as const

  const textStyle = {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: c.muted,
    lineHeight: lineHeight.normal,
    maxWidth: '68ch',
    margin: 0,
  } as const

  return (
    <footer style={{ width: '100%', marginTop: spacing.xxxl }}>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
          padding: `0 ${spacing.lg}px ${spacing.xl}px`,
        }}
      >
        <div style={{ borderTop: `1px solid ${c.ink}`, paddingTop: spacing.sm }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: `0 ${spacing.xl}px` }}>
            <a href="https://respublica.media/impressum/" target="_blank" rel="noopener" style={linkStyle}>
              {t('impressum')}
            </a>
            <a href="https://respublica.media/datenschutz/" target="_blank" rel="noopener" style={linkStyle}>
              {t('datenschutz')}
            </a>
            <a href="https://respublica.media" target="_blank" rel="noopener" style={linkStyle}>
              {t('navMagazin')}
            </a>
            <a href="https://www.reddit.com/r/Res_Publica_DE/" target="_blank" rel="noopener" style={linkStyle}>
              {t('joinReddit')}
            </a>
          </div>
          <p style={{ ...textStyle, marginTop: spacing.xs }}>{t(sourcesLineKey)}</p>
          <p style={{ ...textStyle, marginTop: spacing.xs }}>{t('fussKurz')}</p>
        </div>
      </div>
    </footer>
  )
}
