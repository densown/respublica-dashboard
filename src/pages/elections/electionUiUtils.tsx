import type { CSSProperties } from 'react'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import type { I18nKey } from '../../design-system/i18n'
import type { ElectionType } from './types'

export const ELECTION_TYPES: ElectionType[] = [
  'federal',
  'state',
  'municipal',
  'european',
  'mayoral',
]

export function selectCss(
  c: { cardBg: string; border: string; text: string },
  narrow: boolean,
): CSSProperties {
  return {
    minHeight: 44,
    padding: '0 12px',
    borderRadius: radius.lg,
    border: `1px solid ${c.border}`,
    background: c.cardBg,
    color: c.text,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    width: '100%',
    maxWidth: narrow ? '100%' : 280,
    boxSizing: 'border-box',
  }
}

export function typeLabelT(t: (k: I18nKey) => string, typ: ElectionType) {
  switch (typ) {
    case 'federal':
      return t('federal')
    case 'state':
      return t('state')
    case 'municipal':
      return t('municipal')
    case 'european':
      return t('european')
    case 'mayoral':
      return t('mayoral')
    default:
      return typ
  }
}

export function normAgs(a: string) {
  return a.replace(/\s/g, '')
}

export function sectionTitle(text: string, c: { border: string; text: string }) {
  return (
    <h3
      style={{
        fontFamily: fonts.display,
        fontSize: fontSize.lg,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottom: `1px solid ${c.border}`,
        color: c.text,
      }}
    >
      {text}
    </h3>
  )
}

/**
 * Kreise der Karte, die es so nicht mehr gibt: Goettingen und Osterode sind
 * seit 2016 ein Kreis (03159), Eisenach gehoert seit 2021 zum Wartburgkreis.
 * Ohne die Zuordnung bleiben sie auf der Karte als "Keine Daten" weiss.
 */
export const AGS_NACHFOLGER: Record<string, string> = {
  '03152': '03159',
  '03156': '03159',
  '16056': '16063',
}

/** Traegt fuer alte Kartenkreise die Zeile des Nachfolgers ein, wenn sie selbst fehlen */
export function mitNachfolgern<T>(m: Map<string, T>): Map<string, T> {
  for (const [alt, neu] of Object.entries(AGS_NACHFOLGER)) {
    const zeile = m.get(neu)
    if (zeile && !m.has(alt)) m.set(alt, zeile)
  }
  return m
}
