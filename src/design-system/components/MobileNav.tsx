import { useCallback, useState } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import type { SidebarNavEntry } from './Sidebar'
import { ShareCompact } from './ShareCompact'

export type MobileNavProps = {
  entries: SidebarNavEntry[]
  active: string
  onSelect: (id: string) => void
  shareTitle: string
  shareUrl: string
}

const transition = 'cubic-bezier(0.4, 0, 0.2, 1)'

export function MobileNav({
  entries,
  active,
  onSelect,
  shareTitle,
  shareUrl,
}: MobileNavProps) {
  const { c, theme, setTheme, lang, setLang, t } = useTheme()
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id)
      close()
    },
    [onSelect, close],
  )

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  const toggleLang = useCallback(() => {
    setLang(lang === 'de' ? 'en' : 'de')
  }, [lang, setLang])

  const sectionColor = theme === 'light' ? '#888' : '#666'

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${spacing.lg}px`,
          background: c.navMobileBg,
          borderBottom: `1px solid ${c.navMobileBorder}`,
          boxShadow: c.shadow,
        }}
      >
        <a
          href="https://respublica.media"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: '1rem',
            color: c.ink,
            textDecoration: 'none',
          }}
        >
          R<span style={{ color: c.red }}>.</span>Publica
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              padding: `${spacing.xs}px ${spacing.sm}px`,
              border: `1px solid ${c.border}`,
              borderRadius: 4,
              background: c.bgAlt,
              color: c.inkSoft,
              fontFamily: fonts.mono,
              fontSize: '0.7rem',
              cursor: 'pointer',
            }}
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          <button
            type="button"
            onClick={toggleLang}
            style={{
              padding: `${spacing.xs}px ${spacing.sm}px`,
              border: `1px solid ${c.border}`,
              borderRadius: 4,
              background: c.bgAlt,
              color: c.inkSoft,
              fontFamily: fonts.mono,
              fontSize: '0.7rem',
              cursor: 'pointer',
            }}
          >
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Menu"
            style={{
              padding: spacing.sm,
              border: `1px solid ${c.border}`,
              borderRadius: 4,
              background: c.bgAlt,
              color: c.ink,
              fontSize: '1.25rem',
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ☰
          </button>
        </div>
      </header>

      {open && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: c.overlay,
            animation: 'rpFadeIn 0.25s ease forwards',
          }}
          onClick={close}
          onKeyDown={(e) => e.key === 'Escape' && close()}
        />
      )}
      {open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 201,
            pointerEvents: 'none',
          }}
        >
          <nav
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            style={{
              pointerEvents: 'auto',
              background: c.navMobileBg,
              borderBottom: `1px solid ${c.navMobileBorder}`,
              boxShadow: c.shadow,
              minHeight: '100vh',
              overflowY: 'auto',
              animation: 'rpSlideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}
          >
            <style>{`
              @keyframes rpSlideDown {
                from { transform: translateY(-100%); opacity: 0.6; }
                to { transform: translateY(0); opacity: 1; }
              }
              @keyframes rpFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
            <div
              style={{
                padding: spacing.lg,
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
              }}
            >
              <a
                href="https://respublica.media"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  marginBottom: spacing.lg,
                  color: c.red,
                  fontFamily: fonts.mono,
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                }}
              >
                ← {t('backToArticles')}
              </a>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.xs,
                  flex: 1,
                }}
              >
                {entries.map((entry, idx) => {
                  if (entry.kind === 'section') {
                    return (
                      <div
                        key={`msec-${idx}`}
                        style={{
                          fontFamily: fonts.mono,
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: sectionColor,
                          paddingTop: 16,
                          paddingLeft: spacing.sm,
                          userSelect: 'none',
                        }}
                      >
                        {entry.label}
                      </div>
                    )
                  }
                  const isActive = entry.id === active
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSelect(entry.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: `${spacing.md}px ${spacing.lg}px`,
                        border: 'none',
                        borderLeft: `3px solid ${isActive ? c.red : 'transparent'}`,
                        background: isActive ? c.bgHover : 'transparent',
                        color: isActive ? c.red : c.ink,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: fonts.mono,
                        fontSize: '0.8rem',
                        transition: `background 0.2s ${transition}, border-color 0.2s ${transition}`,
                      }}
                    >
                      <span>{entry.icon}</span>
                      <span>{entry.label}</span>
                    </button>
                  )
                })}
              </div>
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: spacing.xl,
                  borderTop: `1px solid ${c.border}`,
                }}
              >
                <ShareCompact
                  variant="mobile"
                  title={shareTitle}
                  url={shareUrl}
                />
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
