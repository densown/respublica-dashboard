import { useMemo } from 'react'
import { useTheme } from '../../design-system'
import { fontSize, fonts, spacing } from '../../design-system/tokens'
import { PARTY_LABELS, partyColorsForTheme } from './partyColors'
import type { ElectionType } from './types'

/** Antwort von GET /api/wahlen/gesamt */
export type GesamtErgebnis = {
  typ: ElectionType
  year: number
  kreise: number
  gueltig: number | null
  turnout: number | null
  gewichtet: boolean
  parteien: { party: string; value: number }[]
}

/** Unter diesem Anteil wandert eine Partei in "Sonstige" */
const KLEINSTE_ZEILE = 0.01

/**
 * Ergebnis der ganzen Wahl als Balken, eine Zeile je Partei. Steht ueber der
 * Karte: die Karte zeigt, wer wo vorn liegt, aber nicht, wie die Wahl ausging.
 */
export function Gesamtergebnis({ daten }: { daten: GesamtErgebnis }) {
  const { c, t, lang, theme } = useTheme()
  const farben = useMemo(() => partyColorsForTheme(theme === 'dark'), [theme])

  const zeilen = useMemo(() => {
    let sonstige = 0
    const gross: { party: string; value: number }[] = []
    for (const p of daten.parteien) {
      if (p.party === 'other' || p.value < KLEINSTE_ZEILE) sonstige += p.value
      else gross.push(p)
    }
    gross.sort((a, b) => b.value - a.value)
    if (sonstige > 0) gross.push({ party: 'other', value: sonstige })
    return gross
  }, [daten.parteien])

  if (!zeilen.length) return null
  const max = Math.max(...zeilen.map((z) => z.value))
  // Die Sperrklausel gilt bei Bundestagswahlen; bei Europawahlen gibt es keine
  const huerde = daten.typ === 'federal' ? 0.05 : null
  // Knapp an der Huerde zwei Nachkommastellen: 4,98 % gerundet auf 5,0 %
  // saehe aus, als waere die Partei drin
  const prozent = (v: number) => {
    const stellen = huerde != null && Math.abs(v - huerde) < 0.001 ? 2 : 1
    return `${(v * 100).toFixed(stellen).replace('.', lang === 'de' ? ',' : '.')} %`
  }

  return (
    <section style={{ marginBottom: spacing.xl }}>
      <h2
        style={{
          margin: `0 0 ${spacing.md}px`,
          paddingBottom: spacing.sm,
          borderBottom: `1px solid ${c.border}`,
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: fontSize.xl,
          color: c.ink,
        }}
      >
        {t('electionsTotalTitle')}
      </h2>
      <div role="list" style={{ display: 'grid', gap: 6, maxWidth: 720 }}>
        {zeilen.map((z) => {
          const name = PARTY_LABELS[z.party]?.[lang] ?? z.party
          const unterHuerde = huerde != null && z.party !== 'other' && z.value < huerde
          return (
            <div
              key={z.party}
              role="listitem"
              style={{
                display: 'grid',
                gridTemplateColumns: '6.5em minmax(0, 1fr) 4.6em',
                alignItems: 'center',
                gap: spacing.sm,
                minHeight: 28,
                fontFamily: fonts.body,
                fontSize: fontSize.base,
                color: unterHuerde ? c.muted : c.ink,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </span>
              <span aria-hidden style={{ display: 'block', height: 16 }}>
                <span
                  style={{
                    display: 'block',
                    height: '100%',
                    width: `${Math.max(1, (z.value / max) * 100)}%`,
                    background: farben[z.party] ?? farben.other,
                    border: `1px solid ${c.border}`,
                    boxSizing: 'border-box',
                    opacity: unterHuerde ? 0.55 : 1,
                  }}
                />
              </span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.sm,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {prozent(z.value)}
              </span>
            </div>
          )
        })}
      </div>
      <p
        style={{
          margin: `${spacing.md}px 0 0`,
          maxWidth: 720,
          fontFamily: fonts.body,
          fontSize: fontSize.sm,
          lineHeight: 1.5,
          color: c.muted,
        }}
      >
        {daten.turnout != null && `${t('turnout')}: ${prozent(daten.turnout)}. `}
        {daten.typ === 'federal' ? t('electionsTotalNoteFederal') : t('electionsTotalNoteKreise')}
      </p>
    </section>
  )
}
