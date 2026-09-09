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

/** Ergebnis einer Partei. `sitze*` sind null, wenn sie nicht eingezogen ist. */
export type ErgebnisPartei = {
  kuerzel: string
  prozent: number
  stimmen: number | null
  sitze: number | null
  sitze_direkt: number | null
  sitze_liste: number | null
}

/**
 * Amtliches Ergebnis. Null, solange die Wahl aussteht oder noch nichts
 * erfasst ist — das unterscheidet auf der Seite den Umfrage- vom Wahlabendmodus.
 */
export type Ergebnis = {
  status: 'vorlaeufig' | 'endgueltig'
  stand: string | null
  wahlbeteiligung: number | null
  sitze_gesamt: number | null
  quelle: { name: string | null; url: string | null }
  parteien: ErgebnisPartei[]
}

export type PollsResponse = {
  wahl: Omit<Wahltermin, 'umfragen' | 'letzte_umfrage'>
  parteien: string[]
  institute: string[]
  umfragen: PollRow[]
  ergebnis: Ergebnis | null
  quelle: Quelle
}
