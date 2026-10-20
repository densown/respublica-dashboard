import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { fontSize, fonts, motion } from '../tokens'
import { useTheme } from '../ThemeContext'
import { stimmFlaeche, textAuf, type StimmArt, type StimmFarben } from '../palettes'


export type VoteBarProps = {
  ja: number
  nein: number
  enthalten: number
  abwesend: number
  /** Hoehe in Pixel. */
  height?: number
  /**
   * Was in den Segmenten steht: nur die Zahl (Fraktionszeilen), Zahl und
   * Wort (Gesamtergebnis) oder nichts. Ein Segment bekommt seine Zahl nur,
   * wenn sie hineinpasst.
   */
  beschriftung?: 'zahl' | 'wort' | 'keine'
  /**
   * Stimmenzahl, die der vollen Breite entspricht. Ohne Angabe fuellt jeder
   * Balken die Breite und zeigt nur Anteile innerhalb der Gruppe; dann wirkt
   * AfD mit 133 von 150 kuerzer als SPD mit 108 von 120. Mit der Groesse der
   * groessten Fraktion ist jede Stimme in allen Zeilen gleich breit, und eine
   * kleine Fraktion hat einen kurzen Balken.
   */
  bezug?: number
  /** Kurzform fuer Screenreader, etwa "527 Ja, 18 Nein, 23 Enthaltungen". */
  ariaLabel: string
  /**
   * Feste Farben statt der des aktuellen Modus. Das Teilbild zur Abstimmung
   * ist immer Papier und Tinte, auch wenn die Seite dunkel ist.
   */
  farben?: StimmFarben
  /** Beim ersten Zeichnen von links einlaufen lassen. */
  animiert?: boolean
  /**
   * Schriftgroesse in Pixel statt Token. Nur fuer das Teilbild, das feste
   * 1080 Pixel breit ist und in dem die Seitengroessen winzig waeren.
   */
  schriftPx?: number
  style?: CSSProperties
}

/** Breite einer Ziffer in IBM Plex Mono, bezogen auf die Schriftgroesse. */
const ZEICHENBREITE = 0.6
const INNENABSTAND = 10

/**
 * Stimmbalken im Stil der Abstimmungskarten: ein durchgehender Balken pro
 * Gruppe, Ja, Nein und Enthaltung als Flaechen, nicht abgestimmt schraffiert.
 * Keine runden Ecken, keine graue Spur dahinter.
 *
 * Die Breite wird gemessen, damit eine Zahl nur dort steht, wo sie Platz hat.
 * Ein Prozent-Schwellwert waere auf dem Handy zu knapp und auf dem Desktop
 * zu grosszuegig.
 */
export function VoteBar({
  ja,
  nein,
  enthalten,
  abwesend,
  height = 28,
  beschriftung = 'zahl',
  bezug,
  ariaLabel,
  farben,
  animiert = true,
  schriftPx,
  style,
}: VoteBarProps) {
  const theme = useTheme()
  const { t } = theme
  const c = farben ?? theme.c
  const ref = useRef<HTMLDivElement>(null)
  const [breite, setBreite] = useState(0)
  // Beim ersten Zeichnen von links einlaufen lassen, danach nur noch Wechsel
  const [gezeigt, setGezeigt] = useState(!animiert)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setBreite(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((eintraege) => {
      const w = eintraege[0]?.contentRect.width
      if (w != null) setBreite(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setGezeigt(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  const gesamt = ja + nein + enthalten + abwesend
  const basis = Math.max(gesamt, bezug ?? 0)
  const pxSchrift = schriftPx ?? (beschriftung === 'wort' ? 13 : 12)
  const schrift = schriftPx ? `${schriftPx}px` : beschriftung === 'wort' ? fontSize.sm : fontSize.xs

  const passtIn = (text: string, platz: number) =>
    text.length * pxSchrift * ZEICHENBREITE + INNENABSTAND <= platz

  const wort: Record<StimmArt, string> = {
    ja: t('yes'),
    nein: t('no'),
    enthalten: t('voteAbstainShort'),
    abwesend: '',
  }

  const segmente = (
    [
      { art: 'ja', n: ja },
      { art: 'nein', n: nein },
      { art: 'enthalten', n: enthalten },
      { art: 'abwesend', n: abwesend },
    ] as { art: StimmArt; n: number }[]
  )
    .filter(({ n }) => n > 0)
    .map(({ art, n }) => {
      const anteil = n / basis
      const text =
        art === 'abwesend' || beschriftung === 'keine'
          ? ''
          : beschriftung === 'wort'
            ? `${n} ${wort[art]}`
            : String(n)
      return { art, n, anteil, text, passt: passtIn(text, anteil * breite) }
    })

  // Kurzer Balken ohne eine einzige Zahl darin, etwa drei Fraktionslose:
  // die Stimmen stehen rechts daneben im freien Platz.
  const daneben =
    bezug != null && beschriftung !== 'keine' && !segmente.some((s) => s.text && s.passt)
      ? segmente
          .filter((s) => s.art !== 'abwesend')
          .map((s) => `${s.n} ${wort[s.art]}`)
          .join(', ')
      : ''
  const zeigeDaneben = daneben !== '' && passtIn(daneben, (1 - gesamt / basis) * breite)

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      style={{ display: 'flex', width: '100%', height, ...style }}
    >
      {gesamt > 0 &&
        segmente.map(({ art, anteil, text, passt }) => {
          const flaeche = stimmFlaeche(art, c)
          return (
            <span
              key={art}
              style={{
                width: gezeigt ? `${anteil * 100}%` : 0,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                background: flaeche,
                color: art === 'abwesend' ? c.muted : textAuf(flaeche),
                fontFamily: fonts.mono,
                fontWeight: 500,
                fontSize: schrift,
                transition: animiert ? `width 0.6s ${motion.easing}` : undefined,
              }}
            >
              {passt ? text : null}
            </span>
          )
        })}
      {zeigeDaneben && gezeigt && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: INNENABSTAND / 2,
            whiteSpace: 'nowrap',
            color: c.muted,
            fontFamily: fonts.mono,
            fontWeight: 500,
            fontSize: schrift,
          }}
        >
          {daneben}
        </span>
      )}
    </div>
  )
}
