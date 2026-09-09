import { useMemo } from 'react'
import { useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import type { Lang } from '../../design-system/ThemeContext'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import { PARTY_LABELS, partyColorsForTheme } from './partyColors'
import type { Abweichung } from './resultMath'

type PollVsResultProps = {
  werte: Abweichung[]
  lang: Lang
  t: (key: I18nKey) => string
}

function fmt(v: number, lang: Lang, digits = 1): string {
  return v.toFixed(digits).replace('.', lang === 'de' ? ',' : '.')
}

/**
 * Umfragen gegen Ergebnis.
 *
 * Der eigentliche Mehrwert einer Seite, die die Umfragen ueber Monate
 * mitgeschrieben hat: erst mit dem Ergebnis laesst sich sagen, was die
 * Erwartung wert war. Sortiert nach Ergebnis, nicht nach Groesse des Fehlers —
 * die Leserichtung soll dem Wahlausgang folgen, der Fehler ist die Zusatzinfo.
 *
 * Die Balken zeigen den Fehler beidseitig um eine Nulllinie: Ueberschaetzung
 * nach links, Unterschaetzung nach rechts. Eine reine Zahlenspalte laesst
 * Ausreisser wie die CDU 2026 (−5,5) neben ±0,1 zu leicht untergehen.
 */
export function PollVsResult({ werte, lang, t }: PollVsResultProps) {
  const { c, theme } = useTheme()
  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )

  // Symmetrische Skala, damit gleich grosse Fehler in beide Richtungen gleich
  // lang aussehen. Mindestens 2 Punkte, sonst blaeht eine fehlerfreie Wahl
  // winzige Abweichungen zu dramatischen Balken auf.
  const max = useMemo(() => {
    const groesster = werte.reduce(
      (m, w) => Math.max(m, w.delta == null ? 0 : Math.abs(w.delta)),
      0,
    )
    return Math.max(2, Math.ceil(groesster))
  }, [werte])

  if (!werte.length) return null

  return (
    <div>
      {werte.map((w) => {
        const farbe = partyColors[w.partei] ?? partyColors.other
        const anteil = w.delta == null ? 0 : (Math.abs(w.delta) / max) * 50
        const positiv = (w.delta ?? 0) > 0

        return (
          <div
            key={w.partei}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(84px, 128px) 1fr',
              alignItems: 'center',
              gap: spacing.md,
              marginBottom: spacing.sm,
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: fontSize.md,
                color: c.ink,
                fontWeight: 600,
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {PARTY_LABELS[w.partei]?.[lang] ?? w.partei}
            </span>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.xs,
                  color: c.muted,
                  minWidth: 108,
                  textAlign: 'right',
                }}
              >
                {w.umfrage == null ? '—' : `${fmt(w.umfrage, lang)} %`}
                {' → '}
                <span style={{ color: c.ink, fontWeight: 700 }}>
                  {fmt(w.ergebnis, lang, 2)} %
                </span>
              </span>

              {/* Fehlerbalken um die Nulllinie */}
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  height: 22,
                  minWidth: 80,
                  background: c.bgAlt,
                  borderRadius: radius.sm,
                  overflow: 'hidden',
                }}
              >
                {w.delta != null && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: positiv ? '50%' : `${50 - anteil}%`,
                      width: `${anteil}%`,
                      background: farbe,
                      opacity: 0.8,
                    }}
                  />
                )}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: c.ink,
                    opacity: 0.35,
                  }}
                />
              </div>

              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.base,
                  fontWeight: 700,
                  minWidth: 56,
                  textAlign: 'right',
                  color:
                    w.delta == null || Math.abs(w.delta) < 0.05
                      ? c.subtle
                      : w.delta > 0
                        ? c.yes
                        : c.no,
                }}
              >
                {w.delta == null
                  ? '—'
                  : Math.abs(w.delta) < 0.05
                    ? '±0'
                    : `${w.delta > 0 ? '+' : '−'}${fmt(Math.abs(w.delta), lang)}`}
              </span>

              {/* Der teuerste Umfragefehler ist der an der Sperrklausel:
                  er entscheidet ueber Einzug, nicht nur ueber Prozente. */}
              {w.huerdeVerfehlt && (
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSize.micro,
                    color: c.bg,
                    background: c.red,
                    padding: `2px ${spacing.xs}px`,
                    borderRadius: radius.xs,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('electionResultThresholdMiss')}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
