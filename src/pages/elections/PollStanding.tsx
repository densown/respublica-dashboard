import { useMemo } from 'react'
import { useTheme } from '../../design-system'
import type { Lang } from '../../design-system/ThemeContext'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import { PARTY_LABELS, partyColorsForTheme } from './partyColors'
import { THRESHOLD, type Standing } from './pollMath'

type PollStandingProps = {
  werte: Standing[]
  lang: Lang
}

function fmt(v: number, lang: Lang, digits = 1): string {
  return v.toFixed(digits).replace('.', lang === 'de' ? ',' : '.')
}

/**
 * Aktueller Stand als liegende Balken — das Element, das die meisten Leute
 * tatsaechlich lesen wollen. Balkenlaenge skaliert auf den Spitzenwert, nicht
 * auf 100, sonst bleibt bei Werten unter 40 % die halbe Flaeche leer.
 */
export function PollStanding({ werte, lang }: PollStandingProps) {
  const { c, theme } = useTheme()
  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )

  const max = useMemo(() => {
    const hoechster = werte.reduce((m, s) => Math.max(m, s.wert), 0)
    return Math.max(10, Math.ceil(hoechster / 5) * 5)
  }, [werte])

  if (!werte.length) return null

  return (
    <div>
      {werte.map((s) => {
        const farbe = partyColors[s.partei] ?? partyColors.other
        const breite = Math.max(1.5, (s.wert / max) * 100)
        const drin = s.wert >= THRESHOLD
        return (
          <div
            key={s.partei}
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
                color: drin ? c.ink : c.muted,
                fontWeight: drin ? 600 : 400,
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {PARTY_LABELS[s.partei]?.[lang] ?? s.partei}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              {/* Track traegt die Sperrklausel-Markierung */}
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  height: 26,
                  minWidth: 0,
                  background: c.bgAlt,
                  borderRadius: radius.sm,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${breite}%`,
                    height: '100%',
                    background: farbe,
                    opacity: drin ? 1 : 0.45,
                    borderRadius: radius.sm,
                  }}
                />
                <div
                  aria-hidden
                  title={`${THRESHOLD} %`}
                  style={{
                    position: 'absolute',
                    left: `${(THRESHOLD / max) * 100}%`,
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
                  color: drin ? c.ink : c.muted,
                  minWidth: 52,
                  textAlign: 'right',
                }}
              >
                {fmt(s.wert, lang)}
                <span style={{ fontSize: fontSize.micro, fontWeight: 400 }}> %</span>
              </span>

              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.xs,
                  minWidth: 46,
                  textAlign: 'right',
                  color:
                    s.delta == null || Math.abs(s.delta) < 0.05
                      ? c.subtle
                      : s.delta > 0
                        ? c.yes
                        : c.no,
                }}
              >
                {s.delta == null || Math.abs(s.delta) < 0.05
                  ? '±0'
                  : `${s.delta > 0 ? '+' : '−'}${fmt(Math.abs(s.delta), lang)}`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
