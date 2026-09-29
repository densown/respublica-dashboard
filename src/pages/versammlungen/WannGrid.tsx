import { useMemo } from 'react'
import { useTheme } from '../../design-system'
import { fonts, fontSize, radius, spacing } from '../../design-system/tokens'
import type { I18nKey } from '../../design-system/i18n'

type Props = {
  zellen: { wochentag: number; stunde: number; anzahl: number }[]
}

// Vor 6 Uhr beginnt kaum etwas; die Spalten wuerden das Raster nur breit
// machen. Was trotzdem frueher beginnt, faellt in die erste Spalte.
const ERSTE_STUNDE = 6
const STUNDEN = Array.from({ length: 24 - ERSTE_STUNDE }, (_, i) => i + ERSTE_STUNDE)

/**
 * Dichte als Deckkraft der Tinte, nicht als neue Farbe (DESIGN.md, Abschnitt 4:
 * Flaechenabstufungen ueber Alpha eines bestehenden Tons).
 */
export function WannGrid({ zellen }: Props) {
  const { c, t, lang } = useTheme()

  const { werte, max } = useMemo(() => {
    const m = new Map<string, number>()
    let hoechster = 0
    for (const z of zellen) {
      const h = Math.max(z.stunde, ERSTE_STUNDE)
      const key = `${z.wochentag}-${h}`
      const n = (m.get(key) ?? 0) + z.anzahl
      m.set(key, n)
      hoechster = Math.max(hoechster, n)
    }
    return { werte: m, max: hoechster }
  }, [zellen])

  const zahl = (n: number) => n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')
  const tagLabel = (wt: number) => t(`versammlungenWt${wt}` as I18nKey)

  return (
    // Eigener Scroll-Behaelter: bei 320 px scrollt das Raster, nicht die Seite
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div
        role="table"
        aria-label={t('versammlungenWannTitle')}
        style={{
          display: 'grid',
          gridTemplateColumns: `36px repeat(${STUNDEN.length}, minmax(18px, 1fr))`,
          gap: 2,
          minWidth: 36 + STUNDEN.length * 20,
          fontFamily: fonts.mono,
          fontSize: fontSize.micro,
          color: c.muted,
        }}
      >
        <div role="row" style={{ display: 'contents' }}>
          <div />
          {STUNDEN.map((h) => (
            <div key={h} role="columnheader" style={{ textAlign: 'center', paddingBottom: spacing.xs }}>
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5, 6].map((wt) => (
          <div key={wt} role="row" style={{ display: 'contents' }}>
            <div role="rowheader" style={{ display: 'flex', alignItems: 'center' }}>
              {tagLabel(wt)}
            </div>
            {STUNDEN.map((h) => {
              const n = werte.get(`${wt}-${h}`) ?? 0
              const anteil = max ? n / max : 0
              return (
                <div
                  key={h}
                  role="cell"
                  title={`${tagLabel(wt)} ${h} ${t('versammlungenStunde')}: ${zahl(n)}`}
                  style={{ position: 'relative', height: 24, borderRadius: radius.xs, background: c.bgHover }}
                >
                  {n > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: radius.xs,
                        background: c.ink,
                        opacity: 0.08 + 0.92 * anteil,
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
