/** Typen für /api/governance/* (Worldwide Governance Indicators). */

export type Dimension = {
  code: string
  name_de: string
  name_en: string
  von: number
  bis: number
  laender: number
}

export type DimensionenResponse = {
  dimensionen: Dimension[]
  skala: { min: number; max: number }
  quelle: { name: string; herausgeber: string; url: string }
}

export type LandVerlauf = {
  iso3: string
  name_de: string
  name_en: string
  jahre: number[]
  werte: number[]
  /** Veränderung im Bezugsfenster — dasselbe, nach dem sortiert wurde. */
  veraenderung: number | null
  /** Veränderung über die volle Reihe, damit beide Lesarten sichtbar sind. */
  veraenderung_gesamt: number | null
}

export type VerlaufResponse = {
  dimension: string
  seit: number
  laender: LandVerlauf[]
}

export type DimensionsDelta = { von: number; bis: number; delta: number }

export type LandVeraenderung = {
  iso3: string
  name_de: string
  name_en: string
  dimensionen: Record<string, DimensionsDelta>
}

export type VeraenderungResponse = {
  von: number
  bis: number
  reihenfolge: string[]
  laender: LandVeraenderung[]
}

export type BandId = 'sehr_niedrig' | 'niedrig' | 'mittel' | 'hoch'

export type HandelJahr = {
  jahr: number
  gesamt_usd: number
  baender: Record<BandId, { usd: number; prozent: number }>
}

export type HandelResponse = {
  land: string
  richtung: 'import' | 'export'
  dimension: string
  bewertungsjahr: number
  baender: BandId[]
  jahre: HandelJahr[]
  groesste_partner_unter_mittel: {
    iso3: string
    name_de: string
    name_en: string
    wert_usd: number
    bewertung: number
    band: BandId
  }[]
}
