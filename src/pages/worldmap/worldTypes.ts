export type WorldMapRow = {
  country_code: string
  country_name: string | null
  value: number | null
  region: string | null
  income_level: string | null
}

export type WorldCategoryApi = {
  id: string
  label_de: string
  label_en: string
  indicators: Array<{
    code: string
    name: string
    unit: string | null
    description_de: string | null
    description_en: string | null
  }>
}

export type WorldStats = {
  total_records: number
  countries: number
  indicators: number
  years_range: { min: number; max: number } | null
}

export type WorldCountryDetail = {
  country_code: string
  country_name: string
  region: string | null
  income_level: string | null
  indicators: Array<{
    indicator_code: string
    name: string
    category: string | null
    values: Array<{ year: number; value: number | null }>
  }>
}

export type WorldCompareResponse = {
  countries: Array<{
    code: string
    name: string
    data: Array<{ year: number; value: number | null }>
  }>
}

export type WorldGeoJsonFeature = {
  type: 'Feature'
  properties: { iso3: string; iso2?: string; name: string }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: unknown
  }
}

export type WorldGeoJson = {
  type: 'FeatureCollection'
  features: WorldGeoJsonFeature[]
}

export type WorldScatterRow = {
  country_code: string
  country_name: string
  region: string | null
  x: number
  y: number
}

export type WorldRankingRow = {
  country_code: string
  country_name: string
  /** World Bank region; fehlt sie, gilt der Eintrag nicht als sicherer Nationalstaat. */
  region?: string | null
  value: number
  rank: number
}

export type WorldTradeFlowPartnerRow = {
  partner_code: string
  partner_name: string
  value_usd: number
}

export type WorldTradeResponse = {
  iso3: string
  year: number
  total_export_usd: number | null
  total_import_usd: number | null
  top_exports: WorldTradeFlowPartnerRow[]
  top_imports: WorldTradeFlowPartnerRow[]
}
