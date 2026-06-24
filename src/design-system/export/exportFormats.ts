import type { I18nKey } from '../i18n'

export type ExportFormat = 'social' | 'academic' | 'presentation'

export type FooterStyle = 'branded' | 'citation' | 'minimal'

export type FormatPreset = {
  key: ExportFormat
  labelKey: I18nKey
  width: number
  height: number | 'auto'
  pixelRatio: number
  header: boolean
  footer: { height: number; style: FooterStyle }
  filenameSuffix: string
}

export const FORMAT_PRESETS: Record<ExportFormat, FormatPreset> = {
  social: {
    key: 'social',
    labelKey: 'exportSocial',
    width: 1200,
    height: 675,
    pixelRatio: 2,
    header: false,
    footer: { height: 60, style: 'branded' },
    filenameSuffix: 'social',
  },
  academic: {
    key: 'academic',
    labelKey: 'exportAcademic',
    width: 1200,
    height: 'auto',
    pixelRatio: 3,
    header: false,
    footer: { height: 48, style: 'citation' },
    filenameSuffix: 'wissenschaft',
  },
  presentation: {
    key: 'presentation',
    labelKey: 'exportPresentation',
    width: 1920,
    height: 1080,
    pixelRatio: 1,
    header: true,
    footer: { height: 32, style: 'minimal' },
    filenameSuffix: 'slides',
  },
} as const
