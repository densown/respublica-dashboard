import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoadingSpinner, ThemeProvider } from './design-system'
import DashboardLayout from './layouts/DashboardLayout'
import Admin from './pages/Admin'
import Coalition from './pages/Coalition'
import DemocracyIndex from './pages/DemocracyIndex'
import EuParliament from './pages/EuParliament'
import NotFound from './pages/NotFound'
import Overview from './pages/Overview'
import Sources from './pages/Sources'

const WorldMap = lazy(() => import('./pages/WorldMap'))
const LobbyRegister = lazy(() => import('./pages/LobbyRegister'))
const Legislation = lazy(() => import('./pages/Legislation'))
const EuLaw = lazy(() => import('./pages/EuLaw'))
const Elections = lazy(() => import('./pages/Elections'))
const Bundestag = lazy(() => import('./pages/Bundestag'))

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="wahlen" element={<Elections />} />
            <Route path="quellen" element={<Sources />} />
            <Route path="bundestag" element={<Bundestag />} />
            <Route path="bundestag/:pollId" element={<Bundestag />} />
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
            <Route path="weltkarte" element={<WorldMap />} />
            <Route path="eu-parlament" element={<EuParliament />} />
            <Route path="lobbyregister" element={<LobbyRegister />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </Suspense>
      </ThemeProvider>
    </BrowserRouter>
  )
}
