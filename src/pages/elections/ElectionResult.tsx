import { useMemo } from 'react'
import { useTheme } from '../../design-system'
import type { Lang } from '../../design-system/ThemeContext'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import { OTHER, THRESHOLD } from './pollMath'
import { PARTY_LABELS, partyColorsForTheme } from './partyColors'
import type { Ergebnis } from './pollTypes'

type ElectionResultProps = {
  ergebnis: Ergebnis
  lang: Lang
}

function fmt(v: number, lang: Lang, digits = 1): string {
  return v.toFixed(digits).replace('.', lang === 'de' ? ',' : '.')
}

/**
 * Amtliches Ergebnis als liegende Balken — bewusst dieselbe Formensprache wie
 * PollStanding, damit der Vergleich zwischen Umfrage und Ergebnis auf einen
 * Blick funktioniert und die Seite beim Wechsel in den Wahlabendmodus nicht
 * wie eine andere Seite wirkt.
 *
 * Zusaetzlich zu den Prozenten stehen hier die Sitze: sie sind die eigentlich
 * politisch wirksame Groesse, und die Aufteilung in Direkt- und Listenmandate
 * traegt oft die Aussage. In Sachsen-Anhalt 2026 holte die AfD 38 von 41
 * Direktmandaten und die CDU keines — im Prozentwert ist das unsichtbar.
 */
export function ElectionResult({ ergebnis, lang }: ElectionResultProps) {
  const { c, t, theme } = useTheme()
  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )

  const max = useMemo(() => {
    const hoechster = ergebnis.parteien.reduce((m, p) => Math.max(m, p.prozent), 0)
    return Math.max(10, Math.ceil(hoechster / 5) * 5)
  }, [ergebnis])

  // `other` ans Ende, auch wenn es prozentual vor einer Einzelpartei laege:
  // die Sammelzeile ist keine Partei und soll die Rangfolge nicht
  // unterbrechen. Gleiche Konvention wie in der Umfrage-Zeilenansicht.
  const zeilen = useMemo(
    () =>
      [...ergebnis.parteien].sort((a, b) =>
        a.kuerzel === OTHER ? 1 : b.kuerzel === OTHER ? -1 : b.prozent - a.prozent,
      ),
    [ergebnis],
  )

  if (!zeilen.length) return null

  return (
    <div>
      {zeilen.map((p) => {
        const farbe = partyColors[p.kuerzel] ?? partyColors.other
        const breite = Math.max(1.5, (p.prozent / max) * 100)
        // `other` ist ein Aggregat und zieht nie ein — es soll nicht so
        // aussehen, als haette es die Huerde knapp verfehlt.
        const drin = p.sitze != null && p.sitze > 0
        const gedimmt = p.kuerzel === OTHER || !drin

        return (
          <div
            key={p.kuerzel}
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
                color: gedimmt ? c.muted : c.ink,
                fontWeight: gedimmt ? 400 : 600,
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {PARTY_LABELS[p.kuerzel]?.[lang] ?? p.kuerzel}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
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
                    opacity: gedimmt ? 0.45 : 1,
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
                  color: gedimmt ? c.muted : c.ink,
                  minWidth: 58,
                  textAlign: 'right',
                }}
              >
                {fmt(p.prozent, lang, 2)}
                <span style={{ fontSize: fontSize.micro, fontWeight: 400 }}> %</span>
              </span>

              {/* Sitze mit fester Spaltenbreite, damit die Balken nicht
                  unterschiedlich weit enden, wenn eine Partei nicht einzieht. */}
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.xs,
                  minWidth: 74,
                  textAlign: 'right',
                  color: drin ? c.inkSoft : c.subtle,
                }}
                title={
                  drin && p.sitze_direkt != null && p.sitze_liste != null
                    ? `${p.sitze_direkt} ${t('electionResultDirect')} · ${p.sitze_liste} ${t('electionResultList')}`
                    : undefined
                }
              >
                {drin ? `${p.sitze} ${t('electionResultSeatsShort')}` : '—'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
