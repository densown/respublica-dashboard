import { Link } from 'react-router-dom'
import { fontSize, fonts, motion } from '../tokens'
import { useTheme } from '../ThemeContext'
import { Piktogramm, type PiktogrammName } from './Piktogramm'

export type TabZiel = {
  id: string
  label: string
  path: string
  icon: PiktogrammName
}

export type TabLeisteProps = {
  ziele: TabZiel[]
  aktiv: string
}

/**
 * Feste Leiste unten auf dem Handy. Fuenf Ziele, immer sichtbar, mit dem
 * Daumen erreichbar. Ersetzt das Aufklappmenue hinter drei Strichen.
 */
export function TabLeiste({ ziele, aktiv }: TabLeisteProps) {
  const { c, t } = useTheme()
  return (
    <nav
      aria-label={t('navHauptnavigation')}
      style={{
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${ziele.length}, 1fr)`,
        background: c.bg,
        borderTop: `1px solid ${c.ink}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {ziele.map((z) => {
        const istAktiv = z.id === aktiv
        return (
          <Link
            key={z.id}
            to={z.path}
            aria-current={istAktiv ? 'page' : undefined}
            className="rp-tab"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              minHeight: 56,
              color: istAktiv ? c.red : c.inkSoft,
              textDecoration: 'none',
              fontFamily: fonts.body,
              fontSize: fontSize.micro,
              fontWeight: istAktiv ? 600 : 400,
              boxShadow: istAktiv ? `inset 0 2px 0 ${c.red}` : 'none',
              transition: `color ${motion.fast} ${motion.easing}`,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Piktogramm name={z.icon} size={22} />
            <span>{z.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
