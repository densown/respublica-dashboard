import type { I18nKey } from '../../design-system/i18n'
import type { EpArt } from './typen'

/** Arten von Abstimmungen im EU-Parlament und ihre Textschluessel. */
export const EP_ARTEN: EpArt[] = ['text', 'einigung', 'ablehnungsantrag', 'verhandlungsmandat', 'dringlichkeit']
export const artWort = (art: EpArt) => `epArt_${art}` as I18nKey
export const artErklaerung = (art: EpArt) => `epErkl_${art}` as I18nKey
