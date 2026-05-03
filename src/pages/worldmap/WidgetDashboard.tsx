import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import ReactGridLayout, {
  WidthProvider,
  type Layout,
  type LayoutItem,
} from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { fonts, spacing } from '../../design-system/tokens'
import './widgetDashboard.css'

export type WidgetType =
  | 'map'
  | 'ranking'
  | 'stat-card'
  | 'bar-chart'
  | 'trade-flow'
  | 'sparkline'

const LS_KEY = 'rp-widget-layout-v1'

const ALL_WIDGET_TYPES: WidgetType[] = [
  'map',
  'ranking',
  'stat-card',
  'bar-chart',
  'trade-flow',
  'sparkline',
]

const MOBILE_STACK_ORDER: WidgetType[] = [
  'map',
  'ranking',
  'stat-card',
  'bar-chart',
  'trade-flow',
  'sparkline',
]

/** Standard-Layout Desktop, 12 Spalten */
export const DEFAULT_WIDGET_LAYOUT: Layout = [
  { i: 'map', x: 0, y: 0, w: 8, h: 8, minW: 4, minH: 4 },
  { i: 'ranking', x: 8, y: 0, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'stat-card', x: 8, y: 4, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'bar-chart', x: 0, y: 8, w: 6, h: 4, minW: 3, minH: 2 },
  { i: 'trade-flow', x: 6, y: 8, w: 6, h: 4, minW: 3, minH: 2 },
  { i: 'sparkline', x: 0, y: 12, w: 12, h: 3, minW: 4, minH: 2 },
]

const GridWithWidth = WidthProvider(ReactGridLayout)

const WIDGET_TITLE_KEYS: Record<WidgetType, I18nKey> = {
  map: 'worldWidgetMap',
  ranking: 'worldWidgetRanking',
  'stat-card': 'worldWidgetStatCard',
  'bar-chart': 'worldWidgetBarChart',
  'trade-flow': 'worldWidgetTradeFlow',
  sparkline: 'worldWidgetSparkline',
}

const WIDGET_INFO_KEYS: Record<WidgetType, I18nKey> = {
  map: 'worldWidgetInfoMap',
  ranking: 'worldWidgetInfoRanking',
  'stat-card': 'worldWidgetInfoStatCard',
  'bar-chart': 'worldWidgetInfoBarChart',
  'trade-flow': 'worldWidgetInfoTradeFlow',
  sparkline: 'worldWidgetInfoSparkline',
}

function isWidgetType(s: string): s is WidgetType {
  return (ALL_WIDGET_TYPES as string[]).includes(s)
}

function parseStoredLayout(): Layout | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { layout?: unknown }
    if (!Array.isArray(data.layout)) return null
    const out: LayoutItem[] = []
    for (const row of data.layout) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      const i = o.i
      if (typeof i !== 'string' || !isWidgetType(i)) continue
      const x = Number(o.x)
      const y = Number(o.y)
      const w = Number(o.w)
      const h = Number(o.h)
      if ([x, y, w, h].some((n) => !Number.isFinite(n))) continue
      out.push({
        i,
        x,
        y,
        w,
        h,
        minW: typeof o.minW === 'number' ? o.minW : undefined,
        minH: typeof o.minH === 'number' ? o.minH : undefined,
      })
    }
    return out.length ? (out as Layout) : null
  } catch {
    return null
  }
}

function persistLayout(layout: Layout) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ layout }))
  } catch {
    /* ignore */
  }
}

function defaultItemFor(id: WidgetType): LayoutItem {
  const hit = DEFAULT_WIDGET_LAYOUT.find((x) => x.i === id)
  return hit
    ? { ...hit }
    : { i: id, x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 }
}

export type WidgetShellProps = {
  title: string
  onClose: () => void
  infoText: string
  children: ReactNode
}

