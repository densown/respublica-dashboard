import { useTheme } from '../../design-system'
import { fonts, fontSize, radius, spacing } from '../../design-system/tokens'
import { einheitWort, fuelle, preis, preisWert, type Einheit } from './format'
import { guenstigstesFenster, preisFarbe, teuersteStunde, type Skala } from './strom'

export type TagesgangProps = {
  stunden: (number | null)[]
  skala: Skala
  einheit: Einheit
  /** Hervorgehobene Stunde, wenn die Karte auf eine Stunde gestellt ist. */
  stunde: number | null
  ariaLabel: string
}

const HOEHE = 170

/**
 * Der Tag als 24 Balken. In HTML statt SVG gebaut, damit die Beschriftung
 * auf dem Handy so gross bleibt wie der uebrige Text: ein skaliertes SVG
 * macht aus 12 Pixeln Schrift sieben.
 *
 * Auf der Grafik stehen Zahlen mit Einheit: Hoechstwert, Tiefstwert und die
 * guenstigsten drei Stunden.
 */
export function Tagesgang({ stunden, skala, einheit, stunde, ariaLabel }: TagesgangProps) {
  const { c, t, lang } = useTheme()
  const werte = stunden.filter((v): v is number => v != null)
  if (werte.length === 0) return null
  const lo = Math.min(0, ...werte)
  const hi = Math.max(1, ...werte)
  const spanne = hi - lo
  const null_ = ((0 - lo) / spanne) * 100
  const fenster = guenstigstesFenster(stunden)
  const spitze = teuersteStunde(stunden)
  const tief = stunden.reduce<number | null>((b, v, i) => (v != null && (b == null || v < (stunden[b] as number)) ? i : b), null)

  const marke = (h: number, oben: boolean) => {
    const v = stunden[h]
    if (v == null) return null
    const links = ((h + 0.5) / 24) * 100
    const y = ((Math.max(v, 0) - lo) / spanne) * 100
    return (
      <span
        key={`m${h}${oben}`}
        style={{
          position: 'absolute',
          left: `${links}%`,
          bottom: oben ? `calc(${y}% + 4px)` : undefined,
          top: oben ? undefined : `calc(${100 - ((Math.min(v, 0) - lo) / spanne) * 100}% + 4px)`,
          transform: h < 3 ? 'translateX(-12%)' : h > 20 ? 'translateX(-88%)' : 'translateX(-50%)',
          fontFamily: fonts.mono,
          fontSize: fontSize.xs,
          fontWeight: 700,
          color: c.ink,
          whiteSpace: 'nowrap',
          background: c.bg,
          padding: `0 ${spacing.xs}px`,
          borderRadius: radius.xs,
        }}
      >
        {preis(v, einheit, lang)}
      </span>
    )
  }

  return (
    <figure role="img" aria-label={ariaLabel} style={{ margin: 0, maxWidth: 680 }}>
      <div style={{ position: 'relative', height: HOEHE, marginTop: spacing.xl, marginBottom: spacing.xl }}>
        {/* Nulllinie */}
        <div
          aria-hidden
          style={{ position: 'absolute', left: 0, right: 0, bottom: `${null_}%`, borderTop: `1px solid ${c.ink}` }}
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 2 }}>
          {stunden.map((v, h) => {
            const imFenster = fenster != null && h >= fenster.von && h < fenster.bis
            const gewaehlt = stunde === h
            const hoehe = v == null ? 0 : (Math.abs(v) / spanne) * 100
            const unten = v == null ? null_ : v >= 0 ? null_ : ((v - lo) / spanne) * 100
            return (
              <div key={h} style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `${unten}%`,
                    height: `${hoehe}%`,
                    minHeight: v == null ? 0 : 2,
                    background: preisFarbe(v, skala, c),
                    border: `1px solid ${gewaehlt ? c.ink : imFenster ? c.yes : c.cardBorder}`,
                    boxShadow: gewaehlt ? `inset 0 0 0 1px ${c.ink}` : undefined,
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                />
              </div>
            )
          })}
        </div>
        {spitze && marke(spitze.stunde, true)}
        {tief != null && tief !== spitze?.stunde && marke(tief, true)}
        {/* Klammer unter den guenstigsten drei Stunden */}
        {fenster && (
          <div
            style={{
              position: 'absolute',
              left: `${(fenster.von / 24) * 100}%`,
              width: `${((fenster.bis - fenster.von) / 24) * 100}%`,
              bottom: -6,
              height: 4,
              background: c.yes,
            }}
          />
        )}
      </div>
      {/* Stundenachse */}
      <div
        aria-hidden
        style={{ display: 'flex', fontFamily: fonts.mono, fontSize: fontSize.micro, color: c.muted, marginTop: -spacing.md }}
      >
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
          <span key={h} style={{ flex: 1 }}>
            {fuelle(t('stGangUhr'), { h })}
          </span>
        ))}
      </div>
      <figcaption
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.lg,
          marginTop: spacing.md,
          fontFamily: fonts.mono,
          fontSize: fontSize.xs,
          color: c.muted,
        }}
      >
        {fenster && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}>
            <span aria-hidden style={{ width: 16, height: 4, background: c.yes }} />
            {t('stGangGuenstig')}: {fuelle(t('stKarteUhr'), { von: fenster.von, bis: fenster.bis })},{' '}
            {preis(fenster.mittel, einheit, lang)}
          </span>
        )}
        <span>
          {t('stEinheit')}: {einheitWort(einheit)} · 0 = {preisWert(0, einheit, lang)}
        </span>
      </figcaption>
    </figure>
  )
}
