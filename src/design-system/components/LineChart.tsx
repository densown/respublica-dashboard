import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'
import { interpolate } from '../i18n'
import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import MonoLabel from './MonoLabel'

export type LineChartPoint = { y: number; v: number }

export type LineChartAnnotation = { year: number; label: string }

export type LineChartProps = {
  data: LineChartPoint[]
  color?: string
  yLabel?: ReactNode
  height?: number
  showArea?: boolean
  annotations?: LineChartAnnotation[]
  style?: CSSProperties
  /** Nachkommastellen für den Tooltip-Wert (Standard: 2). */
  valueDecimals?: number
}

export default function LineChart({
  data,
  color,
  yLabel,
  height = 100,
  showArea = true,
  annotations = [],
  style,
  valueDecimals = 2,
}: LineChartProps) {
  const { c, t } = useTheme()
  const col = color || c.red
  const chartWrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  if (!data || data.length < 2) return null
  const vals = data.map((d) => d.v)
  const years = data.map((d) => d.y)
  const min = Math.min(...vals),
    max = Math.max(...vals),
    range = max - min || 1
  const W = 260,
    H = height
  const toX = (i: number) => (i / (data.length - 1)) * W
  const toY = (v: number) => H - 4 - ((v - min) / range) * (H - 12)
  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.v).toFixed(1)}`).join(' ')
  const areaBottom = `${toX(data.length - 1)},${H} 0,${H}`
  const firstY = years[0],
    lastY = years[years.length - 1]

  const lastIdx = data.length - 1

  const updateHoverFromClientX = useCallback(
    (clientX: number) => {
      const wrap = chartWrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      if (rect.width <= 0) return
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const i = Math.round(ratio * lastIdx)
      setHover(i)
    },
    [lastIdx],
  )

  const hoverPoint = hover != null ? data[hover] : null

  return (
    <div style={style}>
      {yLabel && <MonoLabel style={{ marginBottom: spacing.xs }}>{yLabel}</MonoLabel>}
      <div
        ref={chartWrapRef}
        style={{ position: 'relative', width: '100%' }}
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          style={{ display: 'block', overflow: 'visible' }}
          aria-hidden
          onMouseMove={(e) => updateHoverFromClientX(e.clientX)}
          onTouchStart={(e) => {
            const x = e.touches[0]?.clientX
            if (x != null) updateHoverFromClientX(x)
          }}
          onTouchMove={(e) => {
            const x = e.touches[0]?.clientX
            if (x != null) updateHoverFromClientX(x)
          }}
          onTouchEnd={() => setHover(null)}
        >
          {showArea && (
            <polygon points={`0,${toY(data[0]!.v)} ${pts} ${areaBottom}`} fill={col} fillOpacity={0.07} />
          )}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={0}
              y1={toY(min + range * f)}
              x2={W}
              y2={toY(min + range * f)}
              stroke={c.border}
              strokeWidth={0.5}
              strokeDasharray="3 3"
            />
          ))}
          <polyline
            points={pts}
            fill="none"
            stroke={col}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={toX(data.length - 1)} cy={toY(vals[vals.length - 1]!)} r={3} fill={col} />
          {hover != null && hoverPoint && (
            <g pointerEvents="none">
              <line
                x1={toX(hover)}
                y1={0}
                x2={toX(hover)}
                y2={H}
                stroke={c.border}
                strokeWidth={1}
                strokeOpacity={0.85}
              />
              <circle
                cx={toX(hover)}
                cy={toY(hoverPoint.v)}
                r={4}
                fill={col}
                stroke={c.cardBg}
                strokeWidth={1.5}
              />
            </g>
          )}
          {annotations.map((a, i) => {
            const idx = data.findIndex((d) => d.y >= a.year)
            if (idx < 0) return null
            const x = toX(idx)
            return (
              <g key={i}>
                <line x1={x} y1={0} x2={x} y2={H} stroke={c.subtle} strokeWidth={1} strokeDasharray="2 2" />
                <text x={x + 3} y={10} fontFamily={fonts.mono} fontSize={8} fill={c.muted}>
                  {a.label}
                </text>
              </g>
            )
          })}
          <text x={0} y={H + 12} fontFamily={fonts.mono} fontSize={8} fill={c.muted}>
            {firstY}
          </text>
          <text x={W} y={H + 12} fontFamily={fonts.mono} fontSize={8} fill={c.muted} textAnchor="end">
            {lastY}
          </text>
        </svg>
        {hover != null && hoverPoint && (
          <div
            style={{
              position: 'absolute',
              left: `${lastIdx > 0 ? (hover / lastIdx) * 100 : 50}%`,
              top: 2,
              transform: 'translate(-50%, 0)',
              maxWidth: 'min(92%, 200px)',
              padding: '4px 8px',
              borderRadius: 4,
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              fontFamily: fonts.mono,
              fontSize: 11,
              color: c.ink,
              lineHeight: 1.35,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 2,
            }}
          >
            {interpolate(t('lineChartTooltipYearValue'), {
              year: hoverPoint.y,
              value: hoverPoint.v.toFixed(valueDecimals),
            })}
          </div>
        )}
      </div>
    </div>
  )
}
