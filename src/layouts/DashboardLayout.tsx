import { useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { fonts, spacing, motion } from '../design-system/tokens'
import { LegalFooter, useTheme } from '../design-system'
import { Kopfzeile, type NavZiel } from '../design-system/components/Kopfzeile'
import { TabLeiste, type TabZiel } from '../design-system/components/TabLeiste'
import type { I18nKey } from '../design-system/i18n'
import { useIsMobile } from '../hooks/useMediaQuery'

const WORLD_MAP_PATH = '/weltkarte'

/**
 * Erstes Pfadsegment -> Ressort. Auf dem Handy gibt es fuenf Ressorts
 * (Start, Bundestag, Wahlen, Gesetze, Mehr), auf dem Desktop steht das
 * Lobbyregister zusaetzlich als eigenes Wort in der Kopfzeile.
 */
const RESSORT: Record<string, string> = {
  bundestag: 'bundestag',
  'kleine-anfragen': 'bundestag',
  wahlen: 'wahlen',
  gesetze: 'gesetze',
  gesetzgebung: 'gesetze',
  'eu-recht': 'gesetze',
  lobbyregister: 'lobby',
  mehr: 'mehr',
  demokratie: 'mehr',
  versammlungen: 'mehr',
  weltkarte: 'mehr',
  quellen: 'mehr',
}

function ressortAusPfad(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'start'
  const erstes = pathname.split('/').filter(Boolean)[0]
  return RESSORT[erstes] ?? 'start'
}

/**
 * Welcher Unterpunkt ist aktiv? Das haengt am Zusammenspiel von Pfad und
 * Query und ist deshalb hier verortet, nicht in der Kopfzeile.
 */
function unterpunktAusOrt(pathname: string, search: string): string | undefined {
  const params = new URLSearchParams(search)
  if (pathname.startsWith('/kleine-anfragen')) return 'bundestag.questions'
  if (pathname.startsWith('/bundestag')) {
    return params.get('ansicht') === 'abgeordnete' || pathname.startsWith('/bundestag/abgeordnete')
      ? 'bundestag.members'
      : 'bundestag.votes'
  }
  if (pathname.startsWith('/wahlen')) {
    return pathname.startsWith('/wahlen/umfragen') ? 'wahlen.polls' : 'wahlen.results'
  }
  if (pathname.startsWith('/eu-recht')) return 'gesetze.eu'
  if (pathname.startsWith('/gesetze') || pathname.startsWith('/gesetzgebung')) {
    return params.get('tab') === 'urteile' ? 'gesetze.rulings' : 'gesetze.laws'
  }
  return undefined
}

export default function DashboardLayout() {
  const { c, t } = useTheme()
  const location = useLocation()
  const isMobile = useIsMobile()

  const aktiv = ressortAusPfad(location.pathname)
  const aktivesKind = unterpunktAusOrt(location.pathname, location.search)
  const isWorldMapPage = location.pathname === WORLD_MAP_PATH

  const ziele = useMemo<NavZiel[]>(() => {
    const k = (id: string, labelKey: I18nKey, path: string) => ({ id, label: t(labelKey), path })
    return [
      { id: 'start', label: t('navStart'), path: '/' },
      {
        id: 'bundestag',
        label: t('bundestag'),
        path: '/bundestag',
        kinder: [
          k('bundestag.votes', 'navBtAbstimmungen', '/bundestag'),
          k('bundestag.members', 'navBtAbgeordnete', '/bundestag?ansicht=abgeordnete'),
          k('bundestag.questions', 'kaNav', '/kleine-anfragen'),
        ],
      },
      {
        id: 'wahlen',
        label: t('navElections'),
        path: '/wahlen/umfragen',
        kinder: [
          k('wahlen.polls', 'electionPollsNavPolls', '/wahlen/umfragen'),
          k('wahlen.results', 'electionPollsNavResults', '/wahlen'),
        ],
      },
      {
        id: 'gesetze',
        label: t('navGesetze'),
        path: '/gesetze',
        kinder: [
          k('gesetze.laws', 'navLaws', '/gesetze'),
          k('gesetze.rulings', 'navRulings', '/gesetze?tab=urteile'),
          k('gesetze.eu', 'navEuFilter', '/eu-recht'),
        ],
      },
      { id: 'lobby', label: t('lobby'), path: '/lobbyregister' },
      { id: 'mehr', label: t('navMehr'), path: '/mehr' },
    ]
  }, [t])

  const tabs = useMemo<TabZiel[]>(
    () => [
      { id: 'start', label: t('navStart'), path: '/', icon: 'start' },
      { id: 'bundestag', label: t('bundestag'), path: '/bundestag', icon: 'bundestag' },
      { id: 'wahlen', label: t('navElections'), path: '/wahlen/umfragen', icon: 'wahlen' },
      { id: 'gesetze', label: t('navGesetze'), path: '/gesetze', icon: 'gesetze' },
      { id: 'mehr', label: t('navMehr'), path: '/mehr', icon: 'mehr' },
    ],
    [t],
  )

  const mainPad = isMobile ? spacing.lg : spacing.xl
  // Auf dem Handy gehoert das Lobbyregister zu "Mehr"
  const aktiverTab = aktiv === 'lobby' ? 'mehr' : aktiv

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        minHeight: '100vh',
        fontFamily: fonts.body,
        background: c.bg,
        color: c.ink,
        overflow: 'hidden',
        transition:
          `background ${motion.slow} ${motion.easing}, color ${motion.slow} ${motion.easing}`,
      }}
    >
      <Kopfzeile ziele={ziele} aktiv={aktiv} aktivesKind={aktivesKind} schmal={isMobile} />

      {/* Eigener Scrollbereich: Kopfzeile und Leiste bleiben stehen. */}
      <div
        id="rp-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: isWorldMapPage ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <main
          style={{
            maxWidth: isWorldMapPage ? 'none' : 1280,
            margin: '0 auto',
            width: '100%',
            padding: isWorldMapPage ? 0 : mainPad,
            paddingBottom: 0,
            // Kurze Seiten: der Fuss steht am Fensterende, nicht mitten im Bild
            flex: '1 0 auto',
            minHeight: isWorldMapPage ? 0 : undefined,
            display: isWorldMapPage ? 'flex' : 'block',
            flexDirection: isWorldMapPage ? 'column' : undefined,
          }}
        >
          <Outlet />
        </main>
        {!isWorldMapPage && <LegalFooter />}
      </div>

      {isMobile && <TabLeiste ziele={tabs} aktiv={aktiverTab} />}
    </div>
  )
}
