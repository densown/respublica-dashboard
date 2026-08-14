import { NavLink } from 'react-router-dom'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { fonts, spacing } from '../../design-system/tokens'
import { useIsMobile } from '../../hooks/useMediaQuery'

type SubNavEntry = { to: string; labelKey: I18nKey; end: boolean }

const ENTRIES: SubNavEntry[] = [
  { to: '/wahlen', labelKey: 'electionPollsNavResults', end: true },
  { to: '/wahlen/umfragen', labelKey: 'electionPollsNavPolls', end: false },
]

/**
 * Unterleiste des Wahlen-Moduls: schaltet zwischen den historischen
 * Ergebnissen (/wahlen) und den Umfragen (/wahlen/umfragen).
 *
 * Bewusst als Router-Links und nicht als Tab-State — die Unterseiten sollen
 * eigene, teilbare URLs haben. Weitere Unterseiten (Programmvergleich,
 * Rechenschaft) werden hier spaeter ergaenzt.
 */
export function ElectionsSubNav() {
  const { c, t } = useTheme()
  const narrow = useIsMobile()

  return (
    <nav
      aria-label={t('electionsTitle')}
      style={{
        marginBottom: spacing.lg,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: `1px solid ${c.border}`,
          minWidth: 'min-content',
        }}
      >
        {ENTRIES.map(({ to, labelKey, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              fontFamily: fonts.mono,
              fontSize: narrow ? '0.75rem' : '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              // >= 44px Touch-Target auch auf Mobile
              padding: narrow ? '13px 14px' : '13px 24px',
              flexShrink: 0,
              textDecoration: 'none',
              borderBottom: isActive
                ? `3px solid ${c.red}`
                : '3px solid transparent',
              fontWeight: isActive ? 700 : 400,
              color: isActive ? c.ink : c.muted,
            })}
          >
            {t(labelKey)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