export function WidgetShell({ title, onClose, infoText, children }: WidgetShellProps) {
  const { c, t } = useTheme()
  const [infoOpen, setInfoOpen] = useState(false)
  const infoWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!infoOpen) return
    const close = (e: MouseEvent) => {
      if (!infoWrapRef.current?.contains(e.target as Node)) {
        setInfoOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [infoOpen])

  const shellStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    minWidth: 0,
    background: c.cardBg,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    overflow: 'hidden',
    boxSizing: 'border-box',
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderBottom: `1px solid ${c.border}`,
    flexShrink: 0,
    minHeight: 44,
  }

  const btnReset: CSSProperties = {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: c.muted,
    borderRadius: 6,
  }

  return (
    <div style={shellStyle}>
      <div style={headerStyle}>
        <h2
          style={{
            margin: 0,
            flex: 1,
            minWidth: 0,
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: c.text,
            lineHeight: 1.25,
          }}
        >
          {title}
        </h2>
        <div ref={infoWrapRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            className="widget-no-drag"
            aria-expanded={infoOpen}
            aria-label={infoText}
            onClick={() => setInfoOpen((v) => !v)}
            style={btnReset}
          >
            ⓘ
          </button>
          {infoOpen ? (
            <div
              role="tooltip"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                maxWidth: 280,
                padding: spacing.md,
                borderRadius: 8,
                background: c.surface,
                border: `1px solid ${c.border}`,
                boxShadow: c.shadow,
                fontFamily: fonts.body,
                fontSize: '0.82rem',
                lineHeight: 1.45,
                color: c.text,
                zIndex: 50,
              }}
            >
              {infoText}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="widget-no-drag"
          aria-label={t('worldWidgetClose')}
          onClick={onClose}
          style={btnReset}
        >
          ×
        </button>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function PlaceholderBody({
  selectedCountry,
  indicatorCode,
}: {
  selectedCountry: string | null
  indicatorCode: string
}) {
  const { c, t } = useTheme()
  return (
    <div
      style={{
        flex: 1,
        minHeight: 120,
        padding: spacing.md,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: spacing.sm,
        fontFamily: fonts.body,
        fontSize: '0.88rem',
        color: c.muted,
      }}
    >
      <p style={{ margin: 0 }}>{t('worldWidgetPlaceholderBody')}</p>
      <p style={{ margin: 0, fontFamily: fonts.mono, fontSize: '0.72rem' }}>
        {indicatorCode}
        {selectedCountry ? ` · ${selectedCountry}` : ''}
      </p>
    </div>
  )
}

export type WidgetDashboardProps = {
  narrow: boolean
  selectedCountry: string | null
  indicatorCode: string
  mapSlot: ReactNode
}

export function WidgetDashboard({
  narrow,
  selectedCountry,
  indicatorCode,
  mapSlot,
}: WidgetDashboardProps) {
  const { c, t } = useTheme()
  const [layout, setLayout] = useState<Layout>(() => {
    const stored = parseStoredLayout()
    if (stored) return stored
    return DEFAULT_WIDGET_LAYOUT.map((x) => ({ ...x })) as Layout
  })
  const [widgetsMenuOpen, setWidgetsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const visibleIds = useMemo(
    () => new Set(layout.map((x) => x.i as WidgetType)),
    [layout],
  )

  useEffect(() => {
    if (!widgetsMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setWidgetsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [widgetsMenuOpen])

  const onLayoutChange = useCallback((next: Layout) => {
    setLayout(next)
    persistLayout(next)
  }, [])

  const hideWidget = useCallback((id: WidgetType) => {
    setLayout((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((x) => x.i !== id)
      persistLayout(next)
      return next
    })
  }, [])

  const showWidget = useCallback((id: WidgetType) => {
    setLayout((prev) => {
      if (prev.some((x) => x.i === id)) return prev
      const next = [...prev, defaultItemFor(id)]
      persistLayout(next)
      return next
    })
  }, [])

  const resetLayout = useCallback(() => {
    const next = DEFAULT_WIDGET_LAYOUT.map((x) => ({ ...x })) as Layout
    setLayout(next)
    persistLayout(next)
    setWidgetsMenuOpen(false)
  }, [])

  const setWidgetChecked = useCallback(
    (id: WidgetType, checked: boolean) => {
      if (checked) {
        showWidget(id)
        return
      }
      if (layout.length <= 1) return
      hideWidget(id)
    },
    [hideWidget, showWidget, layout.length],
  )

  const renderWidgetBody = useCallback(
    (id: WidgetType) => {
      if (id === 'map') return mapSlot
      return (
        <PlaceholderBody
          selectedCountry={selectedCountry}
          indicatorCode={indicatorCode}
        />
      )
    },
    [mapSlot, selectedCountry, indicatorCode],
  )

  const mapToolbar = (
    <div
      className="widget-no-drag"
      style={{
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        maxWidth: 'min(100% - 16px, 420px)',
        pointerEvents: 'auto',
      }}
    >
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setWidgetsMenuOpen((o) => !o)}
          style={{
            minHeight: 44,
            padding: `0 ${spacing.md}px`,
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.cardBg,
            color: c.text,
            fontFamily: fonts.mono,
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: c.shadow,
          }}
        >
          {t('worldWidgetToolbarWidgets')}
        </button>
        {widgetsMenuOpen ? (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              minWidth: 220,
              padding: spacing.md,
              borderRadius: 8,
              background: c.surface,
              border: `1px solid ${c.border}`,
              boxShadow: c.shadow,
              zIndex: 60,
            }}
          >
            {ALL_WIDGET_TYPES.map((wid) => (
              <label
                key={wid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  minHeight: 44,
                  fontFamily: fonts.body,
                  fontSize: '0.86rem',
                  color: c.text,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={visibleIds.has(wid)}
                  onChange={(e) => setWidgetChecked(wid, e.target.checked)}
                />
                {t(WIDGET_TITLE_KEYS[wid])}
              </label>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={resetLayout}
        style={{
          minHeight: 44,
          padding: `0 ${spacing.md}px`,
          borderRadius: 8,
          border: `1px solid ${c.border}`,
          background: c.cardBg,
          color: c.text,
          fontFamily: fonts.mono,
          fontSize: '0.68rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: c.shadow,
        }}
      >
        {t('worldWidgetToolbarReset')}
      </button>
    </div>
  )

  const wrapShell = (id: WidgetType, body: ReactNode) => (
    <WidgetShell
      title={t(WIDGET_TITLE_KEYS[id])}
      infoText={t(WIDGET_INFO_KEYS[id])}
      onClose={() => hideWidget(id)}
    >
      {id === 'map' ? (
        <>
          {mapToolbar}
          {body}
        </>
      ) : (
        body
      )}
    </WidgetShell>
  )

  const gridChildFor = (id: WidgetType) => (
    <div key={id} style={{ height: '100%', minHeight: 0 }}>
      {wrapShell(id, renderWidgetBody(id))}
    </div>
  )

  const mobileOrdered = useMemo(() => {
    const byId = new Map(layout.map((x) => [x.i as WidgetType, x]))
    return MOBILE_STACK_ORDER.filter((id) => byId.has(id))
  }, [layout])

  if (narrow) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
          padding: spacing.md,
          overflow: 'auto',
        }}
      >
        {mobileOrdered.map((id) => (
          <div key={id} style={{ minHeight: id === 'map' ? 360 : 200, flexShrink: 0 }}>
            {wrapShell(id, renderWidgetBody(id))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: spacing.md,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          position: 'relative',
        }}
      >
        <GridWithWidth
          className="world-widget-grid layout"
          style={{ minHeight: '100%' }}
          cols={12}
          rowHeight={52}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          layout={layout}
          onLayoutChange={onLayoutChange}
          compactType="vertical"
          isDraggable
          isResizable
          isBounded
          draggableCancel=".widget-no-drag"
          useCSSTransforms
          autoSize
        >
          {layout
            .filter((item) => isWidgetType(item.i))
            .map((item) => gridChildFor(item.i as WidgetType))}
        </GridWithWidth>
      </div>
    </div>
  )
}
