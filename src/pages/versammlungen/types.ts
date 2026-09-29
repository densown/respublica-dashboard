// Antworten von /api/versammlungen* (respublica-api, api/routes/versammlungen.js)

export type Zaehler = { versammlungstage: number; versammlungen: number }

export type Abdeckung = {
  quelle: string
  land: string
  stadt: string
  von: string
  /** null = laufend */
  bis: string | null
  name: string
  url: string | null
  lizenz: string | null
  hinweis: string | null
}

export type StatsResponse = {
  zeitraum: { von: string | null; bis: string | null }
  versammlungen: number
  versammlungstage: number
  serien: number
  kommend: number
  letzter_abruf: string | null
  kategorien: ({ kategorie: string } & Zaehler)[]
  pro_monat: ({ monat: string } & Zaehler)[]
  pro_woche: ({ woche: string } & Zaehler)[]
  wochentag_stunde: { wochentag: number; stunde: number; anzahl: number }[]
  abdeckung: Abdeckung[]
}

export type Serie = {
  id: string
  von: string | null
  bis: string | null
  rhythmus: string | null
  termine?: number
}

export type Versammlung = {
  id: number
  datum: string
  von: string | null
  bis: string | null
  ganztaegig: boolean
  thema: string | null
  plz: string | null
  ort: string | null
  typ: 'kundgebung' | 'aufzug' | null
  kategorie: string | null
  status: string
  serie: Serie | null
}

export type ListResponse = {
  total: number
  limit: number
  offset: number
  items: Versammlung[]
}

export const KATEGORIEN = [
  'internationales',
  'klima_umwelt',
  'arbeit_soziales',
  'gegen_rechts',
  'frieden_militaer',
  'verkehr',
  'gesundheit',
  'wohnen_stadt',
  'gedenken',
  'tierschutz',
  'grundrechte_digitales',
  'ukraine_russland',
  'migration_asyl',
  'gleichstellung_queer',
  'religion',
  'nahost',
  'landwirtschaft',
  'bildung_wissenschaft',
  'sonstiges',
] as const

export type Mass = 'versammlungen' | 'versammlungstage'
