/** Typen fuer /api/wahltermine/* (Wahlen-Modul Phase 0). */

export type Quelle = {
  name: string
  url: string
  autor: string
  lizenz: string
  lizenz_url: string
}

export type Wahltermin = {
  slug: string
  ebene: 'bund' | 'land' | 'eu'
  land: string | null
  name_de: string
  name_en: string
  datum: string | null
  status: 'kommend' | 'laufend' | 'abgeschlossen'
  umfragen: number
  letzte_umfrage: string | null
}

/**
 * Eine Umfrage-Zeile. Die Partei-Werte liegen flach daneben (z.B. `spd: 29`),
 * genau so, wie recharts sie erwartet — die API liefert das bereits fertig.
 */
export type PollRow = {
  dawum_survey_id: number
  institut: string
  auftraggeber: string | null
  erhebung_start: string | null
  erhebung_ende: string | null
  veroeffentlicht: string
  befragte: number | null
  methode: string | null
  [partei: string]: number | string | null
}

export type WahlterminListResponse = {
  wahltermine: Wahltermin[]
  quelle: Quelle
}

export type PollsResponse = {
  wahl: Omit<Wahltermin, 'umfragen' | 'letzte_umfrage'>
  parteien: string[]
  institute: string[]
  umfragen: PollRow[]
  quelle: Quelle
}
