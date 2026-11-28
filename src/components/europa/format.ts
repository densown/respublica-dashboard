import type { Position } from './typen'

export type Sprache = 'de' | 'en'
export type Einheit = 'ct' | 'eur'

const ort = (lang: Sprache) => (lang === 'de' ? 'de-DE' : 'en-GB')

/** Platzhalter `{name}` in einem uebersetzten Satz fuellen. */
export function fuelle(vorlage: string, werte: Record<string, string | number>): string {
  let s = vorlage
  for (const [k, v] of Object.entries(werte)) s = s.split(`{${k}}`).join(String(v))
  return s
}

export function zahl(n: number, lang: Sprache, stellen = 0): string {
  return n.toLocaleString(ort(lang), { minimumFractionDigits: stellen, maximumFractionDigits: stellen })
}

/** "2026-11-29" als "29.11.2026" oder "29/11/2026". */
export function datumKurz(iso: string, lang: Sprache): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(ort(lang), {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** "Samstag, 29. November". */
export function datumLang(iso: string, lang: Sprache): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(ort(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/** Der Kalendertag in Mitteleuropa, an dem der Strom geliefert wird. */
export function heuteInBerlin(jetzt = new Date()): string {
  return jetzt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
}

export function tagVerschieben(iso: string, tage: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
}

/**
 * Preis aus EUR/MWh in die gewaehlte Einheit. 10 EUR/MWh sind 1 ct/kWh.
 * ct/kWh mit einer Nachkommastelle, EUR/MWh ohne: genauer liest es niemand.
 */
export function preisWert(eurMwh: number, einheit: Einheit, lang: Sprache): string {
  const s = einheit === 'ct' ? zahl(eurMwh / 10, lang, 1) : zahl(eurMwh, lang, 0)
  // "-0" und "-0,0" sind keine Preise
  return /^-0([.,]0+)?$/.test(s) ? s.slice(1) : s
}

export function einheitWort(einheit: Einheit): string {
  return einheit === 'ct' ? 'ct/kWh' : '€/MWh'
}

/** Preis immer mit Einheit: "7,2 ct/kWh". */
export function preis(eurMwh: number, einheit: Einheit, lang: Sprache): string {
  return `${preisWert(eurMwh, einheit, lang)} ${einheitWort(einheit)}`
}

/** Stimme der Europa-API in der Schreibweise der Stimmfarben. */
export const STIMME = { ja: 'yes', nein: 'no', enthaltung: 'abstain', nicht: 'no_show' } as const satisfies Record<
  Position,
  string
>

const ISO2: Record<string, string> = {
  AUT: 'AT', BEL: 'BE', BGR: 'BG', HRV: 'HR', CYP: 'CY', CZE: 'CZ', DNK: 'DK', EST: 'EE', FIN: 'FI',
  FRA: 'FR', DEU: 'DE', GRC: 'GR', HUN: 'HU', IRL: 'IE', ITA: 'IT', LVA: 'LV', LTU: 'LT', LUX: 'LU',
  MLT: 'MT', NLD: 'NL', POL: 'PL', PRT: 'PT', ROU: 'RO', SVK: 'SK', SVN: 'SI', ESP: 'ES', SWE: 'SE',
}

/** Laendername aus dem dreistelligen Code, in der Sprache der Seite. */
export function landName(iso3: string, lang: Sprache): string {
  const kurz = ISO2[iso3]
  if (!kurz) return iso3
  try {
    return new Intl.DisplayNames([ort(lang)], { type: 'region' }).of(kurz) ?? iso3
  } catch {
    return iso3
  }
}
