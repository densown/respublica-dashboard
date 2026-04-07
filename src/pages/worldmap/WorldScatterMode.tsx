import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState, useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import type { Lang } from '../../design-system/ThemeContext'
import { fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import { isRealCountry } from '../../utils/worldFilters'
import { worldRegionScatterColor } from './worldColors'
import { worldIndicatorShortLabel } from './worldIndicatorShortNames'
import { worldBankRegionLabel } from './worldRegionLabels'
import type { WorldCategoryApi, WorldMapRow, WorldScatterRow } from './worldTypes'

type WorldScatterModeProps = {
  narrow: boolean
  categories: WorldCategoryApi[] | null
  setCategoryId: (id: string) => void
  indicatorX: string
  setIndicatorX: (code: string) => void
  indicatorY: string
  setIndicatorY: (code: string) => void
  year: number
  setYear: (y: number) => void
  statsYears: { min: number; max: number } | null
  onSelectCountry: (iso3: string) => void
}

function formatAxisValue(
  value: number,
  lang: Lang,
  t: (key: I18nKey) => string,
): string {
  const abs = Math.abs(value)
  const dec = (v: number) => {
    const s = v.toFixed(1)
    return lang === 'de' ? s.replace('.', ',') : s
  }
  if (abs >= 1_000_000_000_000)
    return dec(value / 1_000_000_000_000) + ' ' + t('worldScatterAxisTrillion')
  if (abs >= 1_000_000_000)
    return dec(value / 1_000_000_000) + ' ' + t('worldScatterAxisBillion')
  if (abs >= 1_000_000)
    return dec(value / 1_000_000) + ' ' + t('worldScatterAxisMillion')
  if (abs >= 1_000)
    return dec(value / 1_000) + t('worldScatterAxisThousand')
  return dec(value)
}

function selectCss(c: {
  cardBg: string
  border: string
  text: string
}): CSSProperties {
  return {
    minHeight: 44,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    background: c.cardBg,
    color: c.text,
    fontFamily: fonts.body,
    fontSize: '0.9rem',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  }
}

function categoryIdForCode(
  categories: WorldCategoryApi[] | null,
  code: string,
): string | null {
  if (!categories) return null
  for (const cat of categories) {
    if (cat.indicators.some((i) => i.code === code)) return cat.id
  }
  return null
}

type ScatterPoint = WorldScatterRow & {
  pop: number
  size: number
  fill: string
  /** Leerstring = keine Region (i. d. Legende wie „Keine Region“). */
  regionKey: string
}

export function WorldScatterMode({
  narrow,
  categories,
  setCategoryId,
  indicatorX,
  setIndicatorX,
  indicatorY,
  setIndicatorY,
  year,
  setYear,
  statsYears,
  onSelectCountry,
}: WorldScatterModeProps) {
  const { c, t, lang, theme } = useTheme()
  const L = lang as Lang
  const [hoveredIso, setHoveredIso] = useState<string | null>(null)
  const [hiddenRegions, setHiddenRegions] = useState<Set<string>>(
    () => new Set(),
  )
  const [legendHoverKey, setLegendHoverKey] = useState<string | null>(null)

  useEffect(() => {
    setHiddenRegions(new Set())
  }, [indicatorX, indicatorY, year])

  const scatterEp =
    indicatorX && indicatorY
      ? `/api/world/scatter?x=${encodeURIComponent(indicatorX)}&y=${encodeURIComponent(indicatorY)}&year=${String(year)}`
      : ''
  const { data: scatterRaw, loading: scLoading, error: scErr } =
    useApi<WorldScatterRow[]>(scatterEp)

  const popEp = `/api/world/map?indicator=${encodeURIComponent('SP.POP.TOTL')}&year=${String(year)}`
  const { data: popRows } = useApi<WorldMapRow[]>(popEp)

  const yearOpts = useMemo(() => {
    const yr = statsYears
    if (!yr) return [] as number[]
    const out: number[] = []
    for (let y = yr.max; y >= yr.min; y--) out.push(y)
    return out
  }, [statsYears])

  const popByIso = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of popRows ?? []) {
      if (!isRealCountry(r)) continue
      if (r.value == null) continue
      m.set(r.country_code.trim().toUpperCase(), r.value as number)
    }
    return m
  }, [popRows])

  const scatterRows = useMemo(
    () => (scatterRaw ?? []).filter(isRealCountry),
    [scatterRaw],
  )

  const chartPoints = useMemo((): ScatterPoint[] => {
    const pops = [...popByIso.values()].filter((v) => v > 0)
    const maxPop = pops.length ? Math.max(...pops) : 1
    const minLog = Math.log10(1)
    const maxLog = Math.log10(maxPop)
    const span = Math.max(maxLog - minLog, 1e-6)
    return scatterRows.map((p) => {
      const pop = popByIso.get(p.country_code.trim().toUpperCase()) ?? 1
      const logP = Math.log10(Math.max(pop, 1))
      const tNorm = (logP - minLog) / span
      const size = 120 + tNorm * 520
      const regionKey = p.region?.trim() ?? ''
      return {
        ...p,
        pop,
        size,
        regionKey,
        fill: worldRegionScatterColor(p.region),
      }
    })
  }, [scatterRows, popByIso])

  const regionLegend = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const p of chartPoints) {
      const key = p.region?.trim() || ''
      if (!map.has(key)) map.set(key, p.region?.trim() ? p.region : null)
    }
    const items = [...map.entries()].map(([key, region]) => ({
      key,
      region,
      color: worldRegionScatterColor(region),
      label: worldBankRegionLabel(region, t),
    }))
    items.sort((a, b) => a.label.localeCompare(b.label, lang))
    return items
  }, [chartPoints, t, lang])

  const axisTickFormatter = (v: number) => formatAxisValue(v, L, t)

  const xAxisLabel = worldIndicatorShortLabel(indicatorX, L)
  const yAxisLabel = worldIndicatorShortLabel(indicatorY, L)

  const labelSpan = (text: string): ReactNode => (
    <span
      style={{
        display: 'block',
        fontFamily: fonts.body,
        fontSize: '0.8rem',
        color: c.muted,
        marginBottom: 6,
      }}
    >
      {text}
    </span>
  )

  const onPickX = (code: string) => {
    setIndicatorX(code)
    const cid = categoryIdForCode(categories, code)
    if (cid) setCategoryId(cid)
  }

  const flatIndicatorSelect = (
    label: string,
    value: string,
    onChange: (code: string) => void,
  ) => (
    <label style={{ display: 'block', minWidth: 0 }}>
      {labelSpan(label)}
      <select
        value={value}
        disabled={!categories?.length}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...selectCss(c), fontFamily: fonts.mono, fontSize: '0.82rem' }}
      >
        {(categories ?? []).map((cat) => (
          <optgroup
            key={cat.id}
            label={lang === 'de' ? cat.label_de : cat.label_en}
          >
            {cat.indicators.map((ind) => (
              <option key={ind.code} value={ind.code}>
                {worldIndicatorShortLabel(ind.code, L)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )

  const dotRadius = (size: number) =>
    Math.min(26, Math.max(5, Math.sqrt(size / Math.PI)))

  const toggleRegionLegend = (key: string) => {
    setHiddenRegions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const showWorldLegendReset =
    regionLegend.length > 1 &&
    hiddenRegions.size === regionLegend.length - 1

  const tooltipBg =
    theme === 'dark' ? '#1A1A1Aee' : '#FFFFFFee'

  return (
    <div style={{ marginTop: spacing.lg }}>
      <h2
        style={{
          fontFamily: fonts.body,
          fontSize: 'clamp(1.1rem, 3.5vw, 1.4rem)',
          fontWeight: 700,
          color: c.text,
          margin: `0 0 ${spacing.lg}`,
        }}
      >
        {t('worldScatterTitle')}
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow ? '1fr' : '1fr 1fr',
          gap: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        {flatIndicatorSelect(t('worldScatterAxisX'), indicatorX, onPickX)}
        {flatIndicatorSelect(t('worldScatterAxisY'), indicatorY, setIndicatorY)}
      </div>

      <label style={{ display: 'block', marginBottom: spacing.lg, maxWidth: 200 }}>
        {labelSpan(t('worldYear'))}
        <select
          value={year}
          disabled={!yearOpts.length}
          onChange={(e) => setYear(Number(e.target.value))}
          style={selectCss(c)}
        >
          {yearOpts.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      {scErr && (
        <p style={{ color: c.red, fontFamily: fonts.body }}>{t('dataLoadError')}</p>
      )}
      {scLoading && !scatterRaw && (
        <p style={{ color: c.muted }}>{t('loading')}</p>
      )}
      {!scLoading && chartPoints.length === 0 && (
        <EmptyState text={t('worldNoValue')} />
      )}
      {chartPoints.length > 0 && (
        <>
          <div style={{ width: '100%', height: narrow ? 360 : 480 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 12, right: 24, bottom: 64, left: 100 }}
              >
                <CartesianGrid stroke={c.border} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={xAxisLabel}
                  tickFormatter={axisTickFormatter}
                  tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                  label={{
                    value: xAxisLabel,
                    position: 'bottom',
                    offset: 36,
                    fill: c.muted,
                    style: { fontSize: 11, fontFamily: fonts.mono },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={yAxisLabel}
                  tickFormatter={axisTickFormatter}
                  tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                  width={56}
                  label={{
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    fill: c.muted,
                    style: { fontSize: 11, fontFamily: fonts.mono },
                  }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  wrapperStyle={{ zIndex: 10 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload as ScatterPoint
                    if (hiddenRegions.has(d.regionKey)) return null
                    return (
                      <div
                        style={{
                          background: tooltipBg,
                          border: `1px solid ${c.border}`,
                          borderRadius: 6,
                          padding: '10px 14px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          maxWidth: 220,
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: fonts.body,
                            fontSize: 13,
                            fontWeight: 700,
                            color: c.text,
                            marginBottom: 8,
                          }}
                        >
                          {d.country_name}
                        </div>
                        <div
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: 11,
                            color: c.text,
                            marginBottom: 4,
                            lineHeight: 1.35,
                          }}
                        >
                          {xAxisLabel}:{' '}
                          {formatAxisValue(d.x, L, t)}
                        </div>
                        <div
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: 11,
                            color: c.text,
                            marginBottom: 6,
                            lineHeight: 1.35,
                          }}
                        >
                          {yAxisLabel}:{' '}
                          {formatAxisValue(d.y, L, t)}
                        </div>
                        <div
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: 11,
                            color: c.muted,
                          }}
                        >
                          {worldBankRegionLabel(d.region, t)}
                        </div>
                      </div>
                    )
                  }}
                />
                <Scatter
                  data={chartPoints}
                  shape={(props) => {
                    const p = props as {
                      cx?: number
                      cy?: number
                      payload: ScatterPoint
                    }
                    const cx = p.cx ?? 0
                    const cy = p.cy ?? 0
                    const iso = p.payload.country_code.trim().toUpperCase()
                    const hiddenPoint = hiddenRegions.has(p.payload.regionKey)
                    const hovered = !hiddenPoint && hoveredIso === iso
                    const r = dotRadius(p.payload.size) + (hovered ? 2 : 0)
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={p.payload.fill}
                        stroke={hovered ? c.text : c.border}
                        strokeWidth={hovered ? 2 : 1}
                        style={{
                          cursor: hiddenPoint ? 'default' : 'pointer',
                          opacity: hiddenPoint ? 0 : 1,
                          transition: 'opacity 0.15s',
                          pointerEvents: hiddenPoint ? 'none' : 'auto',
                        }}
                        onClick={() =>
                          !hiddenPoint && onSelectCountry(iso)
                        }
                        onMouseEnter={() =>
                          !hiddenPoint && setHoveredIso(iso)
                        }
                        onMouseLeave={() => setHoveredIso(null)}
                        onKeyDown={(e) => {
                          if (hiddenPoint) return
                          if (e.key === 'Enter' || e.key === ' ')
                            onSelectCountry(iso)
                        }}
                        tabIndex={hiddenPoint ? -1 : 0}
                        role="button"
                        aria-hidden={hiddenPoint}
                        aria-label={p.payload.country_name}
                      />
                    )
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div
            role="list"
            aria-label={t('worldScatterRegionLegend')}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              justifyContent: 'center',
              marginTop: spacing.lg,
              fontFamily: fonts.mono,
              fontSize: 11,
              color: c.muted,
            }}
          >
            {regionLegend.map(({ key, color, label }) => {
              const hiddenLeg = hiddenRegions.has(key)
              const hov = legendHoverKey === key
              const legOp = hiddenLeg
                ? hov
                  ? 0.7
                  : 0.3
                : hov
                  ? 0.7
                  : 1
              return (
                <div
                  key={key || '∅'}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleRegionLegend(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleRegionLegend(key)
                    }
                  }}
                  onMouseEnter={() => setLegendHoverKey(key)}
                  onMouseLeave={() => setLegendHoverKey(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    opacity: legOp,
                    transition: 'opacity 0.15s',
                    userSelect: 'none',
                    textDecoration: hiddenLeg ? 'line-through' : undefined,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  <span>{label}</span>
                </div>
              )
            })}
          </div>
          {showWorldLegendReset && (
            <div style={{ textAlign: 'center', marginTop: spacing.md }}>
              <button
                type="button"
                onClick={() => setHiddenRegions(new Set())}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: c.muted,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none'
                }}
              >
                {t('showAll')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
