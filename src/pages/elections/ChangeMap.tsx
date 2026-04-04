import { useCallback, useMemo, useState } from 'react'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import { changeColor } from './mapColors'
import type { KreiseMapBuild } from './mapGeometry'
import { resolveKreisDisplayName } from './normalizeWahlen'
import type { ChangeRow } from './types'

function normAgs(ags: string): string {
  return ags.replace(/\s/g, '')
}

type ChangeMapProps = {
  mapBuild: KreiseMapBuild | null
  changeByAgs: Map<string, ChangeRow>
  maxAbs: number
  kreisNameByAgs: Map<string, string>
  onSelectAgs: (ags: string) => void
  selectedAgs?: string | null
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
}: ChangeMapProps) {
  const { c, lang, t } = useTheme()
  const [tip, setTip] = useState<{
    x: number
    y: number
    name: string
    line: string
  } | null>(null)

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
      setTip({ x: e.clientX + 12, y: e.clientY + 12, name, line })
    },
    [changeByAgs, kreisNameByAgs, lang, t],
  )

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
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
          {paths.map((p) => (
            <path
              key={p.ags}
              d={p.d}
              fill={fillFor(p.ags)}
              stroke={
                selectedAgs != null && normAgs(selectedAgs) === normAgs(p.ags)
                  ? c.red
                  : c.border
              }
              strokeWidth={
                selectedAgs != null && normAgs(selectedAgs) === normAgs(p.ags)
                  ? 1.75
                  : 0.5
              }
              vectorEffect="non-scaling-stroke"
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => onMove(e, p.ags)}
              onMouseLeave={() => setTip(null)}
              onClick={() => onSelectAgs(p.ags)}
            />
          ))}
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
      {tip && (
        <div
          style={{
            position: 'fixed',
            left: tip.x,
            top: tip.y,
            zIndex: 50,
            padding: '10px 12px',
            background: c.cardBg,
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            boxShadow: c.shadow,
            pointerEvents: 'none',
            fontFamily: fonts.body,
            fontSize: '0.85rem',
            color: c.ink,
            maxWidth: 280,
          }}
        >
          <div style={{ fontWeight: 600 }}>{tip.name}</div>
          <div style={{ fontFamily: fonts.mono, fontSize: '0.8rem', color: c.inkSoft, marginTop: 4 }}>
            {tip.line}
          </div>
        </div>
      )}
    </div>
  )
}

/** Werte sind bereits in Anzeige-Prozent (nach toDisplayPercent im Parent). */
function formatDisplayPct(n: number, lang: 'de' | 'en'): string {
  return `${n.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`
}
