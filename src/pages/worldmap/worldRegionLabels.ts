import type { I18nKey } from '../../design-system/i18n'

/**
 * World-Bank-Region (API-String, ggf. historische / erweiterte Namen) → i18n-Key.
 */
export const WORLD_BANK_REGION_I18N_KEY: Record<string, I18nKey> = {
  'Sub-Saharan Africa': 'worldRegionSubSaharanAfrica',
  'Europe & Central Asia': 'worldRegionEuropeCentralAsia',
  'East Asia & Pacific': 'worldRegionEastAsiaPacific',
  'Middle East & North Africa': 'worldRegionMiddleEastNorthAfrica',
  'Middle East, North Africa, Afghanistan & Pakistan':
    'worldRegionMiddleEastNorthAfrica',
  'Latin America & Caribbean': 'worldRegionLatinAmericaCaribbean',
  'South Asia': 'worldRegionSouthAsia',
  'North America': 'worldRegionNorthAmerica',
}

export function worldBankRegionLabel(
  region: string | null | undefined,
  t: (key: I18nKey) => string,
): string {
  const raw = region?.trim()
  if (!raw) return t('worldRegionUnknown')
  const key = WORLD_BANK_REGION_I18N_KEY[raw]
  return key ? t(key) : raw
}
