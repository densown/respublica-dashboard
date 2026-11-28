import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
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
  // Breite der Zeitachse messen: Marken, die sich ueberlappen wuerden, verlieren
  // ihre Beschriftung (der Strich bleibt). Erste und letzte haben Vorrang.
  const achseRef = useRef<HTMLDivElement>(null)
  const [achsenBreite, setAchsenBreite] = useState(0)
  useLayoutEffect(() => {
    const el = achseRef.current
    if (!el) return
    const messen = () => setAchsenBreite(el.clientWidth)
    messen()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const sichtbar = sichtbareMarken(xMarken, achsenBreite)
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
          <div ref={achseRef} aria-hidden style={{ position: 'relative', height: 28, ...schrift }}>
            {xMarken.map((m, i) => {
              const erste = i === 0 && m.pos <= 2
              const letzte = i === xMarken.length - 1 && m.pos >= 98
              return (
                <span key={`${m.pos}${m.text}`}>
                  <span style={{ position: 'absolute', left: `${m.pos}%`, top: 0, height: 5, borderLeft: `1px solid ${c.muted}` }} />
                  {sichtbar.has(i) && (
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
                  )}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Zeichenbreite der Achsenschrift (Festbreite, fontSize.xs) samt Luft zwischen zwei Marken, in Pixel. */
const ZEICHEN = 7.4
const LUFT = 10

/** Welche Marken ihre Beschriftung behalten: erste und letzte zuerst, dann von links jede, die noch Platz hat. */
function sichtbareMarken(marken: XMarke[], breite: number): Set<number> {
  const alle = new Set(marken.map((_, i) => i))
  if (!breite || marken.length < 2) return alle
  const kasten = marken.map((m, i) => {
    const w = m.text.length * ZEICHEN
    const mitte = (m.pos / 100) * breite
    const erste = i === 0 && m.pos <= 2
    const letzte = i === marken.length - 1 && m.pos >= 98
    const links = erste ? mitte : letzte ? mitte - w : mitte - w / 2
    return { links, rechts: links + w }
  })
  const frei = (i: number, belegt: number[]) => belegt.every((j) => kasten[i].rechts + LUFT <= kasten[j].links || kasten[j].rechts + LUFT <= kasten[i].links)
  const behalten: number[] = [0]
  if (frei(marken.length - 1, behalten)) behalten.push(marken.length - 1)
  for (let i = 1; i < marken.length - 1; i++) if (frei(i, behalten)) behalten.push(i)
  return new Set(behalten)
}
