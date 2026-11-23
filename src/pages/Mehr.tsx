import { Link } from 'react-router-dom'
import { Chip, PageHeader, Section, useTheme } from '../design-system'
import { Piktogramm, type PiktogrammName } from '../design-system/components/Piktogramm'
import { fonts, fontSize, lineHeight, spacing } from '../design-system/tokens'
import type { I18nKey } from '../design-system/i18n'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSeo } from '../hooks/useSeo'

type Eintrag = {
  pfad: string
  icon: PiktogrammName
  titel: I18nKey
  text: I18nKey
  extern?: boolean
}

const DATEN: Eintrag[] = [
  { pfad: '/lobbyregister', icon: 'lobby', titel: 'lobby', text: 'mehrLobbyText' },
  { pfad: '/kleine-anfragen', icon: 'anfragen', titel: 'kaNav', text: 'mehrAnfragenText' },
  { pfad: '/demokratie', icon: 'demokratie', titel: 'mehrDemokratieTitel', text: 'mehrDemokratieText' },
  { pfad: '/versammlungen', icon: 'versammlungen', titel: 'mehrVersammlungenTitel', text: 'mehrVersammlungenText' },
  { pfad: '/weltkarte', icon: 'welt', titel: 'worldMap', text: 'mehrWeltText' },
  { pfad: '/quellen', icon: 'quellen', titel: 'navSources', text: 'mehrQuellenText' },
]

const AUSSERHALB: Eintrag[] = [
  { pfad: 'https://respublica.media', icon: 'magazin', titel: 'navMagazin', text: 'mehrMagazinText', extern: true },
  { pfad: 'https://www.reddit.com/r/Res_Publica_DE/', icon: 'anfragen', titel: 'joinReddit', text: 'mehrRedditText', extern: true },
]

/**
 * "Mehr": alles, was nicht in der Kopfzeile steht, dazu die
 * Einstellungen. Eine eigene Seite statt eines Aufklappmenues, damit sie
 * eine Adresse hat und Zurueck funktioniert.
 */
export default function Mehr() {
  const { c, t, lang, setLang, theme, setTheme } = useTheme()
  const schmal = useIsMobile()
  useSeo({ titel: t('mehrTitel') })

  const zeile = (e: Eintrag) => {
    const inhalt = (
      <>
        <span style={{ color: c.red, marginTop: 2 }}>
          <Piktogramm name={e.icon} size={26} />
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: 'block',
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: fontSize.lg,
              lineHeight: lineHeight.tight,
              color: c.ink,
            }}
          >
            {t(e.titel)}
          </span>
          <span
            style={{
              display: 'block',
              marginTop: spacing.xs,
              fontFamily: fonts.body,
              fontSize: fontSize.md,
              lineHeight: lineHeight.normal,
              color: c.muted,
            }}
          >
            {t(e.text)}
          </span>
        </span>
        <span className="rp-pfeil" style={{ color: c.subtle, alignSelf: 'center' }}>
          <Piktogramm name="pfeil" size={18} />
        </span>
      </>
    )
    const stil = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing.lg,
      padding: `${spacing.lg}px 0`,
      borderBottom: `1px solid ${c.border}`,
      textDecoration: 'none',
      minHeight: 44,
    } as const
    return e.extern ? (
      <a key={e.pfad} href={e.pfad} target="_blank" rel="noopener noreferrer" className="rp-zeile" style={stil}>
        {inhalt}
      </a>
    ) : (
      <Link key={e.pfad} to={e.pfad} className="rp-zeile" style={stil}>
        {inhalt}
      </Link>
    )
  }

  const raster = {
    display: 'grid',
    gridTemplateColumns: schmal ? '1fr' : '1fr 1fr',
    columnGap: spacing.xxl,
  } as const

  const einstellung = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: `${spacing.md}px 0`,
    borderBottom: `1px solid ${c.border}`,
  } as const
  const einstellungName = {
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    color: c.ink,
  } as const

  return (
    <div>
      <PageHeader kicker={t('mehrKicker')} title={t('mehrTitel')} subtitle={t('mehrIntro')} />

      <Section title={t('mehrDaten')}>
        <div style={raster}>{DATEN.map(zeile)}</div>
      </Section>

      <Section title={t('mehrEinstellungen')}>
        <div style={{ maxWidth: 560 }}>
          <div style={einstellung}>
            <span style={einstellungName}>{t('mehrSprache')}</span>
            <span style={{ display: 'flex', gap: spacing.sm }}>
              <Chip label="Deutsch" active={lang === 'de'} onClick={() => setLang('de')} />
              <Chip label="English" active={lang === 'en'} onClick={() => setLang('en')} />
            </span>
          </div>
          <div style={einstellung}>
            <span style={einstellungName}>{t('mehrAnsicht')}</span>
            <span style={{ display: 'flex', gap: spacing.sm }}>
              <Chip label={t('mehrAnsichtHell')} active={theme === 'light'} onClick={() => setTheme('light')} />
              <Chip label={t('mehrAnsichtDunkel')} active={theme === 'dark'} onClick={() => setTheme('dark')} />
            </span>
          </div>
        </div>
      </Section>

      <Section title={t('mehrAusserhalb')} last>
        <div style={raster}>{AUSSERHALB.map(zeile)}</div>
      </Section>
    </div>
  )
}
