import { useTheme } from '../../design-system'
import { fontSize, fonts, spacing } from '../../design-system/tokens'
import { stimmFlaeche } from '../../design-system/palettes'
import type { Stimme } from './stimmen'

const STIMM_ART = {
  yes: 'ja',
  no: 'nein',
  abstain: 'enthalten',
  no_show: 'abwesend',
} as const

/**
 * Stimme als kleines Feld in der Stimmfarbe mit dem Wort daneben, wie in der
 * Legende der Abstimmungskarten. Leiser als ein Badge: in einer Liste mit
 * 630 Zeilen soll die Farbe sortieren, nicht schreien.
 *
 * `ohneWort` fuer Stellen, an denen das Wort schon daneben steht.
 */
export function StimmMarke({ stimme, ohneWort }: { stimme: Stimme; ohneWort?: boolean }) {
  const { c, t } = useTheme()
  const wort: Record<Stimme, string> = {
    yes: t('yes'),
    no: t('no'),
    abstain: t('abstain'),
    no_show: t('absentL'),
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        fontFamily: fonts.mono,
        fontSize: fontSize.xs,
        color: stimme === 'no_show' ? c.muted : c.ink,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden={!ohneWort}
        aria-label={ohneWort ? wort[stimme] : undefined}
        role={ohneWort ? 'img' : undefined}
        style={{
          width: 12,
          height: 12,
          flexShrink: 0,
          background: stimmFlaeche(STIMM_ART[stimme], c),
          // Schraffur braucht eine Kante, sonst verschwindet sie auf Papier
          boxShadow: stimme === 'no_show' ? `inset 0 0 0 1px ${c.hatch}` : undefined,
        }}
      />
      {!ohneWort && wort[stimme]}
    </span>
  )
}
