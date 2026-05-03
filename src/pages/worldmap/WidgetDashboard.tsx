import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
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

/** Nur schwebende Panels; die Karte liegt als Vollfläche darunter. */
export type FloatingWidgetType = Exclude<WidgetType, 'map'>

const LS_KEY = 'rp-widget-layout-v1'
const LS_VERSION = 2

const FLOATING_WIDGETS: FloatingWidgetType[] = [
  'ranking',
  'stat-card',
  'bar-chart',
  'trade-flow',
  'sparkline',
]

const PANEL_DEFAULT_STYLE: Record<
  FloatingWidgetType,
  Pick<CSSProperties, 'top' | 'right' | 'left' | 'bottom' | 'width'>
> = {
  ranking: { top: 8, right: 8, width: 260 },
  'stat-card': { top: 8, right: 276, width: 200 },
  'trade-flow': { bottom: 60, left: 8, width: 280 },
  'bar-chart': { bottom: 60, left: 296, width: 280 },
  sparkline: { bottom: 60, right: 8, width: 260 },
}

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

type PanelOffsets = Partial<Record<FloatingWidgetType, { dx: number; dy: number }>>

type StoredStateV2 = {
  v: typeof LS_VERSION
  visible?: FloatingWidgetType[]
  offsets?: PanelOffsets
}

function defaultVisible(): FloatingWidgetType[] {
  return [...FLOATING_WIDGETS]
}

function parseStored(): { visible: FloatingWidgetType[]; offsets: PanelOffsets } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      return { visible: defaultVisible(), offsets: {} }
    }
    const data = JSON.parse(raw) as StoredStateV2 & { layout?: unknown }
    if (data.v === LS_VERSION && Array.isArray(data.visible)) {
      const vis = data.visible.filter((x): x is FloatingWidgetType =>
        FLOATING_WIDGETS.includes(x as FloatingWidgetType),
      )
      const offsets: PanelOffsets = {}
      if (data.offsets && typeof data.offsets === 'object') {
        for (const id of FLOATING_WIDGETS) {
          const o = data.offsets[id]
          if (
            o &&
            typeof o === 'object' &&
            typeof o.dx === 'number' &&
            typeof o.dy === 'number'
          ) {
            offsets[id] = { dx: o.dx, dy: o.dy }
          }
        }
      }
      return { visible: vis.length ? vis : defaultVisible(), offsets }
    }
  } catch {
    /* ignore */
  }
  return { visible: defaultVisible(), offsets: {} }
}

