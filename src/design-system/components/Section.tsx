import type { CSSProperties, ReactNode } from 'react'
import { fonts, fontSize, lineHeight, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type SectionProps = {
  /** Ueberschrift des Abschnitts. Ohne Titel ist es nur ein Abstandhalter. */
  title?: string
  /** Rechts neben der Ueberschrift: Anzahl, Stand, kleiner Umschalter. */
  aside?: ReactNode
  /** Erklaerung unter dem Inhalt — Legende, Methodenhinweis, Quelle. */
  note?: ReactNode
  children: ReactNode
  /** Letzter Abschnitt einer Seite: kein Abstand nach unten. */
  last?: boolean
  style?: CSSProperties
}

/**
 * Ein Abschnitt einer Seite: Ueberschrift, Inhalt, optionale Erklaerung.
 *
 * Es gibt genau diese eine Sorte Abschnittsueberschrift. Der Bestand hatte
 * vier nebeneinander (SectionDivider, h2, h3, Mono-Label), was der
 * Hauptgrund dafuer war, dass Seiten nicht wie ein Stueck wirkten.
 * Siehe docs/DESIGN.md, Abschnitt 5.
 */
export function Section({ title, aside, note, children, last, style }: SectionProps) {
  const { c } = useTheme()

  return (
    <section
      style={{
        marginBottom: last ? 0 : spacing.xxl,
        ...style,
      }}
    >
      {(title || aside) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: spacing.md,
            flexWrap: 'wrap',
            marginBottom: spacing.lg,
            paddingBottom: spacing.sm,
            borderBottom: `1px solid ${c.border}`,
          }}
        >
          {title && (
            <h2
              style={{
                fontFamily: fonts.display,
                fontSize: fontSize.xl,
                lineHeight: lineHeight.tight,
                color: c.ink,
                margin: 0,
              }}
            >
              {title}
            </h2>
          )}
          {aside && (
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSize.xs,
                color: c.muted,
              }}
            >
              {aside}
            </div>
          )}
        </div>
      )}

      {children}

      {note && (
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: fontSize.md,
            lineHeight: lineHeight.relaxed,
            color: c.muted,
            margin: 0,
            marginTop: spacing.md,
            maxWidth: '68ch',
          }}
        >
          {note}
        </p>
      )}
    </section>
  )
}
