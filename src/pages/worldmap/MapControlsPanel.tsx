import { useMemo, type CSSProperties } from 'react'
import MonoLabel from '../../design-system/components/MonoLabel'
import SectionDivider from '../../design-system/components/SectionDivider'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { fonts, spacing } from '../../design-system/tokens'
import type { WorldCategoryApi } from './worldTypes'

const WORLD_CAT_I18N: Record<string, I18nKey> = {
  population: 'worldCat_population',
  economy: 'worldCat_economy',
  health: 'worldCat_health',
  education: 'worldCat_education',
  governance: 'worldCat_governance',
  trade: 'worldCat_trade',
  military: 'worldCat_military',
  security: 'worldCat_security',
  technology: 'worldCat_technology',
  environment: 'worldCat_environment',
  inequality: 'worldCat_inequality',
  democracy: 'worldCat_democracy',
}

function worldCategoryLabel(id: string, t: (key: I18nKey) => string): string {
  const k = WORLD_CAT_I18N[id]
  return k ? t(k) : id
}

export type MapControlsPanelProps = {
  categories: WorldCategoryApi[]
  activeCategory: string
  onCategoryChange: (cat: string) => void
  activeIndicator: string
  onIndicatorChange: (ind: string) => void
  year: number
  onYearChange: (year: number) => void
  yearMin: number
  yearMax: number
}

export default function MapControlsPanel({
  categories,
  activeCategory,
  onCategoryChange,
  activeIndicator,
  onIndicatorChange,
  year,
  onYearChange,
  yearMin,
  yearMax,
}: MapControlsPanelProps) {
  const { c, t } = useTheme()

  const activeIndicators = useMemo(() => {
    const cat = categories.find((x) => x.id === activeCategory)
    return cat?.indicators ?? []
  }, [categories, activeCategory])

  const stepBtnStyle: CSSProperties = useMemo(
    () => ({
      minWidth: 44,
      minHeight: 44,
      borderRadius: 8,
      border: `1px solid ${c.border}`,
      background: c.cardBg,
      color: c.text,
      fontFamily: fonts.mono,
      fontSize: '1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    [c.border, c.cardBg, c.text],
  )

  const yearDisabled = yearMax <= yearMin

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      <MonoLabel style={{ marginBottom: spacing.sm }}>{t('worldMapControlsCategoryMono')}</MonoLabel>
      <div
        style={{
          maxHeight: 200,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          marginBottom: spacing.sm,
        }}
      >
        {categories.map((cat) => {
          const active = cat.id === activeCategory
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                minHeight: 44,
                padding: `${spacing.sm}px ${spacing.md}px`,
                paddingLeft: spacing.md,
                border: 'none',
                borderLeft: `3px solid ${active ? c.red : 'transparent'}`,
                background: 'transparent',
                color: active ? c.red : c.ink,
                fontFamily: fonts.mono,
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = c.bgHover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {worldCategoryLabel(cat.id, t)}
            </button>
          )
        })}
      </div>

      <SectionDivider label="" style={{ margin: `${spacing.md}px 0` }} />

      <MonoLabel style={{ marginBottom: spacing.sm }}>{t('worldMapControlsIndicatorMono')}</MonoLabel>
      <div
        style={{
          maxHeight: 220,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          marginBottom: spacing.sm,
        }}
      >
        {activeIndicators.map((ind) => {
          const active = ind.code === activeIndicator
          return (
            <button
              key={ind.code}
              type="button"
              onClick={() => onIndicatorChange(ind.code)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: spacing.sm,
                width: '100%',
                textAlign: 'left',
                minHeight: 44,
                padding: `${spacing.sm}px ${spacing.md}px`,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = c.bgHover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  marginTop: 5,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: active ? c.red : 'transparent',
                }}
                aria-hidden
              />
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  lineHeight: 1.35,
                  color: active ? c.red : c.ink,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {ind.name}
              </span>
            </button>
          )
        })}
      </div>

      <SectionDivider label="" style={{ margin: `${spacing.md}px 0` }} />

      <MonoLabel style={{ marginBottom: spacing.sm }}>{t('worldMapControlsYearMono')}</MonoLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <button
          type="button"
          style={stepBtnStyle}
          disabled={yearDisabled || year <= yearMin}
          onClick={() => onYearChange(year - 1)}
          aria-label={t('worldYearStepPrev')}
        >
          −
        </button>
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: fonts.body,
            fontSize: 24,
            fontWeight: 600,
            color: c.ink,
            lineHeight: 1.2,
          }}
        >
          {year}
        </span>
        <button
          type="button"
          style={stepBtnStyle}
          disabled={yearDisabled || year >= yearMax}
          onClick={() => onYearChange(year + 1)}
          aria-label={t('worldYearStepNext')}
        >
          +
        </button>
      </div>
    </div>
  )
}
