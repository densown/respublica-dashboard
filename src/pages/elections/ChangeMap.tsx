import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import { changeColor } from './mapColors'
import type { KreiseMapBuild } from './mapGeometry'
import { resolveKreisDisplayName } from './normalizeWahlen'
import type { ChangeRow } from './types'

function normAgs(ags: string): string {
  return ags.replace(/\s/g, '')
}

function agsDataAttr(ags: string): string {
  const n = normAgs(ags)
  try {
    return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(n) : n
  } catch {
    return n
  }
}

type ChangeMapProps = {
  mapBuild: KreiseMapBuild | null
  changeByAgs: Map<string, ChangeRow>
  maxAbs: number
  kreisNameByAgs: Map<string, string>
  onSelectAgs: (ags: string) => void
  selectedAgs?: string | null
  /** Wenn gesetzt: andere Bundesländer mit niedriger Opazität. */
  filterStatePrefix?: string | null
}

function formatDeltaPp(n: number, lang: 'de' | 'en'): string {
  const sep = lang === 'de' ? ',' : '.'
  if (n > 0) return `+${n.toFixed(1).replace('.', sep)} Pp`
  if (n < 0) {
    const s = Math.abs(n).toFixed(1).replace('.', sep)
    return `${lang === 'de' ? '−' : '-'}${s} Pp`
  }
  return `${(0).toFixed(1).replace('.', sep)} Pp`
}

