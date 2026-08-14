import { useCallback, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const WORLD_MAP_PATH = '/weltkarte'
import { fonts, spacing, motion } from '../design-system/tokens'
import { LegalFooter, MobileNav, Sidebar, useTheme } from '../design-system'
import type { I18nKey } from '../design-system/i18n'
import { useIsMobile } from '../hooks/useMediaQuery'

const ROUTE_PREFIX: Record<string, string> = {
  bundestag: 'bundestag',
  gesetze: 'legislation',
  'eu-recht': 'euLaw',
  koalition: 'coalition',
  demokratie: 'democracy',
  weltkarte: 'worldmap',
  'eu-parlament': 'euParl',
  lobbyregister: 'lobby',
  wahlen: 'elections',
  quellen: 'sources',
  admin: 'admin',
}

const MODULE_PATH: Record<string, string> = {
  overview: '/',
  bundestag: '/bundestag',
  legislation: '/gesetze',
  euLaw: '/eu-recht',
  coalition: '/koalition',
  democracy: '/demokratie',
  worldmap: '/weltkarte',
  euParl: '/eu-parlament',
  lobby: '/lobbyregister',
  elections: '/wahlen',
  sources: '/quellen',
  admin: '/admin',
}

/**
 * Unterreiter je Modul. Alle Ziele sind ueber die URL adressierbar — entweder
 * als eigene Route (Wahlen) oder ueber ?tab= (Gesetzgebung, EU-Recht). Reiter,
 * die nur in React-State leben, gehoeren nicht hierher: sie waeren nicht
 * verlinkbar und der Eintrag koennte seinen Zustand nicht anzeigen.
 */
const SUB_NAV: Record<string, { id: string; labelKey: string; path: string }[]> = {
  elections: [
    { id: 'elections.results', labelKey: 'electionPollsNavResults', path: '/wahlen' },
    { id: 'elections.polls', labelKey: 'electionPollsNavPolls', path: '/wahlen/umfragen' },
    { id: 'elections.candidates', labelKey: 'electionPollsNavCandidates', path: '/wahlen/kandidaturen' },
  ],
  legislation: [
    { id: 'legislation.laws', labelKey: 'navLaws', path: '/gesetze' },
    { id: 'legislation.rulings', labelKey: 'navRulings', path: '/gesetze?tab=urteile' },
  ],
  euLaw: [
    { id: 'euLaw.acts', labelKey: 'navEuActs', path: '/eu-recht' },
    { id: 'euLaw.caselaw', labelKey: 'navEuCaseLaw', path: '/eu-recht?tab=case-law' },
  ],
}

/**
 * Welcher Unterreiter ist aktiv? Das haengt am Zusammenspiel von Pfad und
 * Query und ist deshalb hier verortet, nicht in der Sidebar.
 */
function activeChildFromLocation(pathname: string, search: string): string | undefined {
  const tab = new URLSearchParams(search).get('tab')
  if (pathname.startsWith('/wahlen')) {
    if (pathname.startsWith('/wahlen/umfragen')) return 'elections.polls'
    if (pathname.startsWith('/wahlen/kandidaturen')) return 'elections.candidates'
    return 'elections.results'
  }
  if (pathname.startsWith('/gesetze') || pathname.startsWith('/gesetzgebung')) {
    return tab === 'urteile' ? 'legislation.rulings' : 'legislation.laws'
  }
  if (pathname.startsWith('/eu-recht')) {
    return tab === 'case-law' ? 'euLaw.caselaw' : 'euLaw.acts'
  }
  return undefined
}

function activeModuleFromPath(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'overview'
  const first = pathname.split('/').filter(Boolean)[0]
  return ROUTE_PREFIX[first] ?? 'overview'
}

const showAdminInNav = import.meta.env.VITE_SHOW_ADMIN_NAV === 'true'

export default function DashboardLayout() {
  const { c, t } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)

  const activeModule = activeModuleFromPath(location.pathname)
  const activeChild = activeChildFromLocation(location.pathname, location.search)
  const isWorldMapPage = location.pathname === WORLD_MAP_PATH

  const navEntries = useMemo(() => {
    const entries = [
      { kind: 'link' as const, id: 'overview', icon: '◉', label: t('overview') },
      { kind: 'link' as const, id: 'worldmap', icon: '⊕', label: t('worldMap') },
      { kind: 'section' as const, label: t('sectionGermany') },
      { kind: 'link' as const, id: 'elections', icon: '◇', label: t('navElections') },
      { kind: 'link' as const, id: 'bundestag', icon: '⬡', label: t('bundestag') },
      { kind: 'link' as const, id: 'legislation', icon: '§', label: t('legislation') },
      { kind: 'link' as const, id: 'coalition', icon: '✓', label: t('coalition') },
      { kind: 'section' as const, label: t('sectionEurope') },
      { kind: 'link' as const, id: 'euLaw', icon: '★', label: t('euLaw') },
      { kind: 'link' as const, id: 'euParl', icon: '⊞', label: t('euParliament') },
      { kind: 'section' as const, label: t('sectionTools') },
      { kind: 'link' as const, id: 'democracy', icon: '◈', label: t('democracyIndex') },
      { kind: 'link' as const, id: 'lobby', icon: '⊘', label: t('lobby') },
      { kind: 'link' as const, id: 'sources', icon: '◆', label: t('navSources') },
    ]
    if (showAdminInNav) {
      entries.push({ kind: 'link' as const, id: 'admin', icon: '⚙', label: t('admin') })
    }
    return entries.map((e) =>
      e.kind === 'link' && SUB_NAV[e.id]
        ? {
            ...e,
            children: SUB_NAV[e.id].map((k) => ({
              id: k.id,
              label: t(k.labelKey as I18nKey),
              path: k.path,
            })),
          }
        : e,
    )
  }, [t])

  const handleModuleSelect = useCallback((moduleId: string) => {
    const path = MODULE_PATH[moduleId] ?? '/'
    navigate(path)
  }, [navigate])

  const onToggleSidebar = useCallback(() => setCollapsed((v) => !v), [])

  const shareUrl =
    typeof window !== 'undefined' ? window.location.href : 'https://app.respublica.media'
  const shareTitle = 'Res.Publica Dashboard'

  const mainPad = isMobile ? spacing.lg : spacing.xl

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        minHeight: '100vh',
        fontFamily: fonts.body,
        background: c.bg,
        color: c.ink,
        overflow: 'hidden',
        transition:
          `background ${motion.slow} ${motion.easing}, color ${motion.slow} ${motion.easing}`,
      }}
    >
      {!isMobile && (
        <Sidebar
          entries={navEntries}
          active={activeModule}
          activeChild={activeChild}
          onSelectChild={(pfad: string) => navigate(pfad)}
          onSelect={handleModuleSelect}
          collapsed={collapsed}
          onToggle={onToggleSidebar}
          shareTitle={shareTitle}
          shareUrl={shareUrl}
        />
      )}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          height: '100%',
        }}
      >
        {isMobile && (
          <MobileNav
            entries={navEntries}
            activeChild={activeChild}
            onSelectChild={(pfad: string) => navigate(pfad)}
            active={activeModule}
            onSelect={handleModuleSelect}
            shareTitle={shareTitle}
            shareUrl={shareUrl}
          />
        )}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: isWorldMapPage ? 'hidden' : 'auto',
            WebkitOverflowScrolling: 'touch',
            display: isWorldMapPage ? 'flex' : 'block',
            flexDirection: isWorldMapPage ? 'column' : undefined,
          }}
        >
          <div
            style={{
              maxWidth: isWorldMapPage ? 'none' : 1280,
              margin: '0 auto',
              width: '100%',
              padding: isWorldMapPage ? 0 : mainPad,
              paddingBottom: 0,
              flex: isWorldMapPage ? 1 : undefined,
              minHeight: isWorldMapPage ? 0 : undefined,
              display: isWorldMapPage ? 'flex' : 'block',
              flexDirection: isWorldMapPage ? 'column' : undefined,
            }}
          >
            <Outlet />
          </div>
          {!isWorldMapPage && <LegalFooter />}
        </div>
      </div>
    </div>
  )
}
