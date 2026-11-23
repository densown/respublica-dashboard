import { Link } from 'react-router-dom'
import { fontSize, fonts, motion, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import { Piktogramm } from './Piktogramm'
import { TabLeiste, type TabZiel } from './TabLeiste'

export type NavZiel = {
  id: string
  label: string
  path: string
  kinder?: { id: string; label: string; path: string }[]
}

export type KopfzeileProps = {
  ziele: NavZiel[]
  aktiv: string
  aktivesKind?: string
  /** Schmale Fassung fuer das Handy: Logo, Datum und darunter die Ressorts. */
  schmal?: boolean
  /** Ressorts der schmalen Fassung (fuenf Woerter in einer Zeile) */
  ressorts?: TabZiel[]
  /** Aktives Ressort der schmalen Fassung */
  aktivesRessort?: string
}

function heute(lang: string): string {
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

/**
 * Kopfzeile wie bei einer Zeitung: Logo, die Ressorts als Woerter, Datum.
 * Ersetzt die schwarze Seitenleiste, die die App wie eine
 * Verwaltungsoberflaeche aussehen liess.
 */
export function Kopfzeile({
  ziele,
  aktiv,
  aktivesKind,
  schmal,
  ressorts = [],
  aktivesRessort,
}: KopfzeileProps) {
  const { c, t, lang, setLang, theme, setTheme } = useTheme()
  const aktivesZiel = ziele.find((z) => z.id === aktiv)
  const kinder = aktivesZiel?.kinder ?? []

  const logo = (
    <Link
      to="/"
      style={{
        fontFamily: fonts.display,
        fontWeight: 900,
        fontSize: schmal ? fontSize.xl : fontSize.xxl,
        lineHeight: 1,
        color: c.ink,
        textDecoration: 'none',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      Res<span style={{ color: c.red }}>.</span>Publica
    </Link>
  )

  // Unterpunkte des aktiven Ressorts. Auch in der schmalen Fassung: ohne sie
  // waren Wahlergebnisse, Abgeordnete und Urteile auf dem Handy nicht erreichbar.
  const unternav = kinder.length > 0 && (
    <nav
      aria-label={t('navUnternavigation')}
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: spacing.lg,
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      {kinder.map((k) => {
        const istAktiv = k.id === aktivesKind
        return (
          <Link
            key={k.id}
            to={k.path}
            aria-current={istAktiv ? 'page' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: schmal ? 44 : 40,
              fontFamily: fonts.body,
              fontStyle: 'italic',
              fontSize: fontSize.md,
              color: istAktiv ? c.red : c.muted,
              textDecoration: 'none',
            }}
          >
            {k.label}
          </Link>
        )
      })}
    </nav>
  )

  if (schmal) {
    return (
      <header style={{ flexShrink: 0, background: c.bg }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: spacing.md,
            padding: `${spacing.md}px ${spacing.lg}px ${spacing.sm}px`,
            borderBottom: `3px double ${c.ink}`,
          }}
        >
          {logo}
          <span
            style={{
              fontFamily: fonts.body,
              fontStyle: 'italic',
              fontSize: fontSize.xs,
              color: c.muted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {heute(lang)}
          </span>
        </div>
        {/*
          Die Leiste steht oben unter dem Kopf, nicht am unteren Rand: dort
          liegt auf dem iPhone die Adressleiste von Safari und ueberdeckte sie.
        */}
        {ressorts.length > 0 && <TabLeiste ziele={ressorts} aktiv={aktivesRessort ?? ''} />}
        {unternav}
      </header>
    )
  }

  const knopf = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    padding: `0 ${spacing.sm}px`,
    border: 'none',
    background: 'transparent',
    color: c.inkSoft,
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    cursor: 'pointer',
  } as const

  return (
    <header style={{ flexShrink: 0, background: c.bg }}>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: `${spacing.lg}px ${spacing.xl}px 0`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: spacing.xl,
            paddingBottom: spacing.md,
            borderBottom: `3px double ${c.ink}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.lg, minWidth: 0 }}>
            {logo}
            <span
              style={{
                fontFamily: fonts.body,
                fontStyle: 'italic',
                fontSize: fontSize.sm,
                color: c.muted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {heute(lang)}
            </span>
          </div>

          <nav aria-label={t('navHauptnavigation')} style={{ display: 'flex', gap: spacing.xs }}>
            {ziele.map((z) => {
              const istAktiv = z.id === aktiv
              return (
                <Link
                  key={z.id}
                  to={z.path}
                  aria-current={istAktiv ? 'page' : undefined}
                  className="rp-navwort"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: 44,
                    padding: `0 ${spacing.md}px`,
                    fontFamily: fonts.body,
                    fontSize: fontSize.base,
                    fontWeight: istAktiv ? 600 : 400,
                    color: istAktiv ? c.ink : c.inkSoft,
                    textDecoration: 'none',
                    boxShadow: istAktiv ? `inset 0 -2px 0 ${c.red}` : 'none',
                    transition: `color ${motion.fast} ${motion.easing}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {z.label}
                </Link>
              )
            })}
          </nav>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <a
              href="https://respublica.media"
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...knopf, textDecoration: 'none', fontFamily: fonts.body, fontSize: fontSize.sm, fontStyle: 'italic' }}
            >
              {t('navMagazin')}
            </a>
            <button
              type="button"
              onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              aria-label={t('navSpracheWechseln')}
              style={knopf}
            >
              {lang === 'de' ? 'EN' : 'DE'}
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label={theme === 'light' ? t('navNachtausgabe') : t('navTagausgabe')}
              title={theme === 'light' ? t('navNachtausgabe') : t('navTagausgabe')}
              style={knopf}
            >
              <Piktogramm name={theme === 'light' ? 'mond' : 'sonne'} size={18} />
            </button>
          </div>
        </div>

        {unternav}
      </div>
    </header>
  )
}
