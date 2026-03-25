import { Routes, Route } from 'react-router-dom';
import Overview from './pages/Overview';
import { PlaceholderPage } from './pages/Placeholder';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/bundestag" element={<PlaceholderPage title="Bundestag" />} />
      <Route path="/bundestag/:id" element={<PlaceholderPage title="Abstimmung" />} />
      <Route path="/gesetze" element={<PlaceholderPage title="Gesetze" />} />
      <Route path="/gesetze/:id" element={<PlaceholderPage title="Gesetz" />} />
      <Route path="/eu-recht" element={<PlaceholderPage title="EU-Recht" />} />
      <Route path="/eu-recht/:id" element={<PlaceholderPage title="EU-Rechtsakt" />} />
      <Route path="/koalition" element={<PlaceholderPage title="Koalitionsvertrag" />} />
    </Routes>
  );
}

export default App;
