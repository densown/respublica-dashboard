import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { useTheme } from '../../design-system'
import { fonts, fontSize, spacing } from '../../design-system/tokens'
import type { AchsenSkala } from './skala'

export type XMarke = { pos: number; text: string }

export type DiagrammProps = {
  /** Was die senkrechte Achse misst, mit Einheit: "Tagesmittel in ct/kWh". */
  yTitel: string
  skala: AchsenSkala
  /** Skalenwert als Zahl ohne Einheit, die Einheit steht im Achsentitel. */
  marke: (v: number) => string
  /** Marken der waagerechten Achse, Lage in Prozent der Breite. */
  xMarken: XMarke[]
  hoehe: number
  /** Eigenschaften der Zeichenflaeche, etwa Zeiger- und Tastaturbedienung. */
  flaeche?: HTMLAttributes<HTMLDivElement>
  flaecheStil?: CSSProperties
  children: ReactNode
}

/**
 * Rahmen fuer jedes Europa-Diagramm: Achsentitel mit Einheit, beschriftete
 * runde Skalenwerte mit durchgezogenen Hilfslinien, betonte Nulllinie,
 * Zeitmarken mit Strich. Die Daten zeichnet das Kind in die Flaeche, die
 * genau von skala.lo bis skala.hi reicht.
 *
 * Schrift in HTML, nicht im verzerrten SVG: so bleibt sie ueberall gleich
 * gross.
 */
export function Diagramm({ yTitel, skala, marke, xMarken, hoehe, flaeche, flaecheStil, children }: DiagrammProps) {
  const { c } = useTheme()
  const texte = skala.marken.map(marke)
  const breite = Math.max(...texte.map((s) => s.length), 1)
  const schrift = { fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, whiteSpace: 'nowrap', lineHeight: 1 } as const
  const y = (v: number) => 100 - ((v - skala.lo) / (skala.hi - skala.lo)) * 100
  const hatNull = skala.lo <= 0 && skala.hi >= 0

  return (
    <div>
      <div style={{ ...schrift, whiteSpace: 'normal', lineHeight: 1.5, marginBottom: spacing.md, color: c.inkSoft }}>{yTitel}</div>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        {/* Skalenwerte */}
        <div aria-hidden style={{ position: 'relative', width: `${breite}ch`, height: hoehe, flexShrink: 0, ...schrift }}>
          {skala.marken.map((v, i) => (
            <span key={v} style={{ position: 'absolute', right: 0, top: `${y(v)}%`, transform: 'translateY(-50%)' }}>
              {texte[i]}
            </span>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div {...flaeche} style={{ position: 'relative', height: hoehe, ...flaecheStil }}>
            {/* Hilfslinien: durchgezogen und zurueckhaltend, die Null betont */}
            {skala.marken.map((v) => {
              const nullLinie = v === 0
              const grund = !hatNull && v === skala.lo
              return (
                <div
                  key={v}
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `${y(v)}%`,
                    borderTop: `1px solid ${nullLinie || grund ? c.ink : c.border}`,
                    opacity: nullLinie ? 1 : grund ? 0.55 : 1,
                  }}
                />
              )
            })}
            {children}
          </div>
          {/* Zeitachse: Strich und Beschriftung */}
          <div aria-hidden style={{ position: 'relative', height: 28, ...schrift }}>
            {xMarken.map((m, i) => {
              const erste = i === 0 && m.pos <= 2
              const letzte = i === xMarken.length - 1 && m.pos >= 98
              return (
                <span key={`${m.pos}${m.text}`}>
                  <span style={{ position: 'absolute', left: `${m.pos}%`, top: 0, height: 5, borderLeft: `1px solid ${c.muted}` }} />
                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: `${m.pos}%`,
                      transform: erste ? 'none' : letzte ? 'translateX(-100%)' : 'translateX(-50%)',
                    }}
                  >
                    {m.text}
                  </span>
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
