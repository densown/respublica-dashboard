import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '../../design-system'
import { fonts, motion, radius, spacing } from '../../design-system/tokens'

export type ConstituencyFeature = {
  type: 'Feature'
  properties: { nr: number; name: string }
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] }
}

export type ConstituencyGeoJson = {
  type: 'FeatureCollection'
  features: ConstituencyFeature[]
}

type Props = {
  geo: ConstituencyGeoJson
  selected: number | null
  onSelect: (nr: number) => void
  /** Fuellfarbe je Wahlkreisnummer. Fehlt ein Eintrag, bleibt die Flaeche neutral. */
  colorByNr?: Record<number, string>
  ariaLabel: string
  /** Begrenzt die Zeichenflaeche; das Land ist hoeher als breit. */
  maxWidth?: number
}

const VIEW_W = 800
const PAD = 10

// Der Fokusring gehoert an die Karte als Ganzes, nicht an jede angeklickte
// Flaeche — sonst umrandet ein Klick den Wahlkreis zusaetzlich zur Auswahl.
// Inline-Styles koennen :focus-visible nicht, deshalb eine kleine Regel.
const STYLE_ID = 'constituency-map-style'
const CSS = `
.rp-cmap:focus { outline: none; }
.rp-cmap:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; border-radius: 4px; }
.rp-cmap path { outline: none; }
.rp-cmap path:focus { outline: none; }
`

/**
 * Wahlkreiskarte als reines SVG.
 *
 * Bewusst ohne Kartenbibliothek: das Bundle liegt bei 2,3 MB und vendor-map
 * allein bei 1 MB. Fuer eine einzelne Flaeche in fester Ausdehnung reicht eine
 * gleichabstaendige Projektion — der Laengengrad wird mit cos(Breite)
 * gestaucht, sonst wirkt das Land in die Breite gezogen.
 */
export function ConstituencyMap({
  geo,
  selected,
  onSelect,
  colorByNr,
  ariaLabel,
  maxWidth = 340,
}: Props) {
  const { c } = useTheme()
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = CSS
    document.head.appendChild(el)
  }, [])

  const { pfade, viewH, labels } = useMemo(() => {
    let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity
    for (const f of geo.features) {
      for (const poly of f.geometry.coordinates) {
        for (const ring of poly) {
          for (const [lon, lat] of ring) {
            if (lon < lonMin) lonMin = lon
            if (lon > lonMax) lonMax = lon
            if (lat < latMin) latMin = lat
            if (lat > latMax) latMax = lat
          }
        }
      }
    }

    const latMid = ((latMin + latMax) / 2) * (Math.PI / 180)
    const kx = Math.cos(latMid)
    const spanX = (lonMax - lonMin) * kx
    const spanY = latMax - latMin
    const innerW = VIEW_W - PAD * 2
    const scale = innerW / spanX
    const viewH = spanY * scale + PAD * 2

    const px = (lon: number) => PAD + (lon - lonMin) * kx * scale
    // Bildschirm-y waechst nach unten, Breitengrad nach oben — daher gespiegelt.
    const py = (lat: number) => PAD + (latMax - lat) * scale

    const pfade = geo.features.map((f) => {
      let d = ''
      for (const poly of f.geometry.coordinates) {
        for (const ring of poly) {
          ring.forEach(([lon, lat], i) => {
            d += `${i === 0 ? 'M' : 'L'}${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`
          })
          d += 'Z'
        }
      }
      return { nr: f.properties.nr, name: f.properties.name, d }
    })

    // Beschriftung im Schwerpunkt des groessten Rings — der Mittelpunkt der
    // Bounding Box liegt bei gebogenen Wahlkreisen daneben.
    const labels = geo.features.map((f) => {
      let best: number[][] = []
      for (const poly of f.geometry.coordinates) {
        if (poly[0] && poly[0].length > best.length) best = poly[0]
      }
      let sx = 0, sy = 0
      for (const [lon, lat] of best) {
        sx += px(lon)
        sy += py(lat)
      }
      const n = best.length || 1
      return { nr: f.properties.nr, x: sx / n, y: sy / n }
    })

    return { pfade, viewH, labels }
  }, [geo])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (selected == null) return
      const nrs = pfade.map((p) => p.nr).sort((a, b) => a - b)
      const i = nrs.indexOf(selected)
      if (i < 0) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        onSelect(nrs[(i + 1) % nrs.length])
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        onSelect(nrs[(i - 1 + nrs.length) % nrs.length])
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [pfade, selected, onSelect])

  const aktiv = hover ?? selected

  return (
    <div style={{ maxWidth, width: '100%' }}>
      <div
        ref={wrapRef}
        className="rp-cmap"
        tabIndex={0}
        style={{ color: c.red }}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${viewH}`}
          role="group"
          aria-label={ariaLabel}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {pfade.map((p) => {
            const istGewaehlt = p.nr === selected
            const istHover = p.nr === hover
            const grund = colorByNr?.[p.nr]
            return (
              <path
                key={p.nr}
                d={p.d}
                role="button"
                aria-label={`${p.nr} ${p.name}`}
                aria-pressed={istGewaehlt}
                onClick={() => onSelect(p.nr)}
                onMouseEnter={() => setHover(p.nr)}
                onMouseLeave={() => setHover((h) => (h === p.nr ? null : h))}
                style={{
                  fill: grund ?? c.bgAlt,
                  // Auswahl und Hover werden ueber den Rand gezeigt, nicht ueber
                  // die Fuellung — sonst ginge die Einfaerbung verloren.
                  stroke: istGewaehlt ? c.red : istHover ? c.ink : c.border,
                  strokeWidth: istGewaehlt ? 2.5 : istHover ? 1.6 : 0.7,
                  cursor: 'pointer',
                  transition: `stroke ${motion.fast} ${motion.easing}`,
                }}
              >
                <title>{`${p.nr} — ${p.name}`}</title>
              </path>
            )
          })}

          {/* Nummer nur fuer die aktive Flaeche — 41 Zahlen gleichzeitig
              machen die Karte unleserlich. */}
          {labels
            .filter((l) => l.nr === aktiv)
            .map((l) => (
              <g key={l.nr} style={{ pointerEvents: 'none' }}>
                <circle cx={l.x} cy={l.y} r={13} fill={c.ink} opacity={0.85} />
                <text
                  x={l.x}
                  y={l.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    fill: c.bg,
                  }}
                >
                  {l.nr}
                </text>
              </g>
            ))}
        </svg>
      </div>

      <div
        aria-live="polite"
        style={{
          fontFamily: fonts.mono,
          fontSize: '0.72rem',
          color: c.muted,
          marginTop: spacing.xs,
          minHeight: 18,
          padding: aktiv != null ? '3px 7px' : 0,
          borderRadius: radius.sm,
          background: aktiv != null ? c.bgAlt : 'transparent',
          display: 'inline-block',
        }}
      >
        {aktiv != null
          ? `${aktiv} — ${pfade.find((p) => p.nr === aktiv)?.name ?? ''}`
          : ''}
      </div>
    </div>
  )
}
