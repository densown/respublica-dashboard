import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTheme } from '../../design-system'
import { fonts, fontSize, spacing } from '../../design-system/tokens'

export type ZeitreihenReihe = { name: string; farbe: string; werte: (number | null)[] }

export type ZeitreiheProps = {
  /** Beschriftung je Punkt der Zeitachse, schon lesbar formatiert. */
  achse: string[]
  reihen: ZeitreihenReihe[]
  /** Wert mit Einheit, etwa "7,2 ct/kWh". */
  format: (v: number) => string
  /** Skala bei null beginnen (Preise). Sonst knapp unter dem kleinsten Wert. */
  abNull?: boolean
  hoehe?: number
  ariaLabel: string
}

/**
 * Zeitreihe zum Anfassen: eine oder mehrere Linien, Finger oder Maus waehlt
 * einen Zeitpunkt, die Werte dazu stehen mit Einheit in der Zeile darueber.
 * Kein schwebender Tooltip, der auf dem Handy unter dem Finger liegt.
 *
 * Formen in einem verzerrbaren SVG, Schrift in HTML: so bleibt die Schrift
 * auf jedem Bildschirm gleich gross. Pfeiltasten bewegen die Auswahl.
 */
export function Zeitreihe({ achse, reihen, format, abNull, hoehe = 220, ariaLabel }: ZeitreiheProps) {
  const { c } = useTheme()
  const n = achse.length
  const [wahl, setWahl] = useState<number | null>(null)
  const alle = reihen.flatMap((r) => r.werte).filter((v): v is number => v != null)
  if (n < 2 || alle.length === 0) return null
  const idx = Math.min(n - 1, wahl ?? n - 1)

  const min = Math.min(...alle)
  const max = Math.max(...alle)
  const rand = (max - min || Math.abs(max) || 1) * 0.08
  const lo = abNull ? Math.min(0, min) : min - rand
  const hi = max + rand
  const x = (i: number) => (i / (n - 1)) * 100
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100

  // Luecken unterbrechen die Linie
  const stuecke = (werte: (number | null)[]) => {
    const teile: string[] = []
    let lauf: string[] = []
    werte.forEach((v, i) => {
      if (v == null) {
        if (lauf.length > 1) teile.push(lauf.join(' '))
        lauf = []
      } else lauf.push(`${x(i).toFixed(2)},${y(v).toFixed(2)}`)
    })
    if (lauf.length > 1) teile.push(lauf.join(' '))
    return teile
  }

  const zeigen = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const anteil = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    setWahl(Math.round(anteil * (n - 1)))
  }
  const taste = (e: KeyboardEvent<HTMLDivElement>) => {
    const schritt = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (!schritt) return
    e.preventDefault()
    setWahl(Math.min(n - 1, Math.max(0, idx + schritt)))
  }

  const schrift = { fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, whiteSpace: 'nowrap' } as const

  return (
    <figure style={{ margin: 0, maxWidth: 760 }}>
      {/* Ablesezeile: Zeitpunkt und Werte mit Einheit */}
      <div
        aria-live="polite"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          gap: `${spacing.xs}px ${spacing.lg}px`,
          minHeight: 44,
          marginBottom: spacing.sm,
          fontFamily: fonts.mono,
          fontSize: fontSize.sm,
          color: c.ink,
        }}
      >
        <strong>{achse[idx]}</strong>
        {reihen.map((r) => {
          const v = r.werte[idx]
          return (
            <span key={r.name} style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}>
              <span aria-hidden style={{ width: 14, height: 3, background: r.farbe, flexShrink: 0 }} />
              {reihen.length > 1 && <span style={{ color: c.inkSoft }}>{r.name}</span>}
              <strong>{v == null ? '·' : format(v)}</strong>
            </span>
          )
        })}
      </div>

      <div style={{ ...schrift, marginBottom: spacing.xs }}>{format(hi)}</div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={n - 1}
        aria-valuenow={idx}
        aria-valuetext={`${achse[idx]}: ${reihen.map((r) => `${r.name} ${r.werte[idx] == null ? '' : format(r.werte[idx] as number)}`).join(', ')}`}
        onPointerDown={zeigen}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse' || e.buttons > 0 || e.pointerType === 'touch') zeigen(e)
        }}
        onKeyDown={taste}
        style={{
          position: 'relative',
          height: hoehe,
          borderTop: `1px dashed ${c.border}`,
          borderBottom: `1px solid ${c.ink}`,
          touchAction: 'pan-y',
          cursor: 'crosshair',
        }}
      >
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          {abNull && lo < 0 && (
            <line x1="0" x2="100" y1={y(0)} y2={y(0)} stroke={c.muted} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
          {reihen.map((r) =>
            stuecke(r.werte).map((punkte, i) => (
              <polyline
                key={`${r.name}${i}`}
                points={punkte}
                fill="none"
                stroke={r.farbe}
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )),
          )}
        </svg>
        <span style={{ ...schrift, position: 'absolute', left: 0, bottom: 2, background: c.bg, paddingRight: spacing.xs }}>
          {format(lo)}
        </span>
        {/* Auswahl: Linie und ein Punkt je Reihe */}
        <div
          aria-hidden
          style={{ position: 'absolute', top: 0, bottom: 0, left: `${x(idx)}%`, borderLeft: `1px solid ${c.ink}`, opacity: 0.5 }}
        />
        {reihen.map((r) => {
          const v = r.werte[idx]
          if (v == null) return null
          return (
            <span
              key={r.name}
              aria-hidden
              style={{
                position: 'absolute',
                left: `${x(idx)}%`,
                top: `${y(v)}%`,
                width: 9,
                height: 9,
                borderRadius: 999,
                background: r.farbe,
                border: `2px solid ${c.bg}`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )
        })}
      </div>
      <div style={{ ...schrift, display: 'flex', justifyContent: 'space-between', marginTop: spacing.xs }}>
        <span>{achse[0]}</span>
        <span>{achse[n - 1]}</span>
      </div>
    </figure>
  )
}
