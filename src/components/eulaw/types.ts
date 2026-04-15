export type EuTyp = 'REG' | 'DIR' | 'DEC' | 'REC' | 'OTHER'

export type EuLinkedGesetz = { id: number; kuerzel: string }

export type EuRechtListItem = {
  id: number
  celex: string
  titel_de: string | null
  titel_en: string | null
  typ: EuTyp | string
  typ_label: string | null
  datum: string | null
  in_kraft: string | null
  zusammenfassung_de: string | null
  zusammenfassung_en: string | null
  zusammenfassung: string | null
  rechtsgebiet: string | null
  eurlex_url: string | null
  linked_gesetze: EuLinkedGesetz[]
}

export type EuRechtListResponse = {
  total: number
  limit: number
  offset: number
  items: EuRechtListItem[]
}

export type EuRechtDetail = EuRechtListItem & {
  eurovoc_tags: unknown
}

export type EuRechtStats = {
  total: number
  by_typ: Array<{ typ: string; c: number }>
  by_rechtsgebiet: Array<{ rechtsgebiet: string; c: number }>
  latest_datum: string | null
  latest_created: string | null
}

export type EuUrteilLinkedRechtsakt = {
  link_id: number
  eu_rechtsakt_id: number | null
  rechtsakt_celex: string | null
  akt_celex: string | null
  titel_de: string | null
  titel_en: string | null
}

export type EuUrteilListItem = {
  id: number
  celex: string
  ecli: string | null
  gericht: string
  typ: string | null
  datum: string | null
  parteien: string | null
  betreff: string | null
  zusammenfassung_de: string | null
  zusammenfassung_en: string | null
  auswirkung_de: string | null
  auswirkung_en: string | null
  rechtsgebiet: string | null
  eurlex_url: string | null
  curia_url: string | null
}

export type EuUrteilListResponse = {
  total: number
  limit: number
  offset: number
  items: EuUrteilListItem[]
}

export type EuUrteilDetail = EuUrteilListItem & {
  keywords: string | null
  leitsatz: string | null
  created_at: string | null
  linked_rechtsakte: EuUrteilLinkedRechtsakt[]
}

export type EuUrteilStats = {
  total: number
  by_gericht: Array<{ gericht: string; c: number }>
  by_rechtsgebiet: Array<{ rechtsgebiet: string; c: number }>
  latest_datum: string | null
  latest_created: string | null
}
