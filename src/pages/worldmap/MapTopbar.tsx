import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { fonts, spacing } from '../../design-system/tokens'
import type { WorldCategoryApi } from './worldTypes'
import type { FloatingWidgetType } from './WidgetDashboard'

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

export type MapTopbarIndicator = WorldCategoryApi['indicators'][number]

export type MapTopbarProps = {
  categories: WorldCategoryApi[]
  activeCategory: string
  onCategoryChange: (cat: string) => void
  indicators: MapTopbarIndicator[]
  activeIndicatorCode: string
  onIndicatorCodeChange: (code: string) => void
  year: number
  onYearChange: (year: number) => void
  yearMin: number
  yearMax: number
  visibleWidgets: Set<FloatingWidgetType>
  onToggleWidget: (type: FloatingWidgetType) => void
}

const WIDGET_MENU: { type: FloatingWidgetType; labelKey: I18nKey }[] = [
  { type: 'stat-card', labelKey: 'worldWidgetStatTrend' },
  { type: 'ranking', labelKey: 'worldWidgetRanking' },
  { type: 'trade-flow', labelKey: 'worldWidgetTradeFlows' },
  { type: 'bar-chart', labelKey: 'worldWidgetBarChart' },
  { type: 'sparkline', labelKey: 'worldWidgetSparkline' },
]

export default function MapTopbar({
  categories,
  activeCategory,
  onCategoryChange,
  indicators,
  activeIndicatorCode,
  onIndicatorCodeChange,
  year,
  onYearChange,
  yearMin,
  yearMax,
  visibleWidgets,
  onToggleWidget,
}: MapTopbarProps) {
  const { c, t } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const yearDisabled = yearMax <= yearMin

  const stepperBtnBase: CSSProperties = {
    width: 32,
    minHeight: 32,
    border: `1px solid ${c.border}`,
    background: 'transparent',
    color: c.ink,
    fontFamily: fonts.mono,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  }

  const onRowClick = useCallback(
    (type: FloatingWidgetType) => {
      onToggleWidget(type)
    },
    [onToggleWidget],
  )

  return (
    <div
      style={{
        flexShrink: 0,
        background: c.cardBg,
        borderBottom: `1px solid ${c.border}`,
        zIndex: 50,
      }}
    >
      <div
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          gap: spacing.xs,
          padding: `0 ${spacing.md}px`,
          boxSizing: 'border-box',
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
                flexShrink: 0,
                padding: '6px 14px',
                fontFamily: fonts.mono,
                fontSize: 9,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                borderRadius: 999,
                border: active ? 'none' : `1px solid ${c.border}`,
                background: active ? c.red : 'transparent',
                color: active ? '#fff' : c.muted,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = c.bgHover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = active ? c.red : 'transparent'
              }}
            >
              {worldCategoryLabel(cat.id, t)}
            </button>
          )
        })}
      </div>

      <div
        style={{
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: `${spacing.sm}px ${spacing.md}px`,
          boxSizing: 'border-box',
          flexWrap: 'wrap',
        }}
      >
        <select
          value={activeIndicatorCode}
          disabled={!indicators.length}
          onChange={(e) => onIndicatorCodeChange(e.target.value)}
          aria-label={t('worldIndicator')}
          style={{
            maxWidth: 320,
            flex: '1 1 160px',
            minWidth: 120,
            fontFamily: fonts.body,
            fontSize: 13,
            border: `1px solid ${c.border}`,
            background: c.bg,
            color: c.ink,
            padding: '8px 12px',
            borderRadius: 4,
            boxSizing: 'border-box',
          }}
        >
          {indicators.map((ind) => (
            <option key={ind.code} value={ind.code}>
              {ind.name}
            </option>
          ))}
        </select>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            style={stepperBtnBase}
            disabled={yearDisabled || year <= yearMin}
            onClick={() => onYearChange(year - 1)}
            aria-label={t('worldYearStepPrev')}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) e.currentTarget.style.background = c.bgHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            −
          </button>
          <span
            style={{
              minWidth: 48,
              textAlign: 'center',
              fontFamily: fonts.body,
              fontSize: 16,
              fontWeight: 600,
              color: c.ink,
            }}
            aria-label={t('worldTopbarYear')}
          >
            {year}
          </span>
          <button
            type="button"
            style={stepperBtnBase}
            disabled={yearDisabled || year >= yearMax}
            onClick={() => onYearChange(year + 1)}
            aria-label={t('worldYearStepNext')}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) e.currentTarget.style.background = c.bgHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            +
          </button>
        </div>

        <div ref={menuWrapRef} style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              padding: '8px 12px',
              border: `1px solid ${c.border}`,
              background: c.cardBg,
              color: c.ink,
              fontFamily: fonts.mono,
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            {t('worldTopbarAddWidget')}
          </button>
          {menuOpen ? (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                minWidth: 220,
                background: c.cardBg,
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                boxShadow: c.shadow,
                zIndex: 80,
                padding: `${spacing.xs}px 0`,
              }}
            >
              {WIDGET_MENU.map(({ type, labelKey }) => {
                const on = visibleWidgets.has(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onRowClick(type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      border: 'none',
                      background: 'transparent',
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: c.ink,
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
                    <span style={{ width: 14, flexShrink: 0, fontFamily: fonts.mono, fontSize: 12 }}>
                      {on ? '✓' : ''}
                    </span>
                    {t(labelKey)}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