export function ChangeMap({
  mapBuild,
  changeByAgs,
  maxAbs,
  kreisNameByAgs,
  onSelectAgs,
  selectedAgs,
  filterStatePrefix,
}: ChangeMapProps) {
  const { c, lang, t, theme } = useTheme()
  const svgRef = useRef<SVGSVGElement>(null)
  const [layoutTick, setLayoutTick] = useState(0)
  const [hoverTip, setHoverTip] = useState<{
    x: number
    y: number
    name: string
    line: string
  } | null>(null)
  const [zoomVB, setZoomVB] = useState<[number, number, number, number] | null>(null)
  const [pinPos, setPinPos] = useState<{ x: number; y: number } | null>(null)

  const paths = mapBuild?.prepared ?? []
  const borders = mapBuild?.borderSegments ?? []
  const vbW = mapBuild?.width ?? 520
  const vbH = mapBuild?.height ?? 680

  const neutral = useMemo(() => c.border, [c.border])

  const fillFor = useCallback(
    (ags: string) => {
      const row = changeByAgs.get(normAgs(ags))
      if (!row) return c.bgHover
      return changeColor(row.change, maxAbs, neutral)
    },
    [changeByAgs, maxAbs, neutral, c.bgHover],
  )

  const onMove = useCallback(
    (e: React.MouseEvent, ags: string) => {
      const key = normAgs(ags)
      const row = changeByAgs.get(key)
      const name = resolveKreisDisplayName(ags, kreisNameByAgs, row?.name)
      const line = row
        ? `${formatDeltaPp(row.change, lang)} (${formatDisplayPct(row.value_from, lang)} → ${formatDisplayPct(row.value_to, lang)})`
        : t('noData')
      setHoverTip({ x: e.clientX + 12, y: e.clientY + 12, name, line })
    },
    [changeByAgs, kreisNameByAgs, lang, t],
  )

  useEffect(() => {
    const onResize = () => setLayoutTick((n) => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg || !selectedAgs) {
      setZoomVB(null)
      setPinPos(null)
      return
    }
    const sel = normAgs(selectedAgs)
    const path = svg.querySelector(`path[data-ags="${agsDataAttr(sel)}"]`) as
      | SVGGraphicsElement
      | null
    if (!path) {
      setZoomVB(null)
      setPinPos(null)
      return
    }
    const b = path.getBBox()
    const padBase = Math.max(b.width, b.height) * 0.35 || 24
    const pad = Math.max(padBase, 16)
    let vx = b.x - pad
    let vy = b.y - pad
    let vw = b.width + 2 * pad
    let vh = b.height + 2 * pad
    const minSpan = 48
    if (vw < minSpan) {
      vx -= (minSpan - vw) / 2
      vw = minSpan
    }
    if (vh < minSpan) {
      vy -= (minSpan - vh) / 2
      vh = minSpan
    }
    setZoomVB([vx, vy, vw, vh])
    const r = path.getBoundingClientRect()
    setPinPos({ x: r.left + r.width / 2, y: r.bottom })
  }, [selectedAgs, paths.length, layoutTick])

  const pinnedContent = useMemo(() => {
    if (!selectedAgs) return null
    const key = normAgs(selectedAgs)
    const row = changeByAgs.get(key)
    const name = resolveKreisDisplayName(selectedAgs, kreisNameByAgs, row?.name)
    const line = row
      ? `${formatDeltaPp(row.change, lang)} (${formatDisplayPct(row.value_from, lang)} → ${formatDisplayPct(row.value_to, lang)})`
      : t('noData')
    return { name, line }
  }, [selectedAgs, changeByAgs, kreisNameByAgs, lang, t])

  const activeTip = hoverTip
    ? { mode: 'hover' as const, ...hoverTip }
    : pinnedContent && pinPos
      ? {
          mode: 'pin' as const,
          x: pinPos.x,
          y: pinPos.y,
          name: pinnedContent.name,
          line: pinnedContent.line,
        }
      : null

  const viewBoxStr =
    zoomVB != null
      ? `${zoomVB[0]} ${zoomVB[1]} ${zoomVB[2]} ${zoomVB[3]}`
      : `0 0 ${vbW} ${vbH}`

  const legendNeutral = theme === 'dark' ? c.bgHover : neutral
  const legendLeft = changeColor(-maxAbs, maxAbs, legendNeutral)
  const legendRight = changeColor(maxAbs, maxAbs, legendNeutral)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={viewBoxStr}
        role="img"
        aria-label="Change map"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          maxHeight: 600,
          display: 'block',
          background: c.cardBg,
          borderRadius: 8,
          border: `1px solid ${c.border}`,
        }}
      >
        <g>
          {paths.map((p) => {
            const dim =
              filterStatePrefix != null &&
              filterStatePrefix !== '' &&
              p.statePrefix !== filterStatePrefix
            const selected = selectedAgs != null && normAgs(selectedAgs) === normAgs(p.ags)
            return (
              <path
                key={p.ags}
                data-ags={normAgs(p.ags)}
                d={p.d}
                fill={fillFor(p.ags)}
                opacity={dim ? 0.3 : 1}
                stroke={selected ? c.red : c.border}
                strokeWidth={selected ? 3 : 0.5}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => onMove(e, p.ags)}
                onMouseLeave={() => setHoverTip(null)}
                onClick={() => onSelectAgs(p.ags)}
              />
            )
          })}
        </g>
        <g>
          {borders.map((seg, i) => (
            <line
              key={i}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={c.ink}
              strokeOpacity={0.28}
              strokeWidth={0.9}
              pointerEvents="none"
            />
          ))}
        </g>
      </svg>
      {activeTip && (
        <div
          style={{
            position: 'fixed',
            left: activeTip.x,
            top: activeTip.y,
            transform: activeTip.mode === 'pin' ? 'translate(-50%, 8px)' : 'none',
            zIndex: 50,
            padding: '10px 12px',
            background: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            boxShadow: c.shadow,
            pointerEvents: 'none',
            fontFamily: fonts.body,
            fontSize: '0.85rem',
            color: c.text,
            maxWidth: 280,
          }}
        >
          <div style={{ fontWeight: 600 }}>{activeTip.name}</div>
          <div style={{ fontFamily: fonts.mono, fontSize: '0.8rem', color: c.inkSoft, marginTop: 4 }}>
            {activeTip.line}
          </div>
        </div>
      )}
      <div style={{ width: '100%', maxWidth: '100%', marginTop: 14 }}>
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            height: 20,
            borderRadius: 4,
            background: `linear-gradient(to right, ${legendLeft}, ${legendNeutral}, ${legendRight})`,
            border: `1px solid ${c.border}`,
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontFamily: fonts.mono,
            fontSize: '0.72rem',
            color: c.muted,
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <span>{formatDeltaPp(-maxAbs, lang)}</span>
          <span>0</span>
          <span>{formatDeltaPp(maxAbs, lang)}</span>
        </div>
      </div>
    </div>
  )
}

/** Werte sind bereits in Anzeige-Prozent (nach toDisplayPercent im Parent). */
function formatDisplayPct(n: number, lang: 'de' | 'en'): string {
  return `${n.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`
}
