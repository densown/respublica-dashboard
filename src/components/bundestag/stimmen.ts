import { hatFraktionslinie, OHNE_FRAKTION, ohneWahlperiode, shortFraktionName } from './fraktion'

/**
 * Einzelstimmen einer namentlichen Abstimmung: wer wie gestimmt hat und wer
 * von der eigenen Fraktion abgewichen ist.
 *
 * Liste und Fraktionsbalken rechnen mit derselben Funktion, damit die Namen
 * unter dem Balken und die markierten Zeilen in der Liste uebereinstimmen.
 */

export type Stimme = 'yes' | 'no' | 'abstain' | 'no_show'

export const STIMMEN: Stimme[] = ['yes', 'no', 'abstain', 'no_show']

/** Zeile aus /api/bundestag/poll-votes/:id */
export type StimmenZeile = {
  mandate_id: number
  vote: string
  abgeordneter_name: string
  /**
   * Fraktion zum Zeitpunkt der Abstimmung (API ab Migration 019). Fehlt sie,
   * kommt die Fraktion aus /api/abgeordnete, und wer dort fehlt, steht ohne
   * Fraktion da.
   */
  fraction_label?: string | null
}

export type AbgeordneterInfo = {
  aw_id: number
  name: string
  fraktion: string
  wahlkreis: string
}

export type StimmEintrag = {
  awId: number
  name: string
  nachname: string
  fraktion: string
  wahlkreis: string
  stimme: Stimme
  abweichung: boolean
}

const SSW_NAME = 'Stefan Seidler'

export function normalizeStimme(raw: string): Stimme {
  const v = raw.trim().toLowerCase()
  if (v === 'yes') return 'yes'
  if (v === 'no') return 'no'
  if (v === 'abstain' || v === 'abstention') return 'abstain'
  return 'no_show'
}

/** Fuer die Suche: klein, ohne Akzente, ß als ss. "Özoğuz" findet man mit "ozoguz". */
export function fuerSuche(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
}

export function nachnameAus(name: string): string {
  const parts = name.trim().replace(/\s+/g, ' ').split(' ')
  return parts[parts.length - 1] ?? name
}

/**
 * Mehrheit unter den abgegebenen Stimmen. Nichtteilnahme zaehlt nicht mit,
 * wie im Themenprofil der Abgeordneten. Bei Gleichstand gewinnt Ja vor Nein
 * vor Enthaltung.
 */
export function mehrheit(z: { ja: number; nein: number; enthalten: number }): Stimme | null {
  const kandidaten: [Stimme, number][] = [
    ['yes', z.ja],
    ['no', z.nein],
    ['abstain', z.enthalten],
  ]
  const [stimme, n] = kandidaten.reduce((a, b) => (b[1] > a[1] ? b : a))
  return n > 0 ? stimme : null
}

/** Alle Einzelstimmen mit Name, Fraktion und Abweichung, nach Nachname. */
export function stimmEintraege(
  votes: StimmenZeile[],
  abgeordnete: Map<number, AbgeordneterInfo>,
): StimmEintrag[] {
  const basis = votes.map((v) => {
    const info = abgeordnete.get(v.mandate_id)
    const name = info?.name ?? v.abgeordneter_name
    const fraktion =
      name.trim() === SSW_NAME
        ? 'SSW'
        : v.fraction_label
          ? shortFraktionName(v.fraction_label)
          : info
            ? shortFraktionName(info.fraktion)
            : OHNE_FRAKTION
    return {
      awId: v.mandate_id,
      name,
      nachname: nachnameAus(name),
      fraktion,
      wahlkreis: ohneWahlperiode(info?.wahlkreis),
      stimme: normalizeStimme(v.vote),
      abweichung: false,
    }
  })

  const zaehler = new Map<string, { ja: number; nein: number; enthalten: number }>()
  for (const e of basis) {
    const z = zaehler.get(e.fraktion) ?? { ja: 0, nein: 0, enthalten: 0 }
    if (e.stimme === 'yes') z.ja += 1
    else if (e.stimme === 'no') z.nein += 1
    else if (e.stimme === 'abstain') z.enthalten += 1
    zaehler.set(e.fraktion, z)
  }

  return basis
    .map((e) => {
      const linie = mehrheit(zaehler.get(e.fraktion) ?? { ja: 0, nein: 0, enthalten: 0 })
      return {
        ...e,
        abweichung:
          e.stimme !== 'no_show' &&
          hatFraktionslinie(e.fraktion) &&
          linie != null &&
          linie !== e.stimme,
      }
    })
    .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de', { sensitivity: 'base' }))
}

/** Abweichende je Fraktion (gekuerzter Name), fuer die Notiz am Balken. */
export function abweichlerJeFraktion(eintraege: StimmEintrag[]): Map<string, StimmEintrag[]> {
  const out = new Map<string, StimmEintrag[]>()
  for (const e of eintraege) {
    if (!e.abweichung) continue
    const liste = out.get(e.fraktion) ?? []
    liste.push(e)
    out.set(e.fraktion, liste)
  }
  return out
}
