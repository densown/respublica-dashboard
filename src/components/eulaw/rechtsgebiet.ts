import type { I18nKey } from '../../design-system/i18n'

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
