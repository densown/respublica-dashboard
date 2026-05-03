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
import type { Lang } from '../../design-system/ThemeContext'
import { fonts, spacing } from '../../design-system/tokens'
import {
  hasWorldBankRegionOnAnyRow,
  isRealCountry,
} from '../../utils/worldFilters'
import { iso3ToFlagIso2 } from './worldIso3ToIso2'
import { worldApiUrl } from './worldMapData'
import type {
  WorldCategoryApi,
  WorldCountryDetail,
  WorldGeoJson,
  WorldRankingRow,
  WorldTradeResponse,
} from './worldTypes'
import {
  formatWorldIndicatorValue,
  type WorldFormatContext,
} from './worldValueFormat'
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

function normIso(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase()
}

function categoryUnitForIndicator(
  categories: WorldCategoryApi[] | null,
  code: string,
): { category: string; unit: string | null } {
  if (!categories?.length) return { category: 'economy', unit: null }
  for (const cat of categories) {
    const hit = cat.indicators.find((i) => i.code === code)
    if (hit) return { category: cat.id, unit: hit.unit }
  }
  return { category: 'economy', unit: null }
}

function formatTradeUsd(
  v: number | null | undefined,
  lang: Lang,
): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const b = v / 1e9
  const fmt = (x: number, d: number) =>
    (lang === 'de' ? x.toFixed(d).replace('.', ',') : x.toFixed(d))
  if (Math.abs(b) >= 0.01) {
    return lang === 'de' ? `${fmt(b, 2)} Mrd. $` : `${fmt(b, 2)} bn $`
  }
  const m = v / 1e6
  return lang === 'de' ? `${fmt(m, 0)} Mio. $` : `${fmt(m, 0)} m $`
}

function partnerFlagUrl(
  partnerCode: string,
  geojson: WorldGeoJson | null,
): string | null {
  const p = partnerCode.trim().toUpperCase()
  if (p.length === 3) {
    const iso2 = iso3ToFlagIso2(p, geojson)
    return iso2 ? `https://flagcdn.com/w20/${iso2}.png` : null
  }
  if (p.length === 2) {
    return `https://flagcdn.com/w20/${p.toLowerCase()}.png`
  }
  return null
}

