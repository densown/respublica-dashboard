import { useCallback, useMemo, useState } from 'react'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import { mapFillColor } from './mapColors'
import {
  MAIN_PARTIES,
  PARTY_LABELS,
  TURNOUT_SCALE,
  partyColorsForTheme,
} from './partyColors'
import { MAP_VIEW_H, MAP_VIEW_W, type KreiseMapBuild } from './mapGeometry'
import type { Lang } from '../../design-system/ThemeContext'
import { resolveKreisDisplayName, toDisplayPercent } from './normalizeWahlen'
import type { MapRow } from './types'

export type MapTooltipState = {
  x: number
  y: number
  name: string
  line1: string
  winnerLine: string
} | null

type ElectionMapProps = {
  mapBuild: KreiseMapBuild | null
  dataByAgs: Map<string, MapRow>
  /** Kreisnamen aus GeoJSON (Tooltip immer hierher, nicht nur API) */
  kreisNameByAgs: Map<string, string>
  metric: string
  turnoutMin: number
  turnoutMax: number
  lang: Lang
  onSelectAgs: (ags: string) => void
  selectedAgs?: string | null
  comparePickMode?: boolean
  loading?: boolean
}

function normAgs(ags: string): string {
  return ags.replace(/\s/g, '')
}

function formatPct(n: number | undefined, lang: Lang): string {
  if (n === undefined || Number.isNaN(n)) return '—'
  const sep = lang === 'de' ? ',' : '.'
  const v = toDisplayPercent(n)
  return `${v.toFixed(1).replace('.', sep)} %`
}

