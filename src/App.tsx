import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './design-system'
import DashboardLayout from './layouts/DashboardLayout'
import Admin from './pages/Admin'
import Bundestag from './pages/Bundestag'
import Coalition from './pages/Coalition'
import DemocracyIndex from './pages/DemocracyIndex'
import Elections from './pages/Elections'
import EuLaw from './pages/EuLaw'
import EuParliament from './pages/EuParliament'
import Legislation from './pages/Legislation'
import LobbyRegister from './pages/LobbyRegister'
import NotFound from './pages/NotFound'
import Overview from './pages/Overview'
import Sources from './pages/Sources'
import WorldMap from './pages/WorldMap'

const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:wght@700;900&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap'

export default function App() {
  useEffect(() => {
    const preconnectGoogle = document.createElement('link')
    preconnectGoogle.rel = 'preconnect'
    preconnectGoogle.href = 'https://fonts.googleapis.com'

    const preconnectGstatic = document.createElement('link')
    preconnectGstatic.rel = 'preconnect'
    preconnectGstatic.href = 'https://fonts.gstatic.com'
    preconnectGstatic.crossOrigin = ''

    const stylesheet = document.createElement('link')
    stylesheet.rel = 'stylesheet'
    stylesheet.href = GOOGLE_FONTS_HREF

    document.head.append(preconnectGoogle, preconnectGstatic, stylesheet)

    return () => {
      preconnectGoogle.remove()
      preconnectGstatic.remove()
      stylesheet.remove()
    }
  }, [])

  return (
    <BrowserRouter>
      <ThemeProvider>
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
            <Route path="demokratie" element={<DemocracyIndex />} />
            <Route path="weltkarte" element={<WorldMap />} />
            <Route path="eu-parlament" element={<EuParliament />} />
            <Route path="lobbyregister" element={<LobbyRegister />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}
