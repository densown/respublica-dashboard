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
