import type { CSSProperties } from 'react'
import { fonts } from '../tokens'
import { useTheme } from '../ThemeContext'
import type { StimmFarben } from '../palettes'

export type StempelArt = 'ja' | 'nein' | 'neutral'

export type StempelProps = {
  wort: string
  art?: StempelArt
  /** Schriftgroesse in Pixel. Der Stempel waechst mit. */
  groesse?: number
  /** Ohne Stempelbewegung, etwa in langen Listen. */
  ruhig?: boolean
  /** Feste Farben statt der des aktuellen Modus (Teilbild). */
  farben?: Pick<StimmFarben, 'yes' | 'no'> & { ink: string }
  style?: CSSProperties
}

/**
 * Ergebnis als Stempel: "Angenommen", "Abgelehnt", "Geaendert". Leicht
 * schraeg gesetzt, wie von Hand aufgedrueckt. Das Erkennungszeichen der App,
 * es steht auf der Seite, in der Liste und auf dem Bild zum Teilen.
 *
 * Versalien sind hier Absicht: ein Stempel ist ein Etikett, anders als die
 * Zeilen ueber Titeln (docs/DESIGN.md, Abschnitt 5).
 */
export function Stempel({ wort, art = 'neutral', groesse = 12, ruhig, farben, style }: StempelProps) {
  const theme = useTheme()
  const c = farben ?? theme.c
  const farbe = art === 'ja' ? c.yes : art === 'nein' ? c.no : c.ink
  return (
    <span
      className={ruhig ? undefined : 'rp-stempel'}
      style={{
        display: 'inline-block',
        padding: `${Math.round(groesse * 0.3)}px ${Math.round(groesse * 0.75)}px`,
        border: `${Math.max(1.5, groesse / 7)}px solid ${farbe}`,
        borderRadius: 3,
        // Zweite, feine Linie innen wie bei einem Gummistempel
        boxShadow: `inset 0 0 0 ${Math.max(2, groesse / 5)}px transparent, inset 0 0 0 ${Math.max(3, groesse / 5 + 1)}px ${farbe}`,
        color: farbe,
        fontFamily: fonts.display,
        fontWeight: 900,
        fontSize: groesse,
        lineHeight: 1.15,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        transform: 'rotate(-3deg)',
        transformOrigin: 'center',
        userSelect: 'none',
        ...style,
      }}
    >
      {wort}
    </span>
  )
}
