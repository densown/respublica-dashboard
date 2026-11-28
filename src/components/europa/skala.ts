/**
 * Achsen fuer die Europa-Diagramme. Eine Stelle, damit jede Grafik dieselben
 * Regeln hat: runde Skalenwerte, die Daten bleiben immer innerhalb der
 * Zeichenflaeche, Zeitmarken gleichmaessig verteilt.
 */

export type AchsenSkala = { lo: number; hi: number; schritt: number; marken: number[] }

const FAKTOREN = [1, 2, 2.5, 5, 10]

/**
 * Runde Skala um [min, max]. `abNull` zieht die Null mit herein (Preise,
 * Mengen); ohne beginnt die Achse beim naechsten runden Wert unter dem
 * Minimum, die Marken zeigen das dann an.
 */
export function achsenSkala(min: number, max: number, abNull: boolean, ziel = 4): AchsenSkala {
  let lo = abNull ? Math.min(0, min) : min
  let hi = abNull ? Math.max(0, max) : max
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo: 0, hi: 1, schritt: 1, marken: [0, 1] }
  if (hi === lo) {
    const d = Math.abs(hi) || 1
    hi += d / 2
    lo -= abNull && lo === 0 ? 0 : d / 2
  }
  const roh = (hi - lo) / ziel
  const potenz = 10 ** Math.floor(Math.log10(roh))
  const schritt = (FAKTOREN.find((f) => f * potenz >= roh * 0.999) ?? 10) * potenz
  lo = Math.floor(lo / schritt + 1e-9) * schritt
  hi = Math.ceil(hi / schritt - 1e-9) * schritt
  const marken: number[] = []
  for (let i = 0; i <= Math.round((hi - lo) / schritt); i++) {
    // Rundung gegen 0.30000000000000004
    marken.push(Number((lo + i * schritt).toPrecision(12)))
  }
  return { lo, hi, schritt, marken }
}

/** Bis zu `anzahl` gleichmaessig verteilte Stellen einer Achse mit n Punkten, immer mit erster und letzter. */
export function zeitMarken(n: number, anzahl = 4): number[] {
  if (n <= 0) return []
  if (n <= anzahl) return Array.from({ length: n }, (_, i) => i)
  const stellen = new Set<number>()
  for (let i = 0; i < anzahl; i++) stellen.add(Math.round((i / (anzahl - 1)) * (n - 1)))
  return [...stellen].sort((a, b) => a - b)
}
