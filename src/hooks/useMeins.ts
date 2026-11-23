import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'

/**
 * Was die App ueber die Person vor dem Bildschirm weiss. Alles liegt nur im
 * Browser (localStorage), nichts davon geht an den Server: der Wahlkreis,
 * die eigenen Stimmen, der letzte Besuch und der Stand des Rundgangs.
 */

/** Wahlkreis der Bundestagswahl, wie er in /api/abgeordnete steht, ohne Wahlperiode. */
export type MeinOrt = { nummer: string | null; name: string }

export function useMeinOrt(): [MeinOrt | null, (ort: MeinOrt | null) => void] {
  return useLocalStorage<MeinOrt | null>('rp-wahlkreis', null)
}

export type EigeneStimme = 'yes' | 'no' | 'abstain'

/** Eigene Stimmen zu namentlichen Abstimmungen, nach poll_id. */
export function useEigeneStimmen(): {
  stimmen: Record<string, EigeneStimme>
  setze: (pollId: number, stimme: EigeneStimme | null) => void
} {
  const [stimmen, setStimmen] = useLocalStorage<Record<string, EigeneStimme>>('rp-stimmen', {})
  const setze = useCallback(
    (pollId: number, stimme: EigeneStimme | null) => {
      const neu = { ...stimmen }
      if (stimme) neu[String(pollId)] = stimme
      else delete neu[String(pollId)]
      setStimmen(neu)
    },
    [stimmen, setStimmen],
  )
  return { stimmen, setze }
}

/**
 * Tag des vorigen Besuchs (JJJJ-MM-TT) oder null beim ersten. Einmal je
 * Sitzung festgehalten, damit "Neu seit deinem Besuch" beim Blaettern nicht
 * verschwindet.
 */
const VORIGER_BESUCH: string | null = (() => {
  try {
    const gemerkt = sessionStorage.getItem('rp-besuch-vorher')
    if (gemerkt !== null) return gemerkt || null
    const vorher = localStorage.getItem('rp-besuch')
    sessionStorage.setItem('rp-besuch-vorher', vorher ?? '')
    localStorage.setItem('rp-besuch', new Date().toISOString().slice(0, 10))
    return vorher
  } catch {
    return null
  }
})()

export function vorigerBesuch(): string | null {
  return VORIGER_BESUCH
}

type RundgangStand = { geoeffnet?: boolean; zu?: boolean }

/**
 * Rundgang in drei Handgriffen: Wahlkreis waehlen, eine Abstimmung oeffnen,
 * selbst abstimmen. Zwei davon ergeben sich aus dem, was ohnehin gemerkt ist.
 */
export function useRundgang() {
  const [stand, setStand] = useLocalStorage<RundgangStand>('rp-rundgang', {})
  const [ort] = useMeinOrt()
  const { stimmen } = useEigeneStimmen()
  const schritte = useMemo(
    () => ({
      ort: ort != null,
      geoeffnet: stand.geoeffnet === true,
      gestimmt: Object.keys(stimmen).length > 0,
    }),
    [ort, stand.geoeffnet, stimmen],
  )
  const abstimmungGeoeffnet = useCallback(() => {
    if (!stand.geoeffnet) setStand({ ...stand, geoeffnet: true })
  }, [stand, setStand])
  const schliessen = useCallback(() => setStand({ ...stand, zu: true }), [stand, setStand])
  return { schritte, zu: stand.zu === true, abstimmungGeoeffnet, schliessen }
}
