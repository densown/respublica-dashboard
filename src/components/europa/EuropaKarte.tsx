import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../design-system'
import { fonts, fontSize } from '../../design-system/tokens'
import { landPfad } from './laender'
import type { KartenDaten } from './typen'

export type EuropaKarteProps = {
  karte: KartenDaten
  /** Flaechenfarbe eines Landes mit Seite. Ohne Wert: Papierton. */
  farbe?: (iso2: string) => string | null | undefined
  /** Zahl auf dem Land, etwa der Preis. Steht nur, wo das Land gross genug ist. */
  beschriftung?: (iso2: string) => string | null | undefined
  /** Text fuer Vorlesehilfen und Tooltip, etwa "Polen: 8,7 ct/kWh". */
  ariaText?: (iso2: string) => string
  /** Dieses Land hervorheben (Lagekarte auf der Laenderseite). */
  hervor?: string
  /** Lagekarte: keine Links, keine Beschriftung. */
  still?: boolean
  /** Schmale Darstellung: nur grosse Laender beschriften. */
  schmal?: boolean
  /** Zeile oben links in der Karte: was die Zahlen bedeuten, mit Einheit. */
  kopf?: ReactNode
  ariaLabel: string
}

/**
 * Europa mit echten Laendergrenzen als SVG. Laender mit eigener Seite sind
 * Links; die Zahlen stehen als HTML ueber der Karte, damit die Schrift auf
 * dem Handy nicht mit der Karte schrumpft. Kleine Laender (Luxemburg, Malta)
 * trifft kein Finger: dafuer steht unter der Karte immer die Laenderliste.
 */
export function EuropaKarte({ karte, farbe, beschriftung, ariaText, hervor, still, schmal, kopf, ariaLabel }: EuropaKarteProps) {
  const { c } = useTheme()
  const navigate = useNavigate()
  const grenze = schmal ? 0.0042 : 0.0015

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: `${karte.breite} / ${karte.hoehe}` }}>
      <svg
        viewBox={`0 0 ${karte.breite} ${karte.hoehe}`}
        role={still ? 'img' : 'group'}
        aria-label={ariaLabel}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      >
        {karte.laender.map((land) => {
          const aktiv = land.seite && !still
          // Ohne Wert: Papier mit etwas Tinte, damit das Land sichtbar bleibt
          const leer = `color-mix(in srgb, ${c.ink} ${land.seite ? 13 : 6}%, ${c.bg})`
          const fuellung = still ? (land.iso2 === hervor ? c.red : leer) : land.seite ? (farbe?.(land.iso2) ?? leer) : leer
          const form = (
            <path
              d={land.d}
              fill={fuellung}
              stroke={c.bg}
              strokeWidth={still ? 2 : 1.2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )
          if (!aktiv) return <g key={land.iso2}>{form}</g>
          const text = ariaText?.(land.iso2) ?? land.name
          return (
            <a
              key={land.iso2}
              href={landPfad(land.iso2)}
              aria-label={text}
              className="rp-kartenland"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return
                e.preventDefault()
                navigate(landPfad(land.iso2))
              }}
            >
              <title>{text}</title>
              {form}
            </a>
          )
        })}
      </svg>
      {!still &&
        beschriftung &&
        karte.laender
          .filter((land) => land.seite && land.flaeche >= grenze)
          .map((land) => {
            const text = beschriftung(land.iso2)
            if (!text) return null
            return (
              <span
                key={land.iso2}
                aria-hidden
                style={{
                  position: 'absolute',
                  left: `${land.x * 100}%`,
                  top: `${land.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  fontFamily: fonts.mono,
                  fontWeight: 700,
                  fontSize: schmal ? fontSize.micro : fontSize.xs,
                  fontVariantNumeric: 'tabular-nums',
                  color: c.ink,
                  whiteSpace: 'nowrap',
                  textShadow: `0 0 3px ${c.bg}, 0 0 3px ${c.bg}`,
                }}
              >
                {text}
              </span>
            )
          })}
      {kopf && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            maxWidth: '46%',
            fontFamily: fonts.mono,
            fontSize: fontSize.xs,
            lineHeight: 1.4,
            color: c.ink,
            pointerEvents: 'none',
          }}
        >
          {kopf}
        </div>
      )}
    </div>
  )
}
