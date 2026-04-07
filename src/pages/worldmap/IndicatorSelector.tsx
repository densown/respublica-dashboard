import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { useTheme } from '../../design-system'
import type { Lang } from '../../design-system/ThemeContext'
import { spacing } from '../../design-system/tokens'
import type { WorldCategoryApi } from './worldTypes'
import {
  worldIndicatorLongTitle,
  worldIndicatorShortLabel,
} from './worldIndicatorShortNames'

type IndicatorSelectorProps = {
  categories: WorldCategoryApi[] | null
  categoryId: string
  indicatorCode: string
  onCategoryId: (id: string) => void
  onIndicatorCode: (code: string) => void
  lang: Lang
  disabled?: boolean
  narrow: boolean
  selectCss: () => React.CSSProperties
  labelSpan: (text: string) => ReactNode
  /**
   * Zwei Raster-Zellen (Kategorie + Indikator) ohne äußeren Flex-Container —
   * für WorldMapMode-Filtergitter neben Jahr/Suche.
   */
  asGridCells?: boolean
  /** Kleinere Abstände in Filterzeilen */
  compact?: boolean
}

export function IndicatorSelector({
  categories,
  categoryId,
  indicatorCode,
  onCategoryId,
  onIndicatorCode,
  lang,
  disabled,
  narrow,
  selectCss,
  labelSpan,
  asGridCells,
  compact,
}: IndicatorSelectorProps) {
  const { t } = useTheme()

  const cat = useMemo(
    () => categories?.find((x) => x.id === categoryId) ?? categories?.[0],
    [categories, categoryId],
  )

  const indicators = cat?.indicators ?? []

  useEffect(() => {
    if (!categories?.length) return
    const exists = categories.some((x) => x.id === categoryId)
    if (!exists) onCategoryId(categories[0]!.id)
  }, [categories, categoryId, onCategoryId])

  useEffect(() => {
    if (!indicators.length) return
    const ok = indicators.some((i) => i.code === indicatorCode)
    if (!ok) onIndicatorCode(indicators[0]!.code)
  }, [indicators, indicatorCode, onIndicatorCode])

  const sel = selectCss()
  const gap = compact ? spacing.sm : narrow ? spacing.md : spacing.lg
  const cellStyle: CSSProperties = { minWidth: 0 }

  const categoryBlock = (
    <label style={{ ...cellStyle, display: 'block' }}>
      {labelSpan(t('worldCategory'))}
      <select
        style={sel}
        value={cat?.id ?? ''}
        disabled={disabled || !categories?.length}
        onChange={(e) => onCategoryId(e.target.value)}
      >
        {(categories ?? []).map((x) => (
          <option key={x.id} value={x.id}>
            {lang === 'de' ? x.label_de : x.label_en}
          </option>
        ))}
      </select>
    </label>
  )

  const indicatorBlock = (
    <label style={{ ...cellStyle, display: 'block' }}>
      {labelSpan(t('worldIndicator'))}
      <select
        style={{
          ...sel,
          width: '100%',
          maxWidth: '100%',
        }}
        value={indicatorCode}
        disabled={disabled || !indicators.length}
        onChange={(e) => onIndicatorCode(e.target.value)}
      >
        {indicators.map((row) => (
          <option
            key={row.code}
            value={row.code}
            title={worldIndicatorLongTitle(row, lang)}
          >
            {worldIndicatorShortLabel(row.code, lang)}
          </option>
        ))}
      </select>
    </label>
  )

  if (asGridCells) {
    return (
      <>
        {categoryBlock}
        {indicatorBlock}
      </>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: narrow ? 'column' : 'row',
        flexWrap: narrow ? 'nowrap' : 'wrap',
        gap,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        alignItems: narrow ? 'stretch' : 'flex-end',
      }}
    >
      <div style={{ flex: narrow ? '1 1 auto' : '1 1 200px', minWidth: 0 }}>
        {categoryBlock}
      </div>
      <div style={{ flex: narrow ? '1 1 auto' : '2 1 320px', minWidth: 0 }}>
        {indicatorBlock}
      </div>
    </div>
  )
}
