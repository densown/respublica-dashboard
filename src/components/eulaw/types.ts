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