function RankingWidgetBody({
  indicatorCode,
  year,
  selectedCountry,
  categories,
}: {
  indicatorCode: string
  year: number
  selectedCountry: string | null
  categories: WorldCategoryApi[] | null
}) {
  const { c, t, lang } = useTheme()
  const L = lang as Lang
  const [rows, setRows] = useState<WorldRankingRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fmtCtx: WorldFormatContext = useMemo(() => {
    const { category, unit } = categoryUnitForIndicator(categories, indicatorCode)
    return {
      indicatorCode,
      category,
      unit,
      lang: L,
    }
  }, [categories, indicatorCode, L])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    setRows(null)
    const url = worldApiUrl(
      `/api/world/ranking?indicator=${encodeURIComponent(indicatorCode)}&year=${String(year)}&limit=10&order=desc`,
    )
    fetch(url, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<WorldRankingRow[]>
      })
      .then((raw) => {
        if (cancelled) return
        const regionAware = hasWorldBankRegionOnAnyRow(raw ?? [])
        const list = regionAware
          ? (raw ?? []).filter(isRealCountry)
          : (raw ?? [])
        setRows(list.map((r, i) => ({ ...r, rank: i + 1 })))
      })
      .catch((e: unknown) => {
        if (cancelled || ac.signal.aborted) return
        setError(e instanceof Error ? e.message : 'err')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [indicatorCode, year])

  const sel = normIso(selectedCountry)

  if (loading) {
    return (
      <div style={{ padding: `${spacing.sm}px ${spacing.md}px` }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 22,
              marginBottom: 6,
              borderRadius: 4,
              background: c.bgHover,
            }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p
        style={{
          margin: 0,
          padding: spacing.md,
          fontFamily: fonts.body,
          fontSize: '0.8rem',
          color: c.red,
        }}
      >
        {t('dataLoadError')}
      </p>
    )
  }

  if (!rows?.length) {
    return (
      <p
        style={{
          margin: 0,
          padding: spacing.md,
          fontFamily: fonts.body,
          fontSize: '0.82rem',
          color: c.muted,
        }}
      >
        {t('worldNoValue')}
      </p>
    )
  }

  return (
    <div style={{ padding: `${spacing.xs}px ${spacing.sm}px ${spacing.sm}px` }}>
      <ol
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {rows.map((r) => {
          const active = sel && normIso(r.country_code) === sel
          return (
            <li
              key={r.country_code}
              style={{
                display: 'grid',
                gridTemplateColumns: '22px 1fr auto',
                alignItems: 'baseline',
                gap: 6,
                padding: '4px 4px',
                borderLeft: active ? `3px solid ${c.red}` : '3px solid transparent',
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: c.muted,
                  textAlign: 'right',
                }}
              >
                {r.rank}
              </span>
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: c.text,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={r.country_name}
              >
                {r.country_name}
              </span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  fontWeight: 700,
                  color: c.text,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatWorldIndicatorValue(r.value, fmtCtx)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function trendArrowFromLastThree(values: number[]): '↑' | '↓' | '→' {
  if (values.length < 2) return '→'
  const a = values[0]!
  const b = values[values.length - 1]!
  if (b > a) return '↑'
  if (b < a) return '↓'
  return '→'
}

function MiniSparkline({
  points,
  stroke,
}: {
  points: { year: number; value: number }[]
  stroke: string
}) {
  const w = 100
  const h = 40
  const pad = 3
  if (points.length < 1) return null
  const vals = points.map((p) => p.value)
  const vmin = Math.min(...vals)
  const vmax = Math.max(...vals)
  const span = vmax - vmin || 1
  const n = points.length
  const coords = points.map((p, i) => {
    const x = n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad)
    const y = pad + (1 - (p.value - vmin) / span) * (h - 2 * pad)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const d = `M ${coords.join(' L ')}`
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
      aria-hidden
    >
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function StatCardWidgetBody({
  selectedCountry,
  indicatorCode,
  geojson,
  categories,
}: {
  selectedCountry: string | null
  indicatorCode: string
  geojson: WorldGeoJson | null
  categories: WorldCategoryApi[] | null
}) {
  const { c, t, lang } = useTheme()
  const L = lang as Lang
  const [detail, setDetail] = useState<WorldCountryDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedCountry) {
      setDetail(null)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    const url = worldApiUrl(
      `/api/world/country/${encodeURIComponent(normIso(selectedCountry))}`,
    )
    fetch(url, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<WorldCountryDetail>
      })
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch((e: unknown) => {
        if (cancelled || ac.signal.aborted) return
        setError(e instanceof Error ? e.message : 'err')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [selectedCountry])

  const fmtCtx: WorldFormatContext = useMemo(() => {
    const { category, unit } = categoryUnitForIndicator(categories, indicatorCode)
    return { indicatorCode, category, unit, lang: L }
  }, [categories, indicatorCode, L])

  const series = useMemo(() => {
    if (!detail?.indicators) return null
    const ind = detail.indicators.find((i) => i.indicator_code === indicatorCode)
    if (!ind?.values?.length) return null
    const sorted = [...ind.values].sort((a, b) => a.year - b.year)
    const withVal = sorted.filter(
      (x) => x.value != null && !Number.isNaN(x.value as number),
    ) as { year: number; value: number }[]
    return withVal
  }, [detail, indicatorCode])

  const lastTwenty = useMemo(() => {
    if (!series?.length) return []
    return series.slice(-20)
  }, [series])

  const latest = useMemo(() => {
    if (!series?.length) return null
    return series[series.length - 1] ?? null
  }, [series])

  const trendValues = useMemo(() => {
    if (!series?.length) return [] as number[]
    const tail = series.slice(-3).map((x) => x.value)
    return tail
  }, [series])

  if (!selectedCountry) {
    return (
      <p
        style={{
          margin: 0,
          padding: spacing.md,
          fontFamily: fonts.body,
          fontSize: '0.82rem',
          lineHeight: 1.4,
          color: c.muted,
        }}
      >
        {t('worldWidgetStatPickCountry')}
      </p>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: spacing.md }}>
        <div
          style={{
            height: 20,
            width: '70%',
            borderRadius: 4,
            background: c.bgHover,
            marginBottom: spacing.sm,
          }}
        />
        <div
          style={{
            height: 36,
            width: '90%',
            borderRadius: 4,
            background: c.bgHover,
            marginBottom: spacing.sm,
          }}
        />
        <div style={{ height: 40, borderRadius: 4, background: c.bgHover }} />
      </div>
    )
  }

  if (error) {
    return (
      <p
        style={{
          margin: 0,
          padding: spacing.md,
          fontFamily: fonts.body,
          fontSize: '0.8rem',
          color: c.red,
        }}
      >
        {t('dataLoadError')}
      </p>
    )
  }

  const iso3 = normIso(selectedCountry)
  const iso2 = iso3ToFlagIso2(iso3, geojson)
  const flagUrl = iso2 ? `https://flagcdn.com/w20/${iso2}.png` : null
  const name = detail?.country_name ?? iso3
  const big =
    latest != null
      ? formatWorldIndicatorValue(latest.value, fmtCtx)
      : '—'
  const arrow = trendArrowFromLastThree(trendValues)

  return (
    <div style={{ padding: spacing.md }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        {flagUrl ? (
          <img
            src={flagUrl}
            width={20}
            height={14}
            alt=""
            style={{
              borderRadius: 2,
              objectFit: 'cover',
              border: `1px solid ${c.border}`,
              flexShrink: 0,
            }}
          />
        ) : null}
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: 13,
            color: c.text,
            fontWeight: 600,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: spacing.sm,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 32,
            fontWeight: 700,
            color: c.text,
            lineHeight: 1,
          }}
        >
          {big}
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: '1.1rem',
            color: c.red,
          }}
          aria-hidden
        >
          {arrow}
        </span>
      </div>
      {latest ? (
        <p
          style={{
            margin: `0 0 ${spacing.sm}px`,
            fontFamily: fonts.mono,
            fontSize: 10,
            color: c.muted,
          }}
        >
          {latest.year}
        </p>
      ) : null}
      {lastTwenty.length > 1 ? (
        <MiniSparkline points={lastTwenty} stroke={c.red} />
      ) : null}
    </div>
  )
}

function TradeFlowWidgetBody({
  selectedCountry,
  year,
  geojson,
}: {
  selectedCountry: string | null
  year: number
  geojson: WorldGeoJson | null
}) {
  const { c, t, lang } = useTheme()
  const L = lang as Lang
  const [data, setData] = useState<WorldTradeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedCountry) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    const url = worldApiUrl(
      `/api/world/trade/${encodeURIComponent(normIso(selectedCountry))}?year=${String(year)}`,
    )
    fetch(url, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<WorldTradeResponse>
      })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (cancelled || ac.signal.aborted) return
        setError(e instanceof Error ? e.message : 'err')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [selectedCountry, year])

  if (!selectedCountry) {
    return (
      <p
        style={{
          margin: 0,
          padding: spacing.md,
          fontFamily: fonts.body,
          fontSize: '0.82rem',
          color: c.muted,
        }}
      >
        {t('worldWidgetTradePickCountry')}
      </p>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: spacing.md }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.sm }}>
          <div style={{ height: 28, borderRadius: 4, background: c.bgHover }} />
          <div style={{ height: 28, borderRadius: 4, background: c.bgHover }} />
        </div>
        <div style={{ height: 16, marginTop: 8, borderRadius: 4, background: c.bgHover }} />
      </div>
    )
  }

  if (error) {
    return (
      <p
        style={{
          margin: 0,
          padding: spacing.md,
          fontFamily: fonts.body,
          fontSize: '0.8rem',
          color: c.red,
        }}
      >
        {t('dataLoadError')}
      </p>
    )
  }

  const ex = (data?.top_exports ?? []).slice(0, 5)
  const im = (data?.top_imports ?? []).slice(0, 5)

  const col = (title: string, total: number | null | undefined, rows: typeof ex) => (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: c.muted,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: '0.95rem',
          fontWeight: 700,
          color: c.text,
          marginBottom: spacing.sm,
        }}
      >
        {formatTradeUsd(total, L)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((r) => {
          const fu = partnerFlagUrl(r.partner_code, geojson)
          return (
            <div
              key={`${title}-${r.partner_code}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minWidth: 0,
              }}
            >
              {fu ? (
                <img
                  src={fu}
                  width={20}
                  height={14}
                  alt=""
                  style={{
                    borderRadius: 2,
                    objectFit: 'cover',
                    border: `1px solid ${c.border}`,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span style={{ width: 20, flexShrink: 0 }} />
              )}
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: fonts.body,
                  fontSize: 11,
                  color: c.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={r.partner_name}
              >
                {r.partner_name}
              </span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  fontWeight: 600,
                  color: c.text,
                  flexShrink: 0,
                }}
              >
                {formatTradeUsd(r.value_usd, L)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ padding: spacing.md }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.md,
          alignItems: 'start',
        }}
      >
        {col(t('worldWidgetExportLabel'), data?.total_export_usd, ex)}
        {col(t('worldWidgetImportLabel'), data?.total_import_usd, im)}
      </div>
    </div>
  )
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
  year: number
  categories: WorldCategoryApi[] | null
  geojson: WorldGeoJson | null
  mapSlot: ReactNode
}

export function WidgetDashboard({
  narrow,
  selectedCountry,
  indicatorCode,
  year,
  categories,
  geojson,
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
      if (checked) {
        showWidget(id)
        return
      }
      if (visibleRef.current.length <= 1) return
      hideWidget(id)
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

  const renderPanelBody = (id: FloatingWidgetType) => {
    switch (id) {
      case 'ranking':
        return (
          <RankingWidgetBody
            indicatorCode={indicatorCode}
            year={year}
            selectedCountry={selectedCountry}
            categories={categories}
          />
        )
      case 'stat-card':
        return (
          <StatCardWidgetBody
            selectedCountry={selectedCountry}
            indicatorCode={indicatorCode}
            geojson={geojson}
            categories={categories}
          />
        )
      case 'trade-flow':
        return (
          <TradeFlowWidgetBody
            selectedCountry={selectedCountry}
            year={year}
            geojson={geojson}
          />
        )
      default:
        return (
          <PlaceholderBody
            selectedCountry={selectedCountry}
            indicatorCode={indicatorCode}
          />
        )
    }
  }

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
              {renderPanelBody(id)}
            </WidgetShell>
          </div>
        )
      })}
    </div>
  )
}
