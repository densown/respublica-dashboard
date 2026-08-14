import { useCallback } from 'react'
import { fontSize, fonts, motion, radius, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import { ShareCompact } from './ShareCompact'

/**
 * Unterreiter eines Moduls. Wird nur eingeblendet, wenn das Modul aktiv ist —
 * dauerhaft ausgeklappt waere die Leiste bei drei Modulen mit Unterreitern
 * um sieben Eintraege laenger, ohne dass die meisten davon je gebraucht werden.
 */
export type SidebarNavChild = {
  id: string
  label: string
  /** Zielpfad inklusive Query, etwa "/gesetze?tab=urteile". */
  path: string
}

/** Ein Nav-Link (wie bisher mit id / icon / label). */
export type SidebarNavLink = {
  kind: 'link'
  id: string
  icon: string
  label: string
  children?: SidebarNavChild[]
}

/** Sektions-Überschrift, nicht klickbar. */
export type SidebarNavSection = {
  kind: 'section'
  label: string
}

export type SidebarNavEntry = SidebarNavSection | SidebarNavLink

/** @deprecated Verwende SidebarNavLink */
export type SidebarModule = SidebarNavLink

export type SidebarProps = {
  entries: SidebarNavEntry[]
  active: string
  /**
   * Id des aktiven Unterreiters. Bewusst vom Layout bestimmt, nicht hier:
   * ob "/gesetze" ohne Query den Reiter "Gesetze" meint, ist Routing-Wissen
   * und gehoert nicht in eine Darstellungskomponente.
   */
  activeChild?: string
  onSelect: (id: string) => void
  onSelectChild?: (path: string) => void
  collapsed: boolean
  onToggle: () => void
  shareTitle: string
  shareUrl: string
}

export function Sidebar({
  entries,
  active,
  activeChild,
  onSelect,
  onSelectChild,
  collapsed,
  onToggle,
  shareTitle,
  shareUrl,
}: SidebarProps) {
  const { c, theme, setTheme, lang, setLang, t } = useTheme()

  const width = collapsed ? 56 : 228

  const handleModule = useCallback(
    (id: string) => {
      onSelect(id)
    },
    [onSelect],
  )

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  const toggleLang = useCallback(() => {
    setLang(lang === 'de' ? 'en' : 'de')
  }, [lang, setLang])

  const sectionColor = c.sidebarText

  return (
    <aside
      style={{
        width,
        minWidth: width,
        minHeight: '100vh',
        height: '100%',
        alignSelf: 'stretch',
        background: c.sidebarBg,
        color: c.sidebarText,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: fonts.mono,
        fontSize: fontSize.xs,
        transition: `width 0.3s ${motion.easing}, min-width 0.3s ${motion.easing}`,
        boxShadow: c.shadow,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: `${spacing.lg}px ${spacing.md}px`,
          border: 'none',
          background: 'transparent',
          color: c.sidebarText,
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          transition: `color 0.2s ${motion.easing}`,
        }}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: collapsed ? '1rem' : '1.05rem',
            fontWeight: 900,
            color: theme === 'light' ? c.badgeText : c.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? (
            <>
              R<span style={{ color: c.red }}>.</span>
            </>
          ) : (
            <>
              Res<span style={{ color: c.red }}>.</span>Publica
            </>
          )}
        </span>
      </button>

      <a
        href="https://respublica.media"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          padding: `0 ${spacing.md}px ${spacing.md}px`,
          color: c.footerLink,
          textDecoration: 'none',
          whiteSpace: collapsed ? 'nowrap' : 'normal',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: `color 0.2s ${motion.easing}`,
        }}
      >
        {collapsed ? '←' : `← ${t('backToArticles')}`}
      </a>

      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xs,
          padding: `${spacing.sm}px ${spacing.sm}px`,
          overflowY: 'auto',
        }}
      >
        {entries.map((entry, idx) => {
          if (entry.kind === 'section') {
            if (collapsed) {
              return (
                <div
                  key={`sec-${idx}`}
                  style={{ height: spacing.sm, flexShrink: 0 }}
                  aria-hidden
                />
              )
            }
            return (
              <div
                key={`sec-${idx}`}
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.micro,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: sectionColor,
                  paddingTop: 16,
                  paddingLeft: spacing.sm,
                  paddingRight: spacing.sm,
                  userSelect: 'none',
                }}
              >
                {entry.label}
              </div>
            )
          }
          const isActive = entry.id === active
          const kinder = isActive && !collapsed ? (entry.children ?? []) : []
          return (
            <div key={entry.id}>
            <button
              type="button"
              onClick={() => handleModule(entry.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: `${spacing.md}px ${spacing.sm}px`,
                border: 'none',
                borderLeft: `3px solid ${isActive ? c.sidebarActive : 'transparent'}`,
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: isActive ? c.sidebarActive : c.sidebarText,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: `color 0.2s ${motion.easing}, border-color 0.2s ${motion.easing}, background 0.2s ${motion.easing}`,
              }}
            >
              <span style={{ flexShrink: 0, width: '1.2em', textAlign: 'center' }}>
                {entry.icon}
              </span>
              {!collapsed && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.label}
                </span>
              )}
            </button>

            {kinder.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {kinder.map((kind) => {
                  const kindAktiv = kind.id === activeChild
                  return (
                    <button
                      key={kind.id}
                      type="button"
                      onClick={() => onSelectChild?.(kind.path)}
                      aria-current={kindAktiv ? 'page' : undefined}
                      style={{
                        display: 'block',
                        // Einzug auf Hoehe des Modul-Labels, damit die
                        // Unterreiter unter dem Text stehen, nicht unter dem Zeichen
                        padding: `${spacing.sm}px ${spacing.sm}px ${spacing.sm}px 30px`,
                        border: 'none',
                        borderLeft: `3px solid ${kindAktiv ? c.sidebarActive : 'transparent'}`,
                        background: 'transparent',
                        color: kindAktiv ? c.sidebarActive : c.sidebarText,
                        fontFamily: fonts.mono,
                        fontSize: fontSize.micro,
                        fontWeight: kindAktiv ? 700 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        opacity: kindAktiv ? 1 : 0.75,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: `color 0.2s ${motion.easing}, opacity 0.2s ${motion.easing}`,
                      }}
                    >
                      {kind.label}
                    </button>
                  )
                })}
              </div>
            )}
            </div>
          )
        })}
      </nav>

      <div
        style={{
          padding: spacing.md,
          borderTop: `1px solid rgba(255,255,255,0.08)`,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
        }}
      >
        <ShareCompact
          title={shareTitle}
          url={shareUrl}
          compact={collapsed}
        />
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            padding: `${spacing.sm}px ${spacing.md}px`,
            border: `1px solid rgba(255,255,255,0.15)`,
            borderRadius: radius.sm,
            background: 'transparent',
            color: c.sidebarText,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: fontSize.xs,
            transition: `border-color 0.2s ${motion.easing}, color 0.2s ${motion.easing}`,
          }}
        >
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
        <button
          type="button"
          onClick={toggleLang}
          style={{
            padding: `${spacing.sm}px ${spacing.md}px`,
            border: `1px solid rgba(255,255,255,0.15)`,
            borderRadius: radius.sm,
            background: 'transparent',
            color: c.sidebarText,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: fontSize.xs,
          }}
        >
          {lang === 'de' ? 'EN' : 'DE'}
        </button>
      </div>

      <div
        style={{
          padding: spacing.md,
          color: 'rgba(255,255,255,0.35)',
          fontSize: fontSize.micro,
        }}
      >
        Dashboard v0.1
      </div>
    </aside>
  )
}
