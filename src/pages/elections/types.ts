export type ElectionType =
  | 'federal'
  | 'state'
  | 'municipal'
  | 'european'
  | 'mayoral'

export interface WahlenState {
  code: string
  name: string
}

export type { MapRow, MapRowFromApi } from './normalizeWahlen'

export interface RegionElectionRow {
  year: number
  typ: string
  turnout: number
  cdu_csu?: number
  spd?: number
  gruene?: number
  fdp?: number
  linke_pds?: number
  afd?: number
  bsw?: number
  freie_waehler?: number
  npd?: number
  piraten?: number
  die_partei?: number
  other?: number
  [key: string]: unknown
}

export interface RegionResponse {
  ags: string
  ags_name: string
  state_name: string
  elections: RegionElectionRow[]
}

export interface TimeSeriesPoint {
  year: number
  value: number
}

export interface CompareRegion {
  ags: string
  name: string
  data: TimeSeriesPoint[]
}

export interface CompareResponse {
  regions: CompareRegion[]
}

export interface ScatterRow {
  ags: string
  name: string
  state: string
  x: number
  y: number
}

export interface RankingRow {
  ags: string
  name: string
  value: number
  rank: number
  state?: string
}

export interface ChangeRow {
  ags: string
  name: string
  change: number
  value_from: number
  value_to: number
  state?: string
}

export interface WahlenStats {
  total_records: number
  types: Record<string, number>
  years_range: Record<string, [number, number]>
}

export type GeoJsonFeature = {
  type: 'Feature'
  properties: {
    ags: string
    name: string
    state: string
    districtType?: string
    kfz?: string
  }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export type KreiseGeoJson = {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

export interface PreparedPath {
  ags: string
  d: string
  statePrefix: string
}
