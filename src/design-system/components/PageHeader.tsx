import type { ReactNode } from 'react'
import { fonts, fontSize, lineHeight, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type PageHeaderProps = {
  title: string
  subtitle?: string
  /** Kurze Einordnung ueber dem Titel, in Versalien. Etwa "Sonntagsfrage". */
  kicker?: string
  /** Metazeile unter dem Titel: Datum, Anzahl, Stand. Mono, gedaempft. */
  meta?: ReactNode
}

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
            fontFamily: fonts.mono,
            fontSize: fontSize.micro,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: c.red,
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
        <span style={{ color: c.red }} aria-hidden>
          .
        </span>
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
