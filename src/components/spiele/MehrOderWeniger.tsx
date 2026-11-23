import { useCallback, useMemo, useState } from 'react'
import { Chip, Piktogramm, useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, radius, spacing } from '../../design-system/tokens'

type Eintrag = { name: string; betrag: number }

/** Paare, deren Betraege zu nah beieinander liegen, waeren Raten ohne Reiz. */
const MINDEST_VERHAELTNIS = 1.25

function ziehePaar(liste: Eintrag[]): [Eintrag, Eintrag] | null {
  if (liste.length < 2) return null
  for (let versuch = 0; versuch < 30; versuch += 1) {
    const a = liste[Math.floor(Math.random() * liste.length)]
    const b = liste[Math.floor(Math.random() * liste.length)]
    if (a === b) continue
    const [gross, klein] = a.betrag > b.betrag ? [a, b] : [b, a]
    if (gross.betrag / klein.betrag >= MINDEST_VERHAELTNIS) return [a, b]
  }
  return null
}

/**
 * "Mehr oder weniger": zwei Organisationen aus dem Register, wer gibt mehr
 * fuer Interessenvertretung aus? Danach stehen beide Betraege da. Gezaehlt
 * wird nur die laufende Serie, nichts wird gespeichert.
 */
export function MehrOderWeniger({
  eintraege,
  geld,
}: {
  eintraege: Eintrag[]
  geld: (betrag: number) => string
}) {
  const { c, t } = useTheme()
  const liste = useMemo(() => eintraege.filter((e) => e.betrag > 0 && e.name), [eintraege])
  const [paar, setPaar] = useState<[Eintrag, Eintrag] | null>(null)
  const [wahl, setWahl] = useState<0 | 1 | null>(null)
  const [serie, setSerie] = useState(0)

  const neu = useCallback(() => {
    setPaar(ziehePaar(liste))
    setWahl(null)
  }, [liste])

  if (liste.length < 4) return null

  const kopf = (
    <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: fontSize.xl, lineHeight: lineHeight.tight, color: c.ink }}>
      {t('mowTitel')}
    </div>
  )
  const rahmen = {
    padding: spacing.lg,
    border: `1px solid ${c.ink}`,
    borderRadius: radius.sm,
    background: c.cardBg,
    margin: `${spacing.xl}px 0`,
  } as const

  if (!paar) {
    return (
      <section style={rahmen}>
        {kopf}
        <p style={{ margin: `${spacing.xs}px 0 ${spacing.md}px`, fontFamily: fonts.body, fontSize: fontSize.md, color: c.inkSoft }}>
          {t('mowText')}
        </p>
        <Chip label={t('mowStart')} onClick={neu} />
      </section>
    )
  }

  const mehr = paar[0].betrag > paar[1].betrag ? 0 : 1
  const waehle = (i: 0 | 1) => {
    if (wahl != null) return
    setWahl(i)
    setSerie(i === mehr ? serie + 1 : 0)
  }

  return (
    <section style={rahmen} aria-live="polite">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md }}>
        {kopf}
        {serie > 1 && (
          <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, whiteSpace: 'nowrap' }}>
            {t('mowSerie').replace('{n}', String(serie))}
          </span>
        )}
      </div>
      <p style={{ margin: `${spacing.xs}px 0 0`, fontFamily: fonts.body, fontSize: fontSize.md, color: c.inkSoft }}>{t('mowFrage')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing.md, marginTop: spacing.md }}>
        {([0, 1] as const).map((i) => {
          const e = paar[i]
          const offen = wahl == null
          const richtig = i === mehr
          return (
            <button
              key={e.name}
              type="button"
              disabled={!offen}
              onClick={() => waehle(i)}
              className={offen ? 'rp-karte' : undefined}
              style={{
                minHeight: 88,
                padding: spacing.md,
                border: `1.5px solid ${offen ? c.ink : richtig ? c.yes : c.border}`,
                borderRadius: radius.sm,
                background: 'transparent',
                color: c.ink,
                textAlign: 'left',
                cursor: offen ? 'pointer' : 'default',
              }}
            >
              <span style={{ display: 'block', fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.base, lineHeight: lineHeight.tight }}>
                {e.name}
              </span>
              {!offen && (
                <span
                  className="rp-ein"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    marginTop: spacing.sm,
                    fontFamily: fonts.display,
                    fontWeight: 900,
                    fontSize: fontSize.xl,
                    color: richtig ? c.yes : c.inkSoft,
                  }}
                >
                  {geld(e.betrag)}
                  {wahl === i && richtig && <Piktogramm name="haken" size={18} />}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {wahl != null && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, marginTop: spacing.md }}>
          <span style={{ fontFamily: fonts.body, fontSize: fontSize.md, color: c.ink }}>
            {t(wahl === mehr ? 'mowRichtig' : 'mowFalsch')}
          </span>
          <Chip dense label={t('mowWeiter')} onClick={neu} />
        </div>
      )}
    </section>
  )
}
