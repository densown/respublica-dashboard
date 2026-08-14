import { GOVERNANCE_DIVERGING } from '../../design-system/palettes'

/**
 * Farbskala für die Governance-Werte.
 *
 * Divergierend um null, weil die Weltbank ihre Dimensionen auf den weltweiten
 * Mittelwert normiert: null heisst "Durchschnitt", nicht "schlecht". Eine
 * einfache Hell-Dunkel-Skala wuerde diesen Nullpunkt verstecken, obwohl er die
 * einzige inhaltlich definierte Marke auf der Achse ist.
 *
 * Der Neutralton in der Mitte bleibt bewusst hell und farblos — ein Farbton in
 * der Mitte liesse Werte nahe null wie eine eigene Kategorie wirken.
 */

function mische(a: readonly number[], b: readonly number[], f: number): string {
  const v = a.map((x, i) => Math.round(x + (b[i] - x) * f))
  return `rgb(${v[0]}, ${v[1]}, ${v[2]})`
}

/**
 * @param wert  Governance-Schaetzung, ueblicher Bereich -2,5 bis +2,5
 * @param dunkel  Dunkelmodus: der Neutralton muss dort dunkel sein, sonst
 *                leuchten die mittleren Werte heller als die guten.
 */
export function governanceFarbe(wert: number, dunkel: boolean): string {
  // Auf 1,6 statt 2,5 normiert: jenseits davon liegen kaum Laender, und die
  // Skala verschenkte sonst ihren Kontrast im tatsaechlich belegten Bereich.
  const t = Math.max(-1, Math.min(1, wert / 1.6))
  const { hoch, tief, neutralHell, neutralDunkel } = GOVERNANCE_DIVERGING
  const neutral = dunkel ? neutralDunkel : neutralHell
  return t >= 0 ? mische(neutral, hoch, t) : mische(neutral, tief, -t)
}

/** Beschriftung der Bänder im Handelsspiegel. */
export const BAND_REIHENFOLGE = ['hoch', 'mittel', 'niedrig', 'sehr_niedrig'] as const

/** Repräsentativer Wert je Band, um die Bandfarbe aus derselben Skala zu ziehen. */
export const BAND_WERT: Record<string, number> = {
  hoch: 1.5,
  mittel: 0.5,
  niedrig: -0.5,
  sehr_niedrig: -1.5,
}
