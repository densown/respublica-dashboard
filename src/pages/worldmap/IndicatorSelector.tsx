import { useEffect, useMemo, type ReactNode } from 'react'
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: narrow ? 'column' : 'row',
        flexWrap: narrow ? 'nowrap' : 'wrap',
        gap: narrow ? spacing.md : spacing.lg,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        alignItems: narrow ? 'stretch' : 'flex-end',
      }}
    >
      <label style={{ flex: narrow ? '1 1 auto' : '1 1 200px', minWidth: 0 }}>
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
      <label style={{ flex: narrow ? '1 1 auto' : '2 1 320px', minWidth: 0 }}>
        {labelSpan(t('worldIndicator'))}
        <select
          style={{
            ...sel,
            width: '100%',
            maxWidth: narrow ? '100%' : 350,
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
    </div>
  )
}
