import type { WorldGeoJson } from './worldTypes'

/**
 * ISO-3166-1 alpha-2 (lowercase) für flagcdn; primär aus GeoJSON (iso2), sonst Fallback.
 */
export function iso3ToFlagIso2(
  iso3: string,
  geojson: WorldGeoJson | null,
): string | null {
  const u = iso3.trim().toUpperCase()
  if (u.length !== 3) return null
  if (geojson) {
    const f = geojson.features.find(
      (x) => x.properties.iso3?.trim().toUpperCase() === u,
    )
    const iso2 = f?.properties.iso2?.trim()
    if (iso2 && iso2.length === 2) return iso2.toLowerCase()
  }
  return ISO3_TO_ISO2_FALLBACK[u] ?? null
}

/** Wenige Ausnahmen falls Feature kein iso2 hat (sollte selten vorkommen). */
const ISO3_TO_ISO2_FALLBACK: Record<string, string> = {
  XKX: 'xk',
}
