import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ProjectionToggle,
  type MapProjectionMode,
  useTheme,
} from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import type { WorldCategoryApi } from './worldTypes'
import type { FloatingWidgetType } from './WidgetDashboard'
import { worldIndicatorDisplayLabel } from './worldIndicatorShortNames'

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
  projection: MapProjectionMode
  onProjectionChange: (next: MapProjectionMode) => void
  projectionDisabled?: boolean
  projectionDisabledReason?: string
  visibleWidgets: Set<FloatingWidgetType>
  onToggleWidget: (type: FloatingWidgetType) => void
  /** Handy: nur Thema, Kennzahl und Jahr. Globus und Zusatzfenster bleiben dem Desktop. */
  narrow?: boolean
}

const WIDGET_MENU: { type: FloatingWidgetType; labelKey: I18nKey }[] = [
  { type: 'stat-card', labelKey: 'worldWidgetStatTrend' },
  { type: 'ranking', labelKey: 'worldWidgetRanking' },
  { type: 'trade-flow', labelKey: 'worldWidgetTradeFlows' },
  { type: 'bar-chart', labelKey: 'worldWidgetBarChart' },
  { type: 'sparkline', labelKey: 'worldWidgetSparkline' },
]

/**
 * Kopf der Weltkarte: erst das Thema, dann die Kennzahl und das Jahr.
 * Themen stehen als Textreiter mit Unterstrich wie die Unternavigation der
 * App, nicht mehr als rote Pillen in 9 Pixel Schrift.
 */
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
  projection,
  onProjectionChange,
  projectionDisabled = false,
  projectionDisabledReason,
  visibleWidgets,
  onToggleWidget,
  narrow = false,
}: MapTopbarProps) {
  const { c, t, lang } = useTheme()
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
  const feld = 44

  const stepperBtn: CSSProperties = {
    width: feld,
    height: feld,
    border: 'none',
    background: 'transparent',
    color: c.ink,
    fontFamily: fonts.body,
    fontSize: 20,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div
      style={{
        flexShrink: 0,
        background: c.bg,
        borderBottom: `1px solid ${c.border}`,
        zIndex: 50,
      }}
    >
      <div
        className="rp-ohne-scrollbalken"
        role="tablist"
        aria-label={t('worldTopbarTopics')}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          gap: spacing.lg,
          padding: `0 ${spacing.lg}px`,
          boxSizing: 'border-box',
          borderBottom: `1px solid ${c.border}`,
        }}
      >
        {categories.map((cat) => {
          const active = cat.id === activeCategory
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onCategoryChange(cat.id)}
              style={{
                flexShrink: 0,
                minHeight: feld,
                padding: 0,
                border: 'none',
                borderBottom: `2px solid ${active ? c.red : 'transparent'}`,
                background: 'transparent',
                fontFamily: fonts.body,
                fontSize: fontSize.md,
                fontWeight: active ? 600 : 400,
                color: active ? c.ink : c.muted,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {worldCategoryLabel(cat.id, t)}
            </button>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: `${spacing.sm}px ${spacing.lg}px`,
          boxSizing: 'border-box',
        }}
      >
        <select
          value={activeIndicatorCode}
          disabled={!indicators.length}
          onChange={(e) => onIndicatorCodeChange(e.target.value)}
          aria-label={t('worldIndicator')}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            maxWidth: 360,
            height: feld,
            fontFamily: fonts.body,
            fontSize: fontSize.base,
            fontWeight: 600,
            border: `1px solid ${c.border}`,
            background: c.cardBg,
            color: c.ink,
            padding: `0 ${spacing.md}px`,
            borderRadius: radius.md,
            boxSizing: 'border-box',
          }}
        >
          {indicators.map((ind) => (
            <option key={ind.code} value={ind.code} title={ind.name}>
              {worldIndicatorDisplayLabel(ind.code, lang, ind.name)}
            </option>
          ))}
        </select>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            border: `1px solid ${c.border}`,
            borderRadius: radius.md,
            background: c.cardBg,
          }}
        >
          <button
            type="button"
            style={{ ...stepperBtn, opacity: yearDisabled || year <= yearMin ? 0.35 : 1 }}
            disabled={yearDisabled || year <= yearMin}
            onClick={() => onYearChange(year - 1)}
            aria-label={t('worldYearStepPrev')}
          >
            ‹
          </button>
          <span
            style={{
              minWidth: 44,
              textAlign: 'center',
              fontFamily: fonts.mono,
              fontSize: fontSize.base,
              fontVariantNumeric: 'tabular-nums',
              color: c.ink,
            }}
            aria-label={t('worldTopbarYear')}
          >
            {year}
          </span>
          <button
            type="button"
            style={{ ...stepperBtn, opacity: yearDisabled || year >= yearMax ? 0.35 : 1 }}
            disabled={yearDisabled || year >= yearMax}
            onClick={() => onYearChange(year + 1)}
            aria-label={t('worldYearStepNext')}
          >
            ›
          </button>
        </div>

        {!narrow && (
          <>
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              {projectionDisabled ? null : (
                <ProjectionToggle
                  value={projection}
                  onChange={onProjectionChange}
                  disabled={projectionDisabled}
                  disabledReason={projectionDisabledReason}
                />
              )}
            </div>

            <div ref={menuWrapRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                type="button"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                style={{
                  height: feld,
                  padding: `0 ${spacing.md}px`,
                  border: `1px solid ${c.border}`,
                  background: 'transparent',
                  color: c.inkSoft,
                  fontFamily: fonts.body,
                  fontSize: fontSize.sm,
                  cursor: 'pointer',
                  borderRadius: radius.md,
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
                    borderRadius: radius.md,
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
                        onClick={() => onToggleWidget(type)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.sm,
                          width: '100%',
                          minHeight: 40,
                          textAlign: 'left',
                          padding: `0 ${spacing.lg}px`,
                          border: 'none',
                          background: 'transparent',
                          fontFamily: fonts.body,
                          fontSize: fontSize.md,
                          color: c.ink,
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span style={{ width: 14, flexShrink: 0, color: c.red }}>
                          {on ? '✓' : ''}
                        </span>
                        {t(labelKey)}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
