import type { Ergebnis, ErgebnisPartei } from './pollTypes'
import { OTHER, type Standing } from './pollMath'

/**
 * Rechnen mit dem amtlichen Ergebnis.
 *
 * Abgegrenzt von pollMath.ts, weil sich die Datenlage grundsaetzlich
 * unterscheidet: Umfragen liefern nur Prozente, aus denen Sitze geschaetzt
 * werden muessen. Beim Ergebnis sind die Sitze bekannt — hier wird nichts
 * genaehert, sondern gezaehlt.
 */

export type Abweichung = {
  partei: string
  /** Mittel der letzten Umfragen, null wenn die Partei nicht abgefragt wurde. */
  umfrage: number | null
  ergebnis: number
  /** ergebnis − umfrage, null ohne Umfragewert. */
  delta: number | null
  /** Partei war in Umfragen unter, im Ergebnis ueber der Huerde (oder umgekehrt). */
  huerdeVerfehlt: boolean
}

/**
 * Umfragen gegen Ergebnis.
 *
 * Der interessante Teil einer gelaufenen Wahl: nicht was herauskam, sondern
 * wie weit die Erwartung danebenlag. `standing` ist derselbe gleitende
 * Schnitt, den die Seite vor der Wahl als "Aktueller Stand" gezeigt hat —
 * verglichen wird also genau die Zahl, die dort stand, nicht nachtraeglich
 * eine guenstigere.
 */
export function abweichungen(
  ergebnis: Ergebnis,
  stand: Standing[],
  schwelle = 5,
): Abweichung[] {
  const umfrageWert = new Map(stand.map((s) => [s.partei, s.wert]))

  return ergebnis.parteien
    .filter((p) => p.kuerzel !== OTHER)
    .map((p) => {
      const umfrage = umfrageWert.get(p.kuerzel) ?? null
      return {
        partei: p.kuerzel,
        umfrage,
        ergebnis: p.prozent,
        delta: umfrage == null ? null : p.prozent - umfrage,
        huerdeVerfehlt:
          umfrage != null &&
          umfrage < schwelle !== p.prozent < schwelle,
      }
    })
    .sort((a, b) => b.ergebnis - a.ergebnis)
}

export type SitzKoalition = {
  parteien: string[]
  sitze: number
  /** Sitze ueber der absoluten Mehrheit; 0 heisst exakt auf der Kante. */
  ueberhang: number
}

/**
 * Mehrheiten aus echten Sitzen.
 *
 * Gegenstueck zu pollMath.coalitions(), das Prozente auf 100 normieren muss,
 * weil es die Mandatszahl nicht kennt. Liegt ein Ergebnis vor, entfaellt diese
 * Naeherung vollstaendig: gezaehlt werden Sitze, die Mehrheit ist
 * ⌊gesamt / 2⌋ + 1.
 *
 * Wie dort gilt: ausgegeben werden alle arithmetischen Mehrheiten. Welche
 * Buendnisse politisch in Frage kommen, ist eine redaktionelle Aussage und
 * wird hier nicht getroffen.
 */
export function sitzKoalitionen(
  ergebnis: Ergebnis,
  maxGroesse?: number,
): SitzKoalition[] {
  const drin = ergebnis.parteien.filter(
    (p): p is ErgebnisPartei & { sitze: number } =>
      p.kuerzel !== OTHER && p.sitze != null && p.sitze > 0,
  )
  const gesamt =
    ergebnis.sitze_gesamt ?? drin.reduce((a, p) => a + p.sitze, 0)
  if (!gesamt) return []
  const mehrheit = Math.floor(gesamt / 2) + 1

  // Standardmaessig ALLE Fraktionen zulassen, nicht wie bei den Umfragen nur
  // Dreierbuendnisse. Sonst verschwindet genau der Fall, der eine zersplitterte
  // Kammer ausmacht: hat eine Partei fast die Haelfte der Sitze, braucht jede
  // Mehrheit ohne sie alle uebrigen Fraktionen. In Sachsen-Anhalt 2026 (AfD 39
  // von 83) waere mit einer Obergrenze von drei nur noch abzulesen, dass es
  // ohne die AfD keine Mehrheit gaebe — was schlicht falsch ist.
  // Die Kombinatorik bleibt harmlos: sechs Fraktionen sind 63 Teilmengen.
  const grenze = maxGroesse ?? drin.length

  const alle: SitzKoalition[] = []
  const baue = (start: number, aktuell: ErgebnisPartei[]) => {
    if (aktuell.length) {
      const sitze = aktuell.reduce((a, p) => a + (p.sitze ?? 0), 0)
      if (sitze >= mehrheit) {
        alle.push({
          parteien: aktuell.map((p) => p.kuerzel),
          sitze,
          ueberhang: sitze - mehrheit,
        })
      }
    }
    if (aktuell.length >= grenze) return
    for (let i = start; i < drin.length; i += 1) {
      aktuell.push(drin[i])
      baue(i + 1, aktuell)
      aktuell.pop()
    }
  }
  baue(0, [])

  // Nur minimale Buendnisse: enthaelt eine Koalition eine kleinere
  // vollstaendig, ist der zusaetzliche Partner fuer die Mehrheit entbehrlich.
  const minimal = alle.filter(
    (k) =>
      !alle.some(
        (anderer) =>
          anderer.parteien.length < k.parteien.length &&
          anderer.parteien.every((p) => k.parteien.includes(p)),
      ),
  )

  return minimal.sort(
    (a, b) => a.parteien.length - b.parteien.length || b.sitze - a.sitze,
  )
}

/** Absolute Mehrheit, oder null ohne Sitzangabe. */
export function mehrheitsschwelle(ergebnis: Ergebnis): number | null {
  return ergebnis.sitze_gesamt == null
    ? null
    : Math.floor(ergebnis.sitze_gesamt / 2) + 1
}
