import { useId, useState, type ReactNode } from 'react'
import { fonts, fontSize, lineHeight, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type ErklaerungProps = {
  /** Das Fachwort, wie es im Satz steht. */
  children: ReactNode
  /** Zwei Saetze, was es bedeutet. */
  text: string
}

/**
 * Fachwort mit Erklaerung auf Tipp. Gepunktet unterstrichen, damit man
 * sieht, dass dahinter etwas steht. Ersetzt lange Hinweistexte ueber Listen:
 * wer das Wort kennt, liest weiter, wer nicht, tippt.
 */
export function Erklaerung({ children, text }: ErklaerungProps) {
  const { c } = useTheme()
  const [offen, setOffen] = useState(false)
  const id = useId()
  return (
    <>
      <button
        type="button"
        aria-expanded={offen}
        aria-controls={id}
        onClick={() => setOffen((v) => !v)}
        style={{
          display: 'inline',
          padding: 0,
          border: 'none',
          background: 'transparent',
          font: 'inherit',
          color: 'inherit',
          cursor: 'help',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: c.red,
          textUnderlineOffset: 3,
        }}
      >
        {children}
      </button>
      {offen && (
        <span
          id={id}
          role="note"
          style={{
            display: 'block',
            margin: `${spacing.sm}px 0`,
            padding: `${spacing.sm}px ${spacing.md}px`,
            borderLeft: `2px solid ${c.red}`,
            fontFamily: fonts.body,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: fontSize.md,
            lineHeight: lineHeight.normal,
            color: c.inkSoft,
            maxWidth: '60ch',
          }}
        >
          {text}
        </span>
      )}
    </>
  )
}
