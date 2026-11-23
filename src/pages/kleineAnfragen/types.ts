/** Antworten von /api/kleine-anfragen* (respublica-api, Migration 021). */

export type Kernzahl = {
  wert: string
  einheit: string
  bedeutung: string
  /** Wörtlicher Ausschnitt aus der Antwort, gegen den Volltext geprüft */
  zitat: string
}

export type Antwort = {
  id: number
  dokumentnummer: string
  wahlperiode: number
  datum: string
  titel: string
  frage_dokumentnummer: string | null
  fraktion: string | null
  fraktion_name: string | null
  fragesteller: string[]
  /** Fragesteller mit Abgeordnetenwatch-ID, wenn der Name eindeutig zu einem MdB passt */
  fragesteller_mdb?: { name: string; aw_id: number | null }[]
  ressort: string | null
  sachgebiete: string[]
  einzelfragen: number | null
  pdf_url: string | null
  dip_url: string | null
  volltext_vorhanden: boolean
  nicht_erhoben: number
  hat_anlage: boolean
  eingestuft: boolean
  ausgewertet: boolean
  schlagzeile: string | null
  zusammenfassung: string | null
  zusammenfassung_en: string | null
  kernzahlen: Kernzahl[]
  story_wert: number | null
  story_grund: string | null
  ausgewertet_am: string | null
  /** Ausschnitt um den ersten Suchtreffer im Volltext, nur bei Suche */
  treffer?: string
}

export type ListeResponse = {
  total: number
  limit: number
  offset: number
  sort: 'datum' | 'wert' | 'relevanz'
  hinweis: string
  quelle: { name: string; url: string }
  /** Nur bei ?abgeordneter= */
  abgeordneter?: { aw_id: number; name: string; fraktion: string | null }
  daten: Antwort[]
}

export type WocheResponse = {
  tage: number
  neu: number
  hinweis: string
  daten: Antwort[]
}

export type FacettenResponse = {
  gesamt: number
  ausgewertet: number
  zeitraum: { von: string | null; bis: string | null }
  fraktionen: { fraktion: string; name: string; anzahl: number }[]
  ressorts: { ressort: string; anzahl: number }[]
  sachgebiete: { sachgebiet: string; anzahl: number }[]
  quelle: { name: string; url: string }
}

/** Ressortnamen kürzen: "Bundesministerium des Innern" -> "BM des Innern" */
export function ressortKurz(r: string | null): string {
  if (!r) return ''
  return r.replace(/^Bundesministerium/, 'BM').replace(/^Beauftragte(r)? der Bundesregierung für/, 'Beauftr. für')
}
