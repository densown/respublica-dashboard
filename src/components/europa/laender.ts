import type { Kennzahl } from './typen'
import { zahl, type Sprache } from './format'

/**
 * Feste Angaben zu den Laendern mit eigener Seite: EU-27, dazu Norwegen und
 * die Schweiz, weil fuer sie Strompreise vorliegen. Beitritt, Euro und
 * Schengen aendern sich selten und stehen deshalb hier und nicht in der
 * Datenbank. Stand: November 2026.
 */
export type Land = {
  iso2: string
  iso3: string
  hauptstadt: { de: string; en: string }
  /** Jahr des EU-Beitritts, null fuer Nichtmitglieder. */
  beitritt: number | null
  /** Jahr der Euro-Einfuehrung, null ohne Euro. */
  euro: number | null
  schengen: boolean
  /** Gebotszonen, fuer die Preise unter freier Lizenz vorliegen. */
  zonen: string[]
}

const l = (
  iso2: string,
  iso3: string,
  de: string,
  en: string,
  beitritt: number | null,
  euro: number | null,
  schengen: boolean,
  zonen: string[] = [],
): Land => ({ iso2, iso3, hauptstadt: { de, en }, beitritt, euro, schengen, zonen })

export const LAENDER: Land[] = [
  l('AT', 'AUT', 'Wien', 'Vienna', 1995, 1999, true, ['AT']),
  l('BE', 'BEL', 'Brüssel', 'Brussels', 1958, 1999, true, ['BE']),
  l('BG', 'BGR', 'Sofia', 'Sofia', 2007, 2026, true),
  l('HR', 'HRV', 'Zagreb', 'Zagreb', 2013, 2023, true),
  l('CY', 'CYP', 'Nikosia', 'Nicosia', 2004, 2008, false),
  l('CZ', 'CZE', 'Prag', 'Prague', 2004, null, true, ['CZ']),
  l('DK', 'DNK', 'Kopenhagen', 'Copenhagen', 1973, null, true, ['DK1', 'DK2']),
  l('EE', 'EST', 'Tallinn', 'Tallinn', 2004, 2011, true),
  l('FI', 'FIN', 'Helsinki', 'Helsinki', 1995, 1999, true),
  l('FR', 'FRA', 'Paris', 'Paris', 1958, 1999, true, ['FR']),
  l('DE', 'DEU', 'Berlin', 'Berlin', 1958, 1999, true, ['DE-LU']),
  l('GR', 'GRC', 'Athen', 'Athens', 1981, 2001, true),
  l('HU', 'HUN', 'Budapest', 'Budapest', 2004, null, true, ['HU']),
  l('IE', 'IRL', 'Dublin', 'Dublin', 1973, 1999, false),
  l('IT', 'ITA', 'Rom', 'Rome', 1958, 1999, true, ['IT-N']),
  l('LV', 'LVA', 'Riga', 'Riga', 2004, 2014, true),
  l('LT', 'LTU', 'Vilnius', 'Vilnius', 2004, 2015, true),
  l('LU', 'LUX', 'Luxemburg', 'Luxembourg', 1958, 1999, true, ['DE-LU']),
  l('MT', 'MLT', 'Valletta', 'Valletta', 2004, 2008, true),
  l('NL', 'NLD', 'Amsterdam', 'Amsterdam', 1958, 1999, true, ['NL']),
  l('PL', 'POL', 'Warschau', 'Warsaw', 2004, null, true, ['PL']),
  l('PT', 'PRT', 'Lissabon', 'Lisbon', 1986, 1999, true),
  l('RO', 'ROU', 'Bukarest', 'Bucharest', 2007, null, true),
  l('SK', 'SVK', 'Bratislava', 'Bratislava', 2004, 2009, true),
  l('SI', 'SVN', 'Ljubljana', 'Ljubljana', 2004, 2007, true, ['SI']),
  l('ES', 'ESP', 'Madrid', 'Madrid', 1986, 1999, true),
  l('SE', 'SWE', 'Stockholm', 'Stockholm', 1995, null, true, ['SE4']),
  l('NO', 'NOR', 'Oslo', 'Oslo', null, null, true, ['NO2']),
  l('CH', 'CHE', 'Bern', 'Bern', null, null, true, ['CH']),
]

const NACH_ISO2 = new Map(LAENDER.map((x) => [x.iso2, x]))
export const landVon = (iso2: string | undefined) => NACH_ISO2.get((iso2 ?? '').toUpperCase())

/** Laendername in der Sprache der Seite. */
export function landNameIso2(iso2: string, lang: Sprache): string {
  try {
    return new Intl.DisplayNames([lang === 'de' ? 'de-DE' : 'en-GB'], { type: 'region' }).of(iso2) ?? iso2
  } catch {
    return iso2
  }
}

/** Alle Laender mit Seite, nach Namen sortiert. */
export function laenderSortiert(lang: Sprache): (Land & { name: string })[] {
  return LAENDER.map((x) => ({ ...x, name: landNameIso2(x.iso2, lang) })).sort((a, b) => a.name.localeCompare(b.name, lang))
}

export const landPfad = (iso2: string) => `/europa/land/${iso2.toLowerCase()}`

/** Zahl einer Kennzahl ohne Einheit, fuer Skalenwerte und Tabellen: "83,5". */
export function kennzahlZahl(k: Pick<Kennzahl, 'code' | 'stellen'>, wert: number, lang: Sprache): string {
  if (k.code === 'SP.POP.TOTL') return zahl(wert / 1e6, lang, 1)
  const stellen = Math.min(2, Math.max(0, k.stellen ?? 1))
  return zahl(wert, lang, k.code === 'NY.GDP.PCAP.CD' ? 0 : stellen)
}

/** Einheit einer Kennzahl, wie sie hinter der Zahl steht: "Mio.", "%". Leer, wenn es keine gibt. */
export function kennzahlEinheit(k: Pick<Kennzahl, 'code' | 'einheit'>, lang: Sprache): string {
  if (k.code === 'SP.POP.TOTL') return lang === 'de' ? 'Mio.' : 'm'
  return (k.einheit ?? '').trim()
}

/** Wert einer Kennzahl mit Einheit, etwa "83,5 Mio." oder "4,2 %". */
export function kennzahlText(k: Pick<Kennzahl, 'code' | 'einheit' | 'stellen'>, wert: number, lang: Sprache): string {
  const einheit = kennzahlEinheit(k, lang)
  const n = kennzahlZahl(k, wert, lang)
  return einheit ? `${n} ${einheit}` : n
}

export const ZEITRAEUME = [30, 90, 365] as const

/**
 * Welche Zeitraeume etwas zeigen. Ein laengerer Zeitraum ist nur sinnvoll,
 * wenn die Daten weiter zurueckreichen als der naechstkuerzere. Ohne Angabe
 * zur Spanne (aeltere API) gelten alle.
 */
export function zeitraumStand(seit: string | null | undefined, bis: string | null | undefined, gewaehlt: number) {
  const spanne =
    seit && bis ? Math.round((Date.parse(`${bis}T00:00:00Z`) - Date.parse(`${seit}T00:00:00Z`)) / 86_400_000) + 1 : null
  const moeglich = ZEITRAEUME.filter((_, i) => spanne == null || i === 0 || spanne > ZEITRAEUME[i - 1])
  const wirksam = moeglich.includes(gewaehlt as (typeof ZEITRAEUME)[number]) ? gewaehlt : moeglich[moeglich.length - 1]
  return { spanne, moeglich: moeglich as readonly number[], wirksam, verkuerzt: moeglich.length < ZEITRAEUME.length }
}