function persistState(visible: FloatingWidgetType[], offsets: PanelOffsets) {
  try {
    const payload: StoredStateV2 = {
      v: LS_VERSION,
      visible,
      offsets,
    }
    localStorage.setItem(LS_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export type WidgetShellProps = {
  title: string
  onClose: () => void
  infoText: string
  children: ReactNode
  /** Ziehen am Header (außer Steuer-Elementen mit data-panel-control) */
  onDragMouseDown?: (e: React.MouseEvent) => void
}

export function WidgetShell({
  title,
  onClose,
  infoText,
  children,
  onDragMouseDown,
}: WidgetShellProps) {
  const { c, t } = useTheme()
  const [infoOpen, setInfoOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
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
    height: collapsed ? 'auto' : '100%',
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
    borderBottom: collapsed ? 'none' : `1px solid ${c.border}`,
    flexShrink: 0,
    minHeight: 44,
    cursor: onDragMouseDown ? 'grab' : undefined,
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

  const headerMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-panel-control]')) return
    onDragMouseDown?.(e)
  }

  return (
    <div style={shellStyle}>
      <div style={headerStyle} onMouseDown={headerMouseDown} role="presentation">
        <button
          type="button"
          data-panel-control
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? t('worldWidgetExpandPanel') : t('worldWidgetCollapsePanel')
          }
          onClick={() => setCollapsed((v) => !v)}
          style={btnReset}
        >
          {collapsed ? '▸' : '▾'}
        </button>
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
            data-panel-control
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
          data-panel-control
          aria-label={t('worldWidgetClose')}
          onClick={onClose}
          style={btnReset}
        >
          ×
        </button>
      </div>
      {!collapsed ? (
        <div
          className="world-widget-shell-body"
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {children}
        </div>
      ) : null}
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
        minHeight: 80,
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
  const initial = useMemo(() => parseStored(), [])
  const [visible, setVisible] = useState<FloatingWidgetType[]>(initial.visible)
  const [offsets, setOffsets] = useState<PanelOffsets>(initial.offsets)
  const [widgetsMenuOpen, setWidgetsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef(visible)
  const offsetsRef = useRef(offsets)
  visibleRef.current = visible
  offsetsRef.current = offsets

  const visibleSet = useMemo(() => new Set(visible), [visible])

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

  const persist = useCallback((v: FloatingWidgetType[], o: PanelOffsets) => {
    persistState(v, o)
  }, [])

  const hideWidget = useCallback(
    (id: FloatingWidgetType) => {
      setVisible((prev) => {
        const next = prev.filter((x) => x !== id)
        persist(next, offsetsRef.current)
        return next
      })
    },
    [persist],
  )

  const showWidget = useCallback(
    (id: FloatingWidgetType) => {
      setVisible((prev) => {
        if (prev.includes(id)) return prev
        const next = [...prev, id]
        persist(next, offsetsRef.current)
        return next
      })
    },
    [persist],
  )

  const resetPanels = useCallback(() => {
    const next = defaultVisible()
    setVisible(next)
    setOffsets({})
    persist(next, {})
    setWidgetsMenuOpen(false)
  }, [persist])

  const setWidgetChecked = useCallback(
    (id: FloatingWidgetType, checked: boolean) => {
      if (checked) showWidget(id)
      else hideWidget(id)
    },
    [hideWidget, showWidget],
  )

  const onDragMouseDown = useCallback(
    (id: FloatingWidgetType, e: React.MouseEvent) => {
      if (e.button !== 0) return
      const cur = offsetsRef.current[id] ?? { dx: 0, dy: 0 }
      const startX = e.clientX
      const startY = e.clientY
      const baseDx = cur.dx
      const baseDy = cur.dy
      e.preventDefault()

      const onMove = (ev: MouseEvent) => {
        const dx = baseDx + (ev.clientX - startX)
        const dy = baseDy + (ev.clientY - startY)
        setOffsets((prev) => ({
          ...prev,
          [id]: { dx, dy },
        }))
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        setOffsets((prev) => {
          persist(visibleRef.current, prev)
          return prev
        })
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [persist],
  )

  const renderPlaceholder = useCallback(
    () => (
      <PlaceholderBody
        selectedCountry={selectedCountry}
        indicatorCode={indicatorCode}
      />
    ),
    [selectedCountry, indicatorCode],
  )

  const mapToolbar = !narrow ? (
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
            {FLOATING_WIDGETS.map((wid) => (
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
                  checked={visibleSet.has(wid)}
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
        onClick={resetPanels}
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
  ) : null

  if (narrow) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>{mapSlot}</div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>{mapSlot}</div>
      {mapToolbar}
      {visible.map((id) => {
        const base = PANEL_DEFAULT_STYLE[id]
        const off = offsets[id] ?? { dx: 0, dy: 0 }
        return (
          <div
            key={id}
            className="world-widget-floating-panel"
            style={{
              position: 'absolute',
              zIndex: 30,
              maxHeight: '40vh',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              ...base,
              transform: `translate(${off.dx}px, ${off.dy}px)`,
              boxSizing: 'border-box',
            }}
          >
            <WidgetShell
              title={t(WIDGET_TITLE_KEYS[id])}
              infoText={t(WIDGET_INFO_KEYS[id])}
              onClose={() => hideWidget(id)}
              onDragMouseDown={(e) => onDragMouseDown(id, e)}
            >
              {renderPlaceholder()}
            </WidgetShell>
          </div>
        )
      })}
    </div>
  )
}
