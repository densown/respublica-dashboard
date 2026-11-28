import { useEffect, useState } from 'react'
import type { KartenDaten } from './typen'

let puffer: Promise<KartenDaten> | null = null

/**
 * Laendergrenzen der Europakarte. Liegt als fertige SVG-Pfade unter
 * /data/europa.json (erzeugt von scripts/europa-karte.mjs) und wird je
 * Sitzung einmal geladen.
 */
export function useKarte(): KartenDaten | null {
  const [karte, setKarte] = useState<KartenDaten | null>(null)
  useEffect(() => {
    let weg = false
    puffer ??= fetch('/data/europa.json').then((r) => {
      if (!r.ok) throw new Error(String(r.status))
      return r.json() as Promise<KartenDaten>
    })
    puffer.then((k) => !weg && setKarte(k)).catch(() => {
      puffer = null
    })
    return () => {
      weg = true
    }
  }, [])
  return karte
}
