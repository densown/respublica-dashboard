import type { WorldCategoryApi } from './worldTypes'

/**
 * Resolviert Kategorie, Einheit und Anzeigename für einen Indikator-Code.
 * Superset der zuvor in WorldMap.tsx und WidgetDashboard.tsx divergierten Kopien:
 * liefert zusätzlich `indicatorName` (Fallback: der Code selbst) und nutzt den
 * defensiveren `!categories?.length`-Guard (fängt auch ein leeres Array ab).
 */
export function categoryAndUnitForIndicator(
  categories: WorldCategoryApi[] | null,
  code: string,
): { category: string; unit: string | null; indicatorName: string } {
  if (!categories?.length) return { category: 'economy', unit: null, indicatorName: code }
  for (const cat of categories) {
    const hit = cat.indicators.find((i) => i.code === code)
    if (hit) return { category: cat.id, unit: hit.unit, indicatorName: hit.name }
  }
  return { category: 'economy', unit: null, indicatorName: code }
}
