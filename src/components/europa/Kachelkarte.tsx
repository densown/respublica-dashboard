import { useTheme } from '../../design-system'
import { fonts, fontSize, radius, spacing } from '../../design-system/tokens'
import { einheitWort, fuelle, preis, preisWert, type Einheit } from './format'
import { kachelZeichen, preisFarbe, type Skala } from './strom'
import type { StromZone } from './typen'

export type KachelkarteProps = {
  zonen: StromZone[]
  /** Welcher Preis auf der Kachel steht: Tagesmittel oder eine Stunde. */
  wert: (z: StromZone) => number | null
  skala: Skala
  einheit: Einheit
  gewaehlt: string
  onWahl: (code: string) => void
}

/**
 * Europa als Kachelkarte: jede Preiszone ein Feld, angeordnet wie auf der
 * Landkarte (Spalte und Zeile kommen aus der Tabelle strom_zonen). Auf jeder
 * Kachel steht der Preis als Zahl mit Einheit, die Farbe ist nur Zugabe.
 *
 * Kacheln statt Landesgrenzen, weil 15 Zonen auf einem Handy sonst
 * unlesbar klein waeren (Slowenien, Belgien) und weil eine Kachelkarte ohne
 * Kartenbibliothek auskommt: null Kilobyte zusaetzlich.
 */
export function Kachelkarte({ zonen, wert, skala, einheit, gewaehlt, onWahl }: KachelkarteProps) {
  const { c, t, lang } = useTheme()
  if (zonen.length === 0) return null
  const minSpalte = Math.min(...zonen.map((z) => z.spalte))
  const spalten = Math.max(...zonen.map((z) => z.spalte)) - minSpalte + 1
  const minZeile = Math.min(...zonen.map((z) => z.zeile))

  return (
    <div style={{ maxWidth: 520 }}>
      <div
        role="group"
        aria-label={t('stKarteTitel')}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${spalten}, minmax(0, 1fr))`, gap: spacing.xs + 2 }}
      >
        {zonen.map((z) => {
          const v = wert(z)
          const aktiv = z.code === gewaehlt
          return (
            <button
              key={z.code}
              type="button"
              className="rp-kachel"
              aria-pressed={aktiv}
              aria-label={fuelle(t('stKarteAria'), {
                land: z.name,
                preis: v == null ? t('stKarteKeinWert') : preis(v, einheit, lang),
              })}
              title={z.name}
              onClick={() => onWahl(z.code)}
              style={{
                gridColumn: z.spalte - minSpalte + 1,
                gridRow: z.zeile - minZeile + 1,
                minHeight: 68,
                padding: `${spacing.sm}px ${spacing.xs}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                background: preisFarbe(v, skala, c),
                color: c.ink,
                border: `1px solid ${aktiv ? c.ink : c.cardBorder}`,
                boxShadow: aktiv ? `inset 0 0 0 2px ${c.ink}` : undefined,
                borderRadius: radius.sm,
                cursor: 'pointer',
                transition: 'background-color 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: fontSize.micro, letterSpacing: '0.04em' }}>
                {kachelZeichen(z)}
              </span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontWeight: 700,
                  fontSize: fontSize.lg,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.15,
                }}
              >
                {v == null ? '·' : preisWert(v, einheit, lang)}
              </span>
              <span style={{ fontFamily: fonts.mono, fontSize: fontSize.micro, color: c.inkSoft }}>
                {einheitWort(einheit)}
              </span>
            </button>
          )
        })}
      </div>

      <PreisLegende skala={skala} einheit={einheit} />
    </div>
  )
}

/** Farbskala der Preise mit beiden Enden als Zahl und der Einheit im Titel. Fuer Kacheln und Landkarte dieselbe. */
export function PreisLegende({ skala, einheit }: { skala: Skala; einheit: Einheit }) {
  const { c, t, lang } = useTheme()
  return (
    <div style={{ marginTop: spacing.md, fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
      <div style={{ marginBottom: spacing.xs }}>{fuelle(t('stKarteLegende'), { einheit: einheitWort(einheit) })}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <span>{preisWert(skala.lo, einheit, lang)}</span>
        <span
          aria-hidden
          style={{
            flex: 1,
            maxWidth: 220,
            height: 10,
            borderRadius: radius.xs,
            border: `1px solid ${c.cardBorder}`,
            background: `linear-gradient(to right, ${preisFarbe(skala.lo, skala, c)}, ${preisFarbe(skala.hi, skala, c)})`,
          }}
        />
        <span>{preisWert(skala.hi, einheit, lang)}</span>
      </div>
    </div>
  )
}
