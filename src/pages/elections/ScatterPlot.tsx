import { useCallback, useMemo, useRef } from 'react'
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import {
  colorForStatePrefix,
  MAIN_PARTIES,
  PARTY_LABELS,
  partyColorsForTheme,
  statePrefixFromAgs,
} from './partyColors'
import type { MapRow } from './types'
import type { ScatterRow } from './types'

const AXIS_KEYS = ['turnout', ...MAIN_PARTIES] as const
export type ScatterAxisKey = (typeof AXIS_KEYS)[number]

type ScatterPlotProps = {
  rows: ScatterRow[]
  xKey: ScatterAxisKey
  yKey: ScatterAxisKey
  colorMode: 'state' | 'winner'
  winnersByAgs?: Map<string, MapRow>
  lang: 'de' | 'en'
  onPointClick?: (ags: string) => void
}

export function scatterAxisLabel(
  key: ScatterAxisKey,
  lang: 'de' | 'en',
): string {
  if (key === 'turnout') {
    return lang === 'de' ? 'Wahlbeteiligung' : 'Turnout'
  }
  return PARTY_LABELS[key]?.[lang] ?? key
}

export function ScatterPlot({
  rows,
  xKey,
  yKey,
  colorMode,
  winnersByAgs,
  lang,
  onPointClick,
}: ScatterPlotProps) {
  const { c, t, theme } = useTheme()
  const wrapRef = useRef<HTMLDivElement>(null)
  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )

  const data = useMemo(() => {
    return rows.map((r) => {
      const prefix = statePrefixFromAgs(r.ags)
      let fill: string
      if (colorMode === 'state') {
        fill = colorForStatePrefix(prefix)
      } else {
        const w = winnersByAgs?.get(r.ags)?.winning_party ?? 'other'
        fill = partyColors[w] ?? partyColors.other
      }
      return {
        ags: r.ags,
        name: r.name,
        state: r.state,
        x: r.x,
        y: r.y,
        fill,
      }
    })
  }, [rows, colorMode, winnersByAgs, partyColors])

  const exportPng = useCallback(() => {
    const root = wrapRef.current
    if (!root) return
    const svg = root.querySelector('svg')
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const w = svg.clientWidth || 800
      const h = svg.clientHeight || 400
      const canvas = document.createElement('canvas')
      const scale = 2
      canvas.width = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(scale, scale)
      ctx.fillStyle = c.cardBg
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => {
        if (!b) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(b)
        a.download = 'scatter.png'
        a.click()
        URL.revokeObjectURL(a.href)
      })
    }
    img.src = url
  }, [c.cardBg])

  return (
    <div ref={wrapRef} style={{ width: '100%', minHeight: 400 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          type="button"
          onClick={exportPng}
          style={{
            minHeight: 44,
            padding: '0 14px',
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.inputBg,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          {t('exportPng')}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 8 }}>
          <CartesianGrid stroke={c.border} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name={scatterAxisLabel(xKey, lang)}
            tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
            label={{
              value: scatterAxisLabel(xKey, lang),
              position: 'bottom',
              fill: c.muted,
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={scatterAxisLabel(yKey, lang)}
            tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
            label={{
              value: scatterAxisLabel(yKey, lang),
              angle: -90,
              position: 'insideLeft',
              fill: c.muted,
              fontSize: 11,
            }}
          />
          <ZAxis range={[48, 48]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0]?.payload as (typeof data)[0]
              if (!p) return null
              return (
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontFamily: fonts.body,
                    fontSize: 12,
                    color: c.ink,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontFamily: fonts.mono, color: c.inkSoft }}>
                    {scatterAxisLabel(xKey, lang)}:{' '}
                    {p.x.toFixed(1).replace('.', lang === 'de' ? ',' : '.')}%
                  </div>
                  <div style={{ fontFamily: fonts.mono, color: c.inkSoft }}>
                    {scatterAxisLabel(yKey, lang)}:{' '}
                    {p.y.toFixed(1).replace('.', lang === 'de' ? ',' : '.')}%
                  </div>
                </div>
              )
            }}
          />
          <Scatter
            name={t('counties')}
            data={data}
            fill={c.red}
            onClick={(e: unknown) => {
              const p = (e as { payload?: { ags?: string } })?.payload
              if (p?.ags) onPointClick?.(p.ags)
            }}
            shape="circle"
          >
            {data.map((entry, i) => (
              <Cell key={`${entry.ags}-${i}`} fill={entry.fill} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export const SCATTER_AXIS_OPTIONS = AXIS_KEYS
