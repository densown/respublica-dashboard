/**
 * Datenpaletten.
 *
 * Abgegrenzt von `tokens.ts`: dort steht die Oberflaeche (Papier, Tinte,
 * Rand, Akzent), hier stehen Farben, die eine Aussage tragen — Kategorien,
 * Dokumenttypen, Gerichte. Siehe docs/DESIGN.md, Abschnitt 4.
 *
 * Warum getrennt: Oberflaechenfarben wechseln mit dem Farbmodus, Datenfarben
 * nicht. Eine Verordnung ist in beiden Modi dieselbe Verordnung. Wo eine
 * Datenfarbe im Dunkeln untergeht, bekommt sie einen eigenen Dunkelwert —
 * so wie CDU/CSU in partyColors.ts von Schwarz auf Graublau wechselt.
 *
 * Regel: keine Datenfarbe inline in einer Seite oder Komponente. Fehlt eine,
 * kommt sie hierher.
 */

import type { ThemeColors } from './tokens'

/**
 * Kategoriale Reihe fuer Mengen ohne eigene Farblogik — Branchen im
 * Lobbyregister, Gruppierungen in Diagrammen.
 *
 * Beginnt mit dem Markenrot und laeuft dann in gedeckte, gut unterscheidbare
 * Toene. Bewusst dunkel gehalten: die Reihe wird auf hellen Flaechen mit
 * weisser Schrift verwendet.
 */
export const CATEGORICAL = [
  '#C8102E',
  '#1A5276',
  '#1E8449',
  '#7D3C98',
  '#D35400',
  '#2E86C1',
  '#A93226',
  '#117A65',
  '#6C3483',
  '#B7950B',
  '#1A252F',
  '#784212',
  '#4A235A',
  '#1B4F72',
  '#0E6655',
] as const

/** Farbe aus der kategorialen Reihe, laeuft bei Ueberlauf um. */
export function categorical(index: number): string {
  return CATEGORICAL[Math.abs(index) % CATEGORICAL.length]
}

/**
 * EU-Rechtsakte nach Dokumenttyp. Keine amtlichen Farben, aber durchgehend
 * verwendet: Verordnung blau, Richtlinie gruen, Beschluss orange.
 */
export const EU_DOC_TYPE: Record<string, string> = {
  REG: '#2563EB',
  DIR: '#16A34A',
  DEC: '#D97706',
}

/** Rueckfall fuer unbekannte Dokumenttypen. */
export const EU_DOC_TYPE_FALLBACK = '#6B7280'

/** Gerichte der EU: EuGH und EuG unterscheidbar halten. */
export const EU_COURT: Record<string, string> = {
  EuGH: '#DC2626',
  EuG: '#2563EB',
}

/**
 * Marken der Teilen-Ziele. Fremde Marken, deshalb feste Werte in beiden
 * Farbmodi — ein umgefaerbtes Reddit-Orange waere schlicht falsch.
 */
export const SHARE_BRAND = {
  reddit: '#FF4500',
  linkedin: '#0A66C2',
  whatsapp: '#25D366',
  telegram: '#229ED9',
} as const

/**
 * Schrift auf gesaettigten Datenfarben. Fest in beiden Farbmodi: die
 * Hintergrundfarbe wechselt ja nicht mit dem Modus, also darf es die
 * Schrift darauf auch nicht.
 */
export const ON_DATA_LIGHT = '#FFFFFF'
export const ON_DATA_DARK = '#0F0F0F'

function luminanz(hex: string): number {
  const h = hex.replace('#', '')
  const kanal = (i: number) => {
    const v = Number.parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * kanal(0) + 0.7152 * kanal(2) + 0.0722 * kanal(4)
}

/**
 * Schrift auf einer Datenfarbe: hell oder dunkel, je nachdem, was mehr
 * Kontrast gibt. Fuer Zahlen in Balken, deren Farbe mit dem Farbmodus
 * wechselt (Senf fuer Enthaltung traegt keine weisse Schrift).
 */
export function textAuf(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return ON_DATA_LIGHT
  const l = luminanz(hex)
  const gegenHell = 1.05 / (l + 0.05)
  const gegenDunkel = (l + 0.05) / (luminanz(ON_DATA_DARK) + 0.05)
  return gegenHell >= gegenDunkel ? ON_DATA_LIGHT : ON_DATA_DARK
}

export type StimmArt = 'ja' | 'nein' | 'enthalten' | 'abwesend'

export type StimmFarben = Pick<ThemeColors, 'yes' | 'no' | 'abstain' | 'hatch' | 'muted'>

/**
 * Flaeche einer Stimmart: Farbe fuer Ja, Nein, Enthaltung, Schraffur fuer
 * "nicht abgestimmt". Dieselbe Flaeche steht im Balken, in der Legende und
 * neben jedem Namen in der Liste. Die Farben selbst sind Oberflaechen-Token
 * (c.yes, c.no ...), weil sie mit dem Farbmodus wechseln.
 */
export function stimmFlaeche(art: StimmArt, c: StimmFarben): string {
  if (art === 'ja') return c.yes
  if (art === 'nein') return c.no
  if (art === 'enthalten') return c.abstain
  return `repeating-linear-gradient(135deg, ${c.hatch} 0 2px, transparent 2px 7px)`
}

/** Wenn eine Kategorie keine eigene Farbe hat. Bewusst unauffaellig. */
export const NEUTRAL_FALLBACK = '#888888'

/**
 * Reihenfarben fuer Vergleiche mit wenigen Linien (Regionen, Szenarien).
 * Gedaempfter als CATEGORICAL, weil hier Linien statt Flaechen entstehen.
 */
export const SERIES = ['#4E79A7', '#E15759', '#59A14F', '#EDC948'] as const

/** Badge-Varianten. Fest, weil sie Status markieren und nicht Oberflaeche sind. */
export const BADGE = {
  blue: '#1E40AF',
  amber: '#C2410C',
  purple: '#6B21A8',
  teal: '#0F766E',
  gray: '#6B7280',
} as const

/** Suedschleswigscher Waehlerverband — fehlt in partyColors.ts. */
export const SSW = '#003F8E'

/**
 * Laenderkonturen auf der Weltkarte. Bewusst in beiden Farbmodi gleich: die
 * Flaechen darunter sind eingefaerbte Daten, keine Oberflaeche — eine mit dem
 * Modus wechselnde Kontur waere dort willkuerlich.
 */
export const MAP_OUTLINE = '#000000'
export const MAP_OUTLINE_HOVER = '#FFFFFF'

/**
 * Divergierende Skala fuer Regierungsfuehrungs-Werte.
 *
 * Die Weltbank normiert ihre Dimensionen auf den weltweiten Mittelwert, null
 * ist also "Durchschnitt" und nicht "schlecht". Die Skala divergiert deshalb um
 * null statt hell nach dunkel zu laufen.
 *
 * Blau und Rot statt Gruen und Rot: die haeufigste Form der Farbenblindheit
 * trifft genau die Gruen-Rot-Achse, und diese Grafik hat keine zweite
 * Kodierung, an der man sich sonst festhalten koennte.
 *
 * Der Neutralton hat zwei Fassungen — im Dunkelmodus muss die Mitte dunkel
 * sein, sonst leuchten mittlere Werte staerker als gute.
 */
export const GOVERNANCE_DIVERGING = {
  hoch: [42, 120, 214],
  tief: [208, 59, 59],
  neutralHell: [240, 239, 236],
  neutralDunkel: [56, 56, 53],
} as const
