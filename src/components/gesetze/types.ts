export type Gesetz = {
  id: number
  kuerzel: string
  name: string
  datum: string
  zusammenfassung: string
  kontext: string | null
  bgbl_referenz: string | null
  poll_id?: string | number | null
  diff?: string | null
}

export type Urteil = {
  id: number
  doc_id: string
  gericht: string
  senat?: string | null
  typ?: string | null
  datum?: string | null
  aktenzeichen?: string | null
  ecli?: string | null
  leitsatz?: string | null
  tenor?: string | null
  zusammenfassung?: string | null
  auswirkung?: string | null
  rechtsgebiet?: string | null
  /** Oft erst nach GET /api/urteile/:id verfügbar */
  gesetze?: string[]
}

export type GesetzeStats = {
  gesetze_count: number
  aenderungen_count?: number
}
