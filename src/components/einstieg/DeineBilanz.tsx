import { useMemo } from 'react'
import { useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, radius, spacing } from '../../design-system/tokens'
import { useEigeneStimmen } from '../../hooks/useMeins'
import { lagerDerFraktionen } from '../bundestag/abstimmungText'
import { fraktionsFlaeche, type AbstimmungsListenEintrag } from '../bundestag/fraktion'

/** Ab so vielen eigenen Stimmen sagt der Vergleich etwas. */
const MINDESTENS = 3

/**
 * Mit welcher Fraktion man bisher wie oft gestimmt haette. Gerechnet im
 * Browser aus den eigenen Stimmen und der Mehrheit jeder Fraktion.
 */
export function DeineBilanz({ abstimmungen }: { abstimmungen: AbstimmungsListenEintrag[] }) {
  const { c, t, theme } = useTheme()
  const { stimmen } = useEigeneStimmen()

  const { zeilen, anzahl } = useMemo(() => {
    const zaehler = new Map<string, { gleich: number; gesamt: number }>()
    let anzahl = 0
    for (const a of abstimmungen) {
      const meine = stimmen[String(a.poll_id)]
      if (!meine || !a.fraktionen) continue
      anzahl += 1
      const { lager } = lagerDerFraktionen(a.fraktionen)
      for (const s of ['yes', 'no', 'abstain'] as const) {
        for (const f of lager[s]) {
          const z = zaehler.get(f) ?? { gleich: 0, gesamt: 0 }
          z.gesamt += 1
          if (s === meine) z.gleich += 1
          zaehler.set(f, z)
        }
      }
    }
    const zeilen = [...zaehler.entries()]
      .map(([fraktion, z]) => ({ fraktion, ...z }))
      .sort((a, b) => b.gleich / b.gesamt - a.gleich / a.gesamt || b.gesamt - a.gesamt)
    return { zeilen, anzahl }
  }, [abstimmungen, stimmen])

  if (anzahl === 0) return null

  return (
    <section
      aria-label={t('bilanzTitel')}
      style={{
        padding: spacing.lg,
        border: `1px solid ${c.ink}`,
        borderRadius: radius.sm,
        background: c.cardBg,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: fontSize.xl,
          lineHeight: lineHeight.tight,
          color: c.ink,
        }}
      >
        {t('bilanzTitel')}
      </h2>
      {anzahl < MINDESTENS ? (
        <p style={{ margin: `${spacing.sm}px 0 0`, fontFamily: fonts.body, fontSize: fontSize.md, lineHeight: lineHeight.normal, color: c.inkSoft }}>
          {t(MINDESTENS - anzahl === 1 ? 'bilanzNochEine' : 'bilanzNoch').replace('{n}', String(MINDESTENS - anzahl))}
        </p>
      ) : (
        <>
          <p style={{ margin: `${spacing.xs}px 0 ${spacing.md}px`, fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted }}>
            {t('bilanzText').replace('{n}', String(anzahl))}
          </p>
          <div style={{ display: 'grid', gap: spacing.sm }}>
            {zeilen.map((z) => (
              <div key={z.fraktion} style={{ display: 'grid', gridTemplateColumns: '88px 1fr auto', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.sm, color: c.ink }}>{z.fraktion}</span>
                <span style={{ height: 10, background: c.bgAlt, display: 'block' }}>
                  <span
                    className="rp-wachsen"
                    style={{
                      display: 'block',
                      height: '100%',
                      width: `${(z.gleich / z.gesamt) * 100}%`,
                      background: fraktionsFlaeche(z.fraktion, theme === 'dark'),
                    }}
                  />
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, whiteSpace: 'nowrap' }}>
                  {t('bilanzVon').replace('{a}', String(z.gleich)).replace('{b}', String(z.gesamt))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <p style={{ margin: `${spacing.md}px 0 0`, fontFamily: fonts.body, fontSize: fontSize.xs, color: c.muted }}>
        {t('bilanzPrivat')}
      </p>
    </section>
  )
}
