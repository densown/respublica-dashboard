import { Navigate, generatePath, useParams } from 'react-router-dom'

/**
 * Leitet eine Adresse aus der Zeit vor dem Umbau weiter, etwa
 * /abstimmungen/123 nach /bundestag/123. `ziel` ist ein Routenmuster mit
 * denselben Platzhaltern wie die alte Route.
 *
 * Der Server leitet dieselben Pfade mit 301 um (deploy/nginx/app-routen.conf).
 * Diese Fassung greift, wenn die App schon offen ist oder die Server-Regel
 * noch fehlt.
 */
export function AlteAdresse({ ziel }: { ziel: string }) {
  const params = useParams()
  return <Navigate to={generatePath(ziel, params)} replace />
}
