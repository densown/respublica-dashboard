import type { ReactNode } from 'react'
import { fonts, fontSize } from '../tokens'
import { useTheme } from '../ThemeContext'

export type FundstelleProps = {
  /** Etwa "BT-Drs. 21/9164", "BGBl. 2026 I Nr. 318", "BGH, VIII ZR 180/26". */
  children: ReactNode
  /** Adresse des Originals. Ohne sie bleibt die Fundstelle reiner Text. */
  href?: string | null
  title?: string
}

/**
 * Fundstelle, gesetzt wie in einer Fussnote: Drucksache, Bundesgesetzblatt,
 * Aktenzeichen, CELEX-Nummer. Ersetzt farbige Etiketten. Mit Adresse
 * fuehrt ein Tipp zum Original.
 */
export function Fundstelle({ children, href, title }: FundstelleProps) {
  const { c } = useTheme()
  const stil = {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    fontVariantNumeric: 'tabular-nums',
    color: c.inkSoft,
    whiteSpace: 'nowrap',
  } as const
  if (!href) return <span style={stil} title={title}>{children}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="rp-fundstelle"
      style={{
        ...stil,
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
        textUnderlineOffset: 3,
        textDecorationColor: c.subtle,
      }}
    >
      {children}
      <span aria-hidden style={{ marginLeft: 3, color: c.subtle }}>↗</span>
    </a>
  )
}