export function ElectionMap({
  mapBuild,
  dataByAgs,
  kreisNameByAgs,
  metric,
  turnoutMin,
  turnoutMax,
  lang,
  onSelectAgs,
  selectedAgs,
  comparePickMode,
  loading,
}: ElectionMapProps) {
  const { c, t, theme } = useTheme()
  const [tip, setTip] = useState<MapTooltipState>(null)
  const [hoveredAgs, setHoveredAgs] = useState<string | null>(null)

  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )

  const paths = mapBuild?.prepared ?? []
  const vbW = mapBuild?.width ?? MAP_VIEW_W
  const vbH = mapBuild?.height ?? MAP_VIEW_H

  const fillForPath = useCallback(
    (ags: string) => {
      const row = dataByAgs.get(normAgs(ags))
      return mapFillColor({
        metric,
        value: row?.value,
        turnout: row?.turnout,
        winningParty: row?.winning_party,
        turnoutMin,
        turnoutMax,
        partyColors,
      })
    },
    [dataByAgs, metric, turnoutMin, turnoutMax, partyColors],
  )

  const onMove = useCallback(
    (e: React.MouseEvent, ags: string) => {
      const key = normAgs(ags)
      const row = dataByAgs.get(key)
      const name = resolveKreisDisplayName(ags, kreisNameByAgs, row?.ags_name)
      let line1 = ''
      if (metric === 'winning_party') {
        const w = row?.winning_party ?? 'other'
        const label = PARTY_LABELS[w]?.[lang] ?? w
        line1 = `${t('winningParty')}: ${label}`
      } else if (metric === 'turnout') {
        line1 = `${t('turnout')}: ${formatPct(row?.turnout, lang)}`
      } else {
        const pl = PARTY_LABELS[metric]?.[lang] ?? metric
        line1 = `${pl}: ${formatPct(row?.value, lang)}`
      }
      const ww = row?.winning_party ?? 'other'
      const wlab = PARTY_LABELS[ww]?.[lang] ?? ww
      const winnerLine = `${t('winningParty')}: ${wlab}`
      setTip({
        x: e.clientX + 12,
        y: e.clientY + 12,
        name,
        line1,
        winnerLine,
      })
    },
    [dataByAgs, kreisNameByAgs, metric, lang, t],
  )

  const svgInner = useMemo(
    () =>
      paths.map((p) => {
        const key = normAgs(p.ags)
        const isSel = selectedAgs != null && normAgs(selectedAgs) === key
        const isHover = hoveredAgs != null && hoveredAgs === key
        return (
          <path
            key={p.ags}
            d={p.d}
            fill={fillForPath(p.ags)}
            fillOpacity={1}
            stroke={
              isSel ? '#C8102E' : isHover ? (theme === 'dark' ? '#E8E4DC' : '#ffffff') : '#333'
            }
            strokeWidth={isSel || isHover ? 2 : 0.3}
            vectorEffect="non-scaling-stroke"
            style={{
              cursor: comparePickMode ? 'crosshair' : 'pointer',
              transition: 'stroke 0.12s ease, stroke-width 0.12s ease',
            }}
            onMouseEnter={() => setHoveredAgs(key)}
            onMouseMove={(e) => onMove(e, p.ags)}
            onMouseLeave={() => {
              setHoveredAgs(null)
              setTip(null)
            }}
            onClick={() => onSelectAgs(p.ags)}
          />
        )
      }),
    [
      paths,
      fillForPath,
      selectedAgs,
      hoveredAgs,
      comparePickMode,
      onMove,
      onSelectAgs,
      theme,
    ],
  )

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxHeight: '65vh',
        overflow: 'hidden',
      }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${c.cardBg}cc`,
            zIndex: 2,
            fontFamily: fonts.body,
            color: c.muted,
          }}
        >
          {t('loading')}
        </div>
      )}
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Election map"
        style={{
          maxWidth: '100%',
          maxHeight: '65vh',
          display: 'block',
          aspectRatio: `${vbW} / ${vbH}`,
          boxSizing: 'border-box',
          background: c.cardBg,
          borderRadius: 8,
          border: `1px solid ${c.border}`,
        }}
      >
        <g>{svgInner}</g>
      </svg>
      {tip && (
        <div
          style={{
            position: 'fixed',
            left: tip.x,
            top: tip.y,
            zIndex: 50,
            minWidth: 160,
            maxWidth: 280,
            padding: '10px 12px',
            background: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            boxShadow: c.shadow,
            pointerEvents: 'none',
            fontFamily: fonts.body,
            fontSize: '0.875rem',
            color: c.text,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{tip.name}</div>
          <div style={{ color: c.inkSoft, fontFamily: fonts.mono, fontSize: '0.8rem' }}>
            {tip.line1}
          </div>
          <div
            style={{
              marginTop: 6,
              color: c.muted,
              fontFamily: fonts.mono,
              fontSize: '0.75rem',
            }}
          >
            {tip.winnerLine}
          </div>
        </div>
      )}
    </div>
  )
}

export function ElectionMapLegend({
  metric,
  lang,
  turnoutMin,
  turnoutMax,
  partyForScale,
}: {
  metric: string
  lang: Lang
  turnoutMin: number
  turnoutMax: number
  partyForScale?: string
}) {
  const { c, t, theme } = useTheme()
  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )

  if (metric === 'winning_party') {
    const keys = [...MAIN_PARTIES, 'other'] as const
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px 16px',
          marginTop: 12,
          fontFamily: fonts.body,
          fontSize: '0.8rem',
          color: c.inkSoft,
        }}
      >
        {keys.map((k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 2,
                background: partyColors[k] ?? partyColors.other,
                border: `1px solid ${c.border}`,
              }}
            />
            <span>{PARTY_LABELS[k]?.[lang] ?? k}</span>
          </div>
        ))}
      </div>
    )
  }

  if (metric === 'turnout') {
    const steps = [0, 0.25, 0.5, 0.75, 1]
    const sep = lang === 'de' ? ',' : '.'
    const fmt = (v: number) => {
      const x = toDisplayPercent(v)
      return `${x.toFixed(1).replace('.', sep)} %`
    }
    return (
      <div style={{ marginTop: 12, fontFamily: fonts.mono, fontSize: '0.75rem' }}>
        <div style={{ color: c.muted, marginBottom: 6 }}>{t('turnout')}</div>
        <div
          style={{
            display: 'flex',
            height: 14,
            borderRadius: 4,
            overflow: 'hidden',
            border: `1px solid ${c.border}`,
            maxWidth: '100%',
            width: '100%',
          }}
        >
          {TURNOUT_SCALE.map((col, i) => (
            <div key={i} style={{ flex: 1, background: col }} />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            maxWidth: '100%',
            width: '100%',
            marginTop: 4,
            color: c.inkSoft,
          }}
        >
          {steps.map((s) => (
            <span key={s}>{fmt(turnoutMin + s * (turnoutMax - turnoutMin))}</span>
          ))}
        </div>
      </div>
    )
  }

  const party = partyForScale ?? metric
  const base = partyColors[party] ?? partyColors.other
  const label = PARTY_LABELS[party]?.[lang] ?? party
  return (
    <div style={{ marginTop: 12, fontFamily: fonts.mono, fontSize: '0.75rem' }}>
      <div style={{ color: c.muted, marginBottom: 6 }}>{label}</div>
      <div
        style={{
          height: 14,
          borderRadius: 4,
          border: `1px solid ${c.border}`,
          maxWidth: '100%',
          width: '100%',
          background:
            theme === 'dark'
              ? `linear-gradient(90deg, ${c.bgAlt} 0%, ${base} 100%)`
              : `linear-gradient(90deg, #ffffff 0%, ${base} 100%)`,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          maxWidth: '100%',
          width: '100%',
          marginTop: 4,
          color: c.inkSoft,
        }}
      >
        <span>0 %</span>
        <span>20 %</span>
        <span>40 %+</span>
      </div>
    </div>
  )
}
