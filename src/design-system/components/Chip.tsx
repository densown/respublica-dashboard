import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { fonts, fontSize, radius, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

/**
 * Fokusring nur bei Tastaturbedienung. Inline-Styles koennen :focus-visible
 * nicht ausdruecken, deshalb eine einmal eingefuegte Regel. Ohne sie umrandet
 * der Browser jeden angeklickten Chip — der haeufigste Grund fuer den
 * Eindruck, dass "beim Klicken ein Rahmen erscheint".
 */
const STYLE_ID = 'rp-chip-style'
const CSS = `
.rp-chip:focus { outline: none; }
.rp-chip:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
`

function useFocusStyle() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = CSS
    document.head.appendChild(el)
  }, [])
}

export type ChipProps = {
  label: ReactNode
  active?: boolean
  onClick: () => void
  /** Farbpunkt vor dem Text, etwa die Parteifarbe. */
  dot?: string
  title?: string
  disabled?: boolean
  /** Gedrungenere Variante fuer dichte Leisten. Touch-Ziel bleibt 44 px. */
  dense?: boolean
  style?: CSSProperties
}

/**
 * Auswahl-Chip: Filter, Umschaltung, Auswahl aus einer Menge.
 *
 * Erfuellt von sich aus die Pflichten aus docs/DESIGN.md, Abschnitt 6 —
 * 44 px Touch-Ziel, Fokusring nur bei Tastatur, aktiver Zustand ueber Rand
 * und Schriftstaerke statt allein ueber Farbe. Der Bestand hatte 96 inline
 * gebaute Knoepfe, von denen keiner alle drei erfuellte.
 *
 * Ab etwa zwoelf Auswahlmoeglichkeiten kein Chip-Feld mehr, sondern ein
 * Auswahlfeld.
 */
export function Chip({
  label,
  active = false,
  onClick,
  dot,
  title,
  disabled,
  dense,
  style,
}: ChipProps) {
  const { c } = useTheme()
  useFocusStyle()

  return (
    <button
      type="button"
      className="rp-chip"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.sm,
        fontFamily: fonts.mono,
        fontSize: dense ? fontSize.micro : fontSize.sm,
        letterSpacing: '0.02em',
        // Waagerecht knapper, senkrecht nie unter 44 px — Zeigegenauigkeit
        // ist keine Frage des Geraets.
        padding: dense ? `0 ${spacing.md}px` : `0 ${spacing.lg}px`,
        minHeight: 44,
        borderRadius: radius.pill,
        border: `1px solid ${active ? c.red : c.border}`,
        background: active ? c.red : 'transparent',
        color: active ? c.badgeText : c.inkSoft,
        fontWeight: active ? 700 : 400,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && (
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            borderRadius: radius.xs,
            background: dot,
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </button>
  )
}
