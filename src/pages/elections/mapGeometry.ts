import { statePrefixFromAgs } from './partyColors'
import type { GeoJsonFeature, KreiseGeoJson, PreparedPath } from './types'

/** Fallback viewBox when `mapBuild` is not ready (linear DE map). */
export const MAP_VIEW_W = 600
export const MAP_VIEW_H = 800

const LON_MIN = 5.8
const LON_MAX = 15.1
const LAT_MIN = 47.2
const LAT_MAX = 55.1

const MAP_W = 600
const MAP_H = 800
const PAD = 15

export type StateBorderSegment = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function projectCoords(
  coords: number[][],
  lonMin: number,
  lonMax: number,
  latMin: number,
  latMax: number,
  width: number,
  height: number,
  padding: number,
): string {
  return coords
    .map(([lon, lat]) => {
      const x =
        padding + ((lon - lonMin) / (lonMax - lonMin)) * (width - 2 * padding)
      const y =
        padding + ((latMax - lat) / (latMax - latMin)) * (height - 2 * padding)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join('L')
}

export function featureToPath(
  feature: GeoJsonFeature,
  lonMin: number,
  lonMax: number,
  latMin: number,
  latMax: number,
  w: number,
  h: number,
  pad: number,
): string {
  const geom = feature.geometry
  const parts: string[] = []

  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) {
      parts.push(
        'M' +
          projectCoords(
            ring as number[][],
            lonMin,
            lonMax,
            latMin,
            latMax,
            w,
            h,
            pad,
          ) +
          'Z',
      )
    }
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      for (const ring of poly as number[][][]) {
        parts.push(
          'M' +
            projectCoords(
              ring,
              lonMin,
              lonMax,
              latMin,
              latMax,
              w,
              h,
              pad,
            ) +
            'Z',
        )
      }
    }
  }
  return parts.join('')
}

export type KreiseMapBuild = {
  prepared: PreparedPath[]
  borderSegments: StateBorderSegment[]
  width: number
  height: number
}

export function buildKreiseMap(geojson: KreiseGeoJson): KreiseMapBuild {
  const prepared: PreparedPath[] = []

  for (const f of geojson.features) {
    const d = featureToPath(
      f,
      LON_MIN,
      LON_MAX,
      LAT_MIN,
      LAT_MAX,
      MAP_W,
      MAP_H,
      PAD,
    )
    if (!d) continue
    prepared.push({
      ags: f.properties.ags,
      d,
      statePrefix: statePrefixFromAgs(f.properties.ags),
    })
  }

  return {
    prepared,
    borderSegments: [],
    width: MAP_W,
    height: MAP_H,
  }
}
