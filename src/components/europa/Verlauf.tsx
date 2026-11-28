import { useTheme } from '../../design-system'
import { fonts, fontSize, spacing } from '../../design-system/tokens'
import { Diagramm } from './Diagramm'
import { datumMarke, einheitWort, fuelle, preis, preisWert, type Einheit } from './format'
import { achsenSkala, zeitMarken } from './skala'
import type { StromVerlauf } from './typen'

/**
 * Tagesmittel der letzten Wochen als Linie, dahinter das Band von der
 * guenstigsten zur teuersten Stunde. Achse mit runden Skalenwerten und
 * Einheit, Zeitmarken mit Datum, Legende fuer Linie und Band. Tage ohne
 * Werte unterbrechen Linie und Band.
 */
export function Verlauf({ tage, einheit, ariaLabel }: { tage: StromVerlauf['tage']; einheit: Einheit; ariaLabel: string }) {
  const { c, t, lang } = useTheme()
  const n = tage.length
  const hat = (d: StromVerlauf['tage'][number]) => d.mittel != null && d.min != null && d.max != null
  const mit = tage.filter(hat)
  if (n < 2 || mit.length < 2) return null
  const skala = achsenSkala(Math.min(...mit.map((d) => d.min as number)), Math.max(...mit.map((d) => d.max as number)), true)
  const x = (i: number) => (i / (n - 1)) * 100
  const y = (v: number) => 100 - ((v - skala.lo) / (skala.hi - skala.lo)) * 100

  // Zusammenhaengende Abschnitte: Luecken werden nicht ueberbrueckt
  const abschnitte: number[][] = []
  let lauf: number[] = []
  tage.forEach((d, i) => {
    if (hat(d)) lauf.push(i)
    else {
      if (lauf.length) abschnitte.push(lauf)
      lauf = []
    }
  })
  if (lauf.length) abschnitte.push(lauf)
  const pkt = (i: number, v: number) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`
  const letzter = mit[mit.length - 1]
  const letzterIdx = tage.lastIndexOf(letzter)
  const schrift = { fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted } as const

  return (
    <figure role="img" aria-label={ariaLabel} style={{ margin: 0, maxWidth: 680 }}>
      <Diagramm
        yTitel={fuelle(t('dgPreisAchse'), { einheit: einheitWort(einheit) })}
        skala={skala}
        marke={(v) => preisWert(v, einheit, lang)}
        xMarken={zeitMarken(n).map((i) => ({ pos: x(i), text: datumMarke(tage[i].datum, lang) }))}
        hoehe={170}
      >
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          {abschnitte
            .filter((a) => a.length > 1)
            .map((a) => (
              <g key={a[0]}>
                <polygon
                  points={[...a.map((i) => pkt(i, tage[i].max as number)), ...[...a].reverse().map((i) => pkt(i, tage[i].min as number))].join(' ')}
                  fill={c.red}
                  opacity={0.16}
                />
                <polyline
                  points={a.map((i) => pkt(i, tage[i].mittel as number)).join(' ')}
                  fill="none"
                  stroke={c.red}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
              </g>
            ))}
        </svg>
        {/* Der juengste Wert steht mit Einheit an der Linie */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: `${x(letzterIdx)}%`,
            top: `${y(letzter.mittel as number)}%`,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: c.red,
            border: `2px solid ${c.bg}`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        <span
          style={{
            ...schrift,
            position: 'absolute',
            right: 0,
            top: `calc(${Math.min(86, Math.max(14, y(letzter.mittel as number)))}% - 26px)`,
            color: c.ink,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            background: c.bg,
            padding: `0 ${spacing.xs}px`,
          }}
        >
          {preis(letzter.mittel as number, einheit, lang)}
        </span>
      </Diagramm>
      <figcaption style={{ ...schrift, display: 'flex', flexWrap: 'wrap', gap: `${spacing.xs}px ${spacing.lg}px`, marginTop: spacing.xs }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}>
          <span aria-hidden style={{ width: 18, height: 2, background: c.red }} />
          {t('dgLegendeMittel')}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}>
          <span aria-hidden style={{ width: 18, height: 10, background: c.red, opacity: 0.16 }} />
          {t('dgLegendeBand')}
        </span>
      </figcaption>
    </figure>
  )
}
