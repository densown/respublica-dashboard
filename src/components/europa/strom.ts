import type { ThemeColors } from '../../design-system/tokens'
import type { StromZone } from './typen'

/** Wertebereich fuer die Farbskala: von 0 (oder darunter) bis zum Hoechstwert. */
export type Skala = { lo: number; hi: number }

export function skalaAus(werte: (number | null)[]): Skala {
  const w = werte.filter((v): v is number => v != null)
  if (w.length === 0) return { lo: 0, hi: 1 }
  return { lo: 0, hi: Math.max(1, ...w) }
}

/**
 * Flaechenfarbe fuer einen Preis. Eine Farbe, unterschiedlich kraeftig: je
 * teurer, desto mehr Rot auf dem Kartengrund. Hoechstens 55 Prozent, damit
 * die Zahl in Tinte auf jeder Kachel lesbar bleibt, hell wie dunkel.
 * Negative Preise sind gruen: dort bekommt Geld, wer Strom abnimmt.
 */
export function preisFarbe(v: number | null, skala: Skala, c: ThemeColors): string {
  if (v == null) return c.bgHover
  if (v < 0) return `color-mix(in srgb, ${c.yes} 38%, ${c.cardBg})`
  const anteil = Math.min(1, Math.max(0, (v - skala.lo) / (skala.hi - skala.lo || 1)))
  return `color-mix(in srgb, ${c.red} ${Math.round(6 + anteil * 49)}%, ${c.cardBg})`
}

/** Die drei guenstigsten Stunden am Stueck. */
export function guenstigstesFenster(stunden: (number | null)[], laenge = 3): { von: number; bis: number; mittel: number } | null {
  let bestes: { von: number; bis: number; mittel: number } | null = null
  for (let i = 0; i + laenge <= stunden.length; i++) {
    const teil = stunden.slice(i, i + laenge)
    if (teil.some((v) => v == null)) continue
    const mittel = (teil as number[]).reduce((a, b) => a + b, 0) / laenge
    if (!bestes || mittel < bestes.mittel) bestes = { von: i, bis: i + laenge, mittel }
  }
  return bestes
}

export function teuersteStunde(stunden: (number | null)[]): { stunde: number; wert: number } | null {
  let b: { stunde: number; wert: number } | null = null
  stunden.forEach((v, i) => {
    if (v != null && (!b || v > b.wert)) b = { stunde: i, wert: v }
  })
  return b
}

export function negativeStunden(stunden: (number | null)[]): number {
  return stunden.filter((v) => v != null && v < 0).length
}

/** Zonen mit Tageswert, guenstigste zuerst. */
export function nachPreis(zonen: StromZone[]): StromZone[] {
  return zonen.filter((z) => z.mittel != null).sort((a, b) => (a.mittel as number) - (b.mittel as number))
}

/** Kurzzeichen auf der Kachel: "DE" statt "DE-LU", sonst der Zonencode. */
export function kachelZeichen(z: StromZone): string {
  return z.code === 'DE-LU' ? 'DE' : z.code
}
