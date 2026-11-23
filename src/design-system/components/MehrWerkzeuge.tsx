import { useId, type ReactNode } from 'react'
import { fonts, fontSize, lineHeight, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { Piktogramm } from './Piktogramm'

export type MehrWerkzeugeProps = {
  /** Eindeutiger Name der Seite, damit der Zustand je Seite gemerkt wird. */
  merkname: string
  /** Ueberschrift der Klappe, etwa "Mehr Werkzeuge". */
  titel: string
  /** Ein Satz, was dahinter liegt. */
  text?: string
  children: ReactNode
}

/**
 * Zweite Tiefe einer Seite. Der erste Blick zeigt Aussage, Grafik und Liste;
 * Analysewerkzeuge, Karten und Verlaeufe liegen hinter dieser Klappe. Wer sie
 * einmal geoeffnet hat, sieht sie beim naechsten Besuch gleich offen.
 */
export function MehrWerkzeuge({ merkname, titel, text, children }: MehrWerkzeugeProps) {
  const { c } = useTheme()
  const [offen, setOffen] = useLocalStorage<boolean>(`rp-werkzeuge-${merkname}`, false)
  const id = useId()
  return (
    <section style={{ marginBottom: spacing.xxl }}>
      <button
        type="button"
        aria-expanded={offen}
        aria-controls={id}
        onClick={() => setOffen(!offen)}
        className="rp-zeile"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          width: '100%',
          minHeight: 56,
          padding: `${spacing.md}px 0`,
          border: 'none',
          borderTop: `2px solid ${c.ink}`,
          borderBottom: offen ? 'none' : `1px solid ${c.border}`,
          background: 'transparent',
          color: c.ink,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span>
          <span style={{ display: 'block', fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.xl, lineHeight: lineHeight.tight }}>
            {titel}
          </span>
          {text && (
            <span style={{ display: 'block', marginTop: spacing.xs, fontFamily: fonts.body, fontSize: fontSize.md, color: c.muted, lineHeight: lineHeight.normal }}>
              {text}
            </span>
          )}
        </span>
        <span
          aria-hidden
          style={{ color: c.red, transform: offen ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }}
        >
          <Piktogramm name="pfeil" size={20} />
        </span>
      </button>
      {offen && (
        <div id={id} style={{ paddingTop: spacing.lg }}>
          {children}
        </div>
      )}
    </section>
  )
}
