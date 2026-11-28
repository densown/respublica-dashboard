import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AlteAdresse } from './components/AlteAdresse'
import { LoadingSpinner, ThemeProvider } from './design-system'
import DashboardLayout from './layouts/DashboardLayout'
import Admin from './pages/Admin'
import Coalition from './pages/Coalition'
import DemocracyIndex from './pages/DemocracyIndex'
import Mehr from './pages/Mehr'
import NotFound from './pages/NotFound'
import Overview from './pages/Overview'
import Sources from './pages/Sources'

const WorldMap = lazy(() => import('./pages/WorldMap'))
const LobbyRegister = lazy(() => import('./pages/LobbyRegister'))
const Legislation = lazy(() => import('./pages/Legislation'))
const EuLaw = lazy(() => import('./pages/EuLaw'))
const Elections = lazy(() => import('./pages/Elections'))
const ElectionPolls = lazy(() => import('./pages/ElectionPolls'))
const ElectionCandidates = lazy(() => import('./pages/ElectionCandidates'))
const Bundestag = lazy(() => import('./pages/Bundestag'))
const Abstimmung = lazy(() => import('./pages/Abstimmung'))
const Abgeordneter = lazy(() => import('./pages/Abgeordneter'))
const Versammlungen = lazy(() => import('./pages/Versammlungen'))
const KleineAnfragen = lazy(() => import('./pages/KleineAnfragen'))
const Europa = lazy(() => import('./pages/Europa'))
const EuropaStrom = lazy(() => import('./pages/EuropaStrom'))
const EuropaParlament = lazy(() => import('./pages/EuropaParlament'))
const EuropaAbstimmung = lazy(() => import('./pages/EuropaAbstimmung'))
const EuropaAbgeordneter = lazy(() => import('./pages/EuropaAbgeordneter'))

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="wahlen" element={<Elections />} />
            <Route path="wahlen/umfragen" element={<ElectionPolls />} />
            <Route path="wahlen/kandidaturen" element={<ElectionCandidates />} />
            <Route path="quellen" element={<Sources />} />
            <Route path="bundestag" element={<Bundestag />} />
            <Route path="bundestag/:pollId" element={<Abstimmung />} />
            <Route path="bundestag/abgeordnete/:awId" element={<Abgeordneter />} />
            {/* Alte Adressen, vor dem Umbau im Oktober 2026 */}
            <Route path="abstimmungen" element={<Navigate to="/bundestag" replace />} />
            <Route path="abstimmungen/:pollId" element={<AlteAdresse ziel="/bundestag/:pollId" />} />
            <Route
              path="abgeordnete"
              element={<Navigate to="/bundestag?ansicht=abgeordnete" replace />}
            />
            <Route
              path="abgeordnete/:awId"
              element={<AlteAdresse ziel="/bundestag/abgeordnete/:awId" />}
            />
            <Route path="gesetze" element={<Legislation />} />
            <Route path="gesetze/:id" element={<Legislation />} />
            <Route path="gesetzgebung" element={<Legislation />} />
            <Route path="gesetzgebung/:id" element={<Legislation />} />
            <Route path="eu-recht" element={<EuLaw />} />
            <Route path="eu-recht/:id" element={<EuLaw />} />
            <Route path="koalition" element={<Coalition />} />
            <Route path="koalitionsvertrag" element={<Coalition />} />
            <Route path="demokratie-index" element={<Navigate to="/demokratie" replace />} />
            <Route path="demokratie" element={<DemocracyIndex />} />
            <Route path="versammlungen" element={<Versammlungen />} />
            <Route path="kleine-anfragen" element={<KleineAnfragen />} />
            <Route path="weltkarte" element={<WorldMap />} />
            <Route path="europa" element={<Europa />} />
            <Route path="europa/strom" element={<EuropaStrom />} />
            <Route path="europa/parlament" element={<EuropaParlament />} />
            <Route path="europa/parlament/:id" element={<EuropaAbstimmung />} />
            <Route path="europa/parlament/abgeordnete/:id" element={<EuropaAbgeordneter />} />
            <Route path="eu-parlament" element={<Navigate to="/europa/parlament" replace />} />
            <Route path="lobbyregister" element={<LobbyRegister />} />
            <Route path="mehr" element={<Mehr />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </Suspense>
      </ThemeProvider>
    </BrowserRouter>
  )
}
