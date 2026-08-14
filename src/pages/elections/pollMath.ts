import type { PollRow } from './pollTypes'

/** Aggregat-Eintrag, keine echte Partei — fliegt aus Trend und Koalitionen. */
export const OTHER = 'other'

/** Sperrklausel in Prozent. Bundesweit und in allen Laendern 5 %. */
export const THRESHOLD = 5

export type Standing = { partei: string; wert: number; delta: number | null }

function mittelwert(rows: PollRow[], partei: string): number | null {
  const werte = rows
    .map((r) => r[partei])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (!werte.length) return null
  return werte.reduce((a, b) => a + b, 0) / werte.length
}

/**
 * Aktueller Stand als Mittel der letzten `fenster` Umfragen, plus Veraenderung
 * gegenueber den `fenster` davor.
 *
 * Bewusst ein gleitender Schnitt statt der einzelnen juengsten Umfrage: eine
 * Einzelumfrage schwankt staerker als der reale Trend, und verschiedene
 * Institute haben systematische Haus-Effekte. Genau so rechnet auch dawum
 * seinen Wahltrend.
 */
export function standing(
  rows: PollRow[],
  parteien: string[],
  fenster = 3,
): Standing[] {
  if (!rows.length) return []
  const aktuell = rows.slice(-fenster)
  const davor = rows.slice(-2 * fenster, -fenster)

  return parteien
    .map((partei) => {
      const wert = mittelwert(aktuell, partei)
      if (wert == null) return null
      const vorher = davor.length ? mittelwert(davor, partei) : null
      return {
        partei,
        wert,
        delta: vorher == null ? null : wert - vorher,
      }
    })
    .filter((s): s is Standing => s !== null)
    .sort((a, b) => b.wert - a.wert)
}

export type Coalition = {
  parteien: string[]
  /** Mandatsanteil in Prozent, auf die Parteien ueber der Huerde normiert. */
  anteil: number
}

/**
 * Rechnerisch moegliche Mehrheiten aus dem aktuellen Stand.
 *
 * Vereinfachung gegenueber einer echten Sitzberechnung: die Anteile der
 * Parteien ueber der Sperrklausel werden auf 100 normiert. Das entspricht dem,
 * was Sitzzuteilungsverfahren naeherungsweise liefern, ohne dass wir je Land
 * das richtige Verfahren (Sainte-Lague, Hare-Niemeyer, in Bremen nach
 * Wahlbereichen) und die Mandatszahl kennen muessen.
 *
 * Bewertet wird nur die Arithmetik. Welche Buendnisse politisch plausibel
 * sind, ist eine redaktionelle Aussage und wird hier nicht getroffen —
 * ausgegeben werden alle rechnerischen Mehrheiten.
 */
export function coalitions(werte: Standing[], maxGroesse = 3): Coalition[] {
  const drin = werte.filter((s) => s.partei !== OTHER && s.wert >= THRESHOLD)
  const summe = drin.reduce((a, s) => a + s.wert, 0)
  if (summe <= 0) return []

  const anteile = new Map(drin.map((s) => [s.partei, (s.wert / summe) * 100]))

  // Alle Kombinationen bis maxGroesse aufzaehlen. Bei hoechstens einer
  // Handvoll Parteien ueber der Huerde sind das wenige Dutzend Faelle.
  const alle: Coalition[] = []
  const baue = (start: number, aktuell: string[]) => {
    if (aktuell.length) {
      const anteil = aktuell.reduce((a, p) => a + (anteile.get(p) ?? 0), 0)
      if (anteil > 50) alle.push({ parteien: [...aktuell], anteil })
    }
    if (aktuell.length >= maxGroesse) return
    for (let i = start; i < drin.length; i += 1) {
      aktuell.push(drin[i].partei)
      baue(i + 1, aktuell)
      aktuell.pop()
    }
  }
  baue(0, [])

  // Nur minimale Buendnisse behalten: enthaelt eine Koalition eine andere
  // vollstaendig, ist der zusaetzliche Partner fuer die Mehrheit entbehrlich
  // und die groessere Variante sagt nichts Eigenes aus. Muss ueber alle
  // Kombinationen laufen, nicht nur innerhalb eines Suchzweigs.
  const minimal = alle.filter(
    (k) =>
      !alle.some(
        (anderer) =>
          anderer.parteien.length < k.parteien.length &&
          anderer.parteien.every((p) => k.parteien.includes(p)),
      ),
  )

  return minimal.sort(
    (a, b) => a.parteien.length - b.parteien.length || b.anteil - a.anteil,
  )
}
