import { useMemo, type CSSProperties, type ReactNode } from 'react'
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
import type { Lang } from '../../design-system/ThemeContext'
import { fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import { worldIndicatorShortLabel } from './worldIndicatorShortNames'
import type { WorldCategoryApi, WorldMapRow, WorldScatterRow } from './worldTypes'
import { formatWorldIndicatorValue } from './worldValueFormat'
import { worldRegionScatterColor } from './worldColors'

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

function metaCtx(
  categories: WorldCategoryApi[] | null,
  code: string,
): { unit: string | null; category: string } {
  if (!categories) return { unit: null, category: 'economy' }
  for (const cat of categories) {
    const hit = cat.indicators.find((i) => i.code === code)
    if (hit) return { unit: hit.unit, category: cat.id }
  }
  return { unit: null, category: 'economy' }
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
  const { c, t, lang } = useTheme()
  const L = lang as Lang

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
      if (r.value == null) continue
      m.set(r.country_code.trim().toUpperCase(), r.value as number)
    }
    return m
  }, [popRows])

  const chartPoints = useMemo((): ScatterPoint[] => {
    const pops = [...popByIso.values()].filter((v) => v > 0)
    const maxPop = pops.length ? Math.max(...pops) : 1
    const minLog = Math.log10(1)
    const maxLog = Math.log10(maxPop)
    const span = Math.max(maxLog - minLog, 1e-6)
    return (scatterRaw ?? []).map((p) => {
      const pop = popByIso.get(p.country_code.trim().toUpperCase()) ?? 1
      const logP = Math.log10(Math.max(pop, 1))
      const tNorm = (logP - minLog) / span
      const size = 120 + tNorm * 520
      return {
        ...p,
        pop,
        size,
        fill: worldRegionScatterColor(p.region),
      }
    })
  }, [scatterRaw, popByIso])

  const xMeta = metaCtx(categories, indicatorX)
  const yMeta = metaCtx(categories, indicatorY)
  const xLabel = worldIndicatorShortLabel(indicatorX, L)
  const yLabel = worldIndicatorShortLabel(indicatorY, L)

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
        <div style={{ width: '100%', height: narrow ? 360 : 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 24, bottom: 48, left: 8 }}>
              <CartesianGrid stroke={c.border} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name={xLabel}
                tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                label={{
                  value: xLabel,
                  position: 'bottom',
                  offset: 28,
                  fill: c.muted,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yLabel}
                tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                width={56}
                label={{
                  value: yLabel,
                  angle: -90,
                  position: 'insideLeft',
                  fill: c.muted,
                  fontSize: 11,
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload as ScatterPoint
                  return (
                    <div
                      style={{
                        background: c.cardBg,
                        border: `1px solid ${c.border}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                        fontFamily: fonts.mono,
                        fontSize: 12,
                        color: c.text,
                        maxWidth: 280,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        {d.country_name}
                      </div>
                      <div>
                        {xLabel}:{' '}
                        {formatWorldIndicatorValue(d.x, {
                          indicatorCode: indicatorX,
                          category: xMeta.category,
                          unit: xMeta.unit,
                          lang: L,
                        })}
                      </div>
                      <div>
                        {yLabel}:{' '}
                        {formatWorldIndicatorValue(d.y, {
                          indicatorCode: indicatorY,
                          category: yMeta.category,
                          unit: yMeta.unit,
                          lang: L,
                        })}
                      </div>
                      <div style={{ color: c.muted, marginTop: 4, fontSize: 11 }}>
                        {t('worldOpenAnalysis')}
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
                  const r = dotRadius(p.payload.size)
                  const iso = p.payload.country_code.trim().toUpperCase()
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={p.payload.fill}
                      stroke={c.border}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelectCountry(iso)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          onSelectCountry(iso)
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={p.payload.country_name}
                    />
                  )
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
