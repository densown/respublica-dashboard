import { useCallback } from 'react'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import { ShareCompact } from './ShareCompact'

/** Ein Nav-Link (wie bisher mit id / icon / label). */
export type SidebarNavLink = {
  kind: 'link'
  id: string
  icon: string
  label: string
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
  onSelect: (id: string) => void
  collapsed: boolean
  onToggle: () => void
  shareTitle: string
  shareUrl: string
}

const transition = 'cubic-bezier(0.4, 0, 0.2, 1)'

export function Sidebar({
  entries,
  active,
  onSelect,
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

  const sectionColor = theme === 'light' ? '#888' : '#666'

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
        fontSize: '0.73rem',
        transition: `width 0.3s ${transition}, min-width 0.3s ${transition}`,
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
          transition: `color 0.2s ${transition}`,
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
              R<span style={{ color: '#C8102E' }}>.</span>
            </>
          ) : (
            <>
              Res<span style={{ color: '#C8102E' }}>.</span>Publica
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
          transition: `color 0.2s ${transition}`,
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
                  fontSize: '0.65rem',
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
          return (
            <button
              key={entry.id}
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
                transition: `color 0.2s ${transition}, border-color 0.2s ${transition}, background 0.2s ${transition}`,
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
            borderRadius: 4,
            background: 'transparent',
            color: c.sidebarText,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: '0.73rem',
            transition: `border-color 0.2s ${transition}, color 0.2s ${transition}`,
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
            borderRadius: 4,
            background: 'transparent',
            color: c.sidebarText,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: '0.73rem',
          }}
        >
          {lang === 'de' ? 'EN' : 'DE'}
        </button>
      </div>

      <div
        style={{
          padding: spacing.md,
          color: 'rgba(255,255,255,0.35)',
          fontSize: '0.65rem',
        }}
      >
        Dashboard v0.1
      </div>
    </aside>
  )
}
