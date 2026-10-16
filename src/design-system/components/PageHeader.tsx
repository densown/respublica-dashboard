import type { ReactNode } from 'react'
import { fonts, fontSize, lineHeight, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type PageHeaderProps = {
  title: string
  subtitle?: string
  /**
   * Kurze Einordnung ueber dem Titel, kursiv wie auf den Abstimmungskarten.
   * Etwa "Sonntagsfrage" oder "Namentliche Abstimmung, 8. Oktober 2026".
   */
  kicker?: string
  /** Metazeile unter dem Titel: Datum, Anzahl, Stand. Mono, gedaempft. */
  meta?: ReactNode
}

/** Titel, hinter die kein roter Schlusspunkt mehr passt. */
const ENDET_MIT_ZEICHEN = /[.!?:)\]"“”»]$/

/**
 * Seitenkopf. Jede Seite benutzt diese Komponente — kein eigenes <h1>.
 * Siehe docs/DESIGN.md, Abschnitt 5.
 *
 * `kicker` und `meta` sind nachtraeglich ergaenzt, damit redaktionelle Seiten
 * ihren Vorspann nicht selbst bauen muessen. Genau das hatten zwei Seiten
 * getan und fielen dadurch als einzige aus der Reihe.
 */
export function PageHeader({ title, subtitle, kicker, meta }: PageHeaderProps) {
  const { c } = useTheme()

  return (
    <header style={{ marginBottom: spacing.xl }}>
      {kicker && (
        <div
          style={{
            // Frueher Mono in roten Versalien. Kursiv in der Textschrift liest
            // sich wie eine Zeitungszeile und nicht wie ein Etikett.
            fontFamily: fonts.body,
            fontStyle: 'italic',
            fontSize: fontSize.base,
            lineHeight: lineHeight.normal,
            color: c.inkSoft,
            marginBottom: spacing.sm,
          }}
        >
          {kicker}
        </div>
      )}

      <h1
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          // clamp haelt den Titel vom Handy bis zum Desktop im Rahmen; die
          // Grenzen entsprechen fontSize.xxl und fontSize.hero.
          fontSize: `clamp(${fontSize.xxl}, 4.5vw, ${fontSize.hero})`,
          color: c.ink,
          lineHeight: lineHeight.tight,
          maxWidth: '22ch',
        }}
      >
        {title}
        {/* Kein Punkt hinter Fragezeichen oder Klammer, etwa bei Abstimmungstiteln */}
        {!ENDET_MIT_ZEICHEN.test(title) && (
          <span style={{ color: c.red }} aria-hidden>
            .
          </span>
        )}
      </h1>

      {subtitle && (
        <p
          style={{
            marginTop: spacing.sm,
            fontFamily: fonts.body,
            fontSize: fontSize.lg,
            lineHeight: lineHeight.normal,
            color: c.muted,
            maxWidth: '68ch',
          }}
        >
          {subtitle}
        </p>
      )}

      {meta && (
        <p
          style={{
            marginTop: spacing.md,
            marginBottom: 0,
            fontFamily: fonts.mono,
            fontSize: fontSize.xs,
            lineHeight: lineHeight.relaxed,
            color: c.muted,
          }}
        >
          {meta}
        </p>
      )}
    </header>
  )
}
