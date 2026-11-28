import type { I18nKey } from '../../design-system/i18n'
import { NEUTRAL_FALLBACK, categorical } from '../../design-system/palettes'

/** Rechtsgebiete der EU-Rechtsakte. Der Wert kommt deutsch aus der API, die Anzeige uebersetzt. */
export const LEGAL_AREA_KEYS: { value: string; key: I18nKey }[] = [
  { value: 'Handel', key: 'euLawRgHandel' },
  { value: 'Energie', key: 'euLawRgEnergie' },
  { value: 'Gesundheit', key: 'euLawRgGesundheit' },
  { value: 'Umwelt', key: 'euLawRgUmwelt' },
  { value: 'Finanzen', key: 'euLawRgFinanzen' },
  { value: 'Verkehr', key: 'euLawRgVerkehr' },
  { value: 'Landwirtschaft', key: 'euLawRgLandwirtschaft' },
  { value: 'Digitales', key: 'euLawRgDigitales' },
  { value: 'Migration', key: 'euLawRgMigration' },
  { value: 'Justiz', key: 'euLawRgJustiz' },
  { value: 'Sonstiges', key: 'euLawRgSonstiges' },
]

/** Anzeigename eines Rechtsgebiets; unbekannte Werte bleiben wie geliefert. */
export function rechtsgebietLabel(wert: string, t: (k: I18nKey) => string): string {
  const v = wert.trim()
  const hit = LEGAL_AREA_KEYS.find((a) => a.value.toLowerCase() === v.toLowerCase())
  return hit ? t(hit.key) : v
}

/**
 * Farbmarke eines Rechtsgebiets: feste Stelle in der kategorialen Reihe, damit
 * "Energie" immer dieselbe Farbe hat. Nur als kleiner Punkt, nie als Flaeche.
 */
export function rechtsgebietFarbe(wert: string): string {
  const i = LEGAL_AREA_KEYS.findIndex((a) => a.value.toLowerCase() === wert.trim().toLowerCase())
  // Sonstiges und Unbekanntes grau, Rot (Stelle 0) bleibt dem Akzent vorbehalten
  if (i < 0 || LEGAL_AREA_KEYS[i].value === 'Sonstiges') return NEUTRAL_FALLBACK
  return categorical(i + 1)
}
