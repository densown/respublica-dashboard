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
  /** Optionale Einfaerbung je Wahlkreis, etwa nach fuehrender Partei. */
  colorByNr?: Record<number, string>
  ariaLabel: string
}

const VIEW_W = 800
const PAD = 12

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
}: Props) {
  const { c } = useTheme()
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

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
    const innerH = spanY * scale
    const viewH = innerH + PAD * 2

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

    // Beschriftung im Flaechenschwerpunkt des groessten Rings — der Mittelpunkt
    // der Bounding Box liegt bei gebogenen Wahlkreisen leicht daneben.
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

  // Tastaturbedienung: Pfeiltasten wandern durch die Wahlkreisnummern.
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
    <div ref={wrapRef} tabIndex={0} style={{ outline: 'none' }}>
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
              tabIndex={-1}
              aria-label={`${p.nr} ${p.name}`}
              aria-pressed={istGewaehlt}
              onClick={() => onSelect(p.nr)}
              onMouseEnter={() => setHover(p.nr)}
              onMouseLeave={() => setHover((h) => (h === p.nr ? null : h))}
              style={{
                fill: istGewaehlt
                  ? c.red
                  : grund
                    ? grund
                    : istHover
                      ? c.bgHover
                      : c.bgAlt,
                fillOpacity: istGewaehlt ? 1 : grund && !istHover ? 0.85 : 1,
                stroke: istGewaehlt ? c.red : c.border,
                strokeWidth: istGewaehlt ? 2 : 0.8,
                cursor: 'pointer',
                transition: `fill ${motion.fast} ${motion.easing}`,
              }}
            >
              <title>{`${p.nr} — ${p.name}`}</title>
            </path>
          )
        })}

        {/* Nummern erst ab der Auswahl bzw. beim Ueberfahren — 41 Zahlen
            gleichzeitig machen die Karte unleserlich. */}
        {labels.map((l) => {
          const zeigen = l.nr === aktiv
          if (!zeigen) return null
          return (
            <text
              key={l.nr}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontFamily: fonts.mono,
                fontSize: 15,
                fontWeight: 700,
                fill: l.nr === selected ? '#FFFFFF' : c.ink,
                pointerEvents: 'none',
              }}
            >
              {l.nr}
            </text>
          )
        })}
      </svg>

      {/* Was gerade unter dem Zeiger liegt — ohne Tooltip-Gefummel */}
      <div
        aria-live="polite"
        style={{
          fontFamily: fonts.mono,
          fontSize: '0.74rem',
          color: c.muted,
          marginTop: spacing.sm,
          minHeight: 20,
          padding: `4px 8px`,
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
