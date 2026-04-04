import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { breakpoints, fonts, spacing } from '../design-system/tokens'
import { LegalFooter, MobileNav, Sidebar, useTheme } from '../design-system'

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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoints.mobile : false,
  )

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoints.mobile)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isMobile
}

function activeModuleFromPath(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'overview'
  const first = pathname.split('/').filter(Boolean)[0]
  return ROUTE_PREFIX[first] ?? 'overview'
}

export default function DashboardLayout() {
  const { c, t } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)

  const activeModule = activeModuleFromPath(location.pathname)

  const navEntries = useMemo(
    () => [
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
      { kind: 'link' as const, id: 'admin', icon: '⚙', label: t('admin') },
    ],
    [t],
  )

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
          'background 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {!isMobile && (
        <Sidebar
          entries={navEntries}
          active={activeModule}
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
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              width: '100%',
              padding: mainPad,
              paddingBottom: 0,
            }}
          >
            <Outlet />
          </div>
          <LegalFooter />
        </div>
      </div>
    </div>
  )
}
