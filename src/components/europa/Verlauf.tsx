import { useTheme } from '../../design-system'
import { fonts, fontSize, spacing } from '../../design-system/tokens'
import { datumKurz, preis, type Einheit } from './format'
import type { StromVerlauf } from './typen'

/**
 * Tagesmittel der letzten Wochen als Linie, dahinter das Band von der
 * guenstigsten zur teuersten Stunde. Die Formen liegen in einem verzerrbaren
 * SVG, die Beschriftung in HTML darueber, damit sie nicht mitschrumpft.
 */
export function Verlauf({ tage, einheit, ariaLabel }: { tage: StromVerlauf['tage']; einheit: Einheit; ariaLabel: string }) {
  const { c, lang } = useTheme()
  const mit = tage.filter((d) => d.mittel != null && d.min != null && d.max != null)
  if (mit.length < 2) return null
  const lo = Math.min(0, ...mit.map((d) => d.min as number))
  const hi = Math.max(...mit.map((d) => d.max as number))
  const x = (i: number) => (i / (mit.length - 1)) * 100
  const y = (v: number) => 100 - ((v - lo) / (hi - lo || 1)) * 100
  const linie = mit.map((d, i) => `${x(i).toFixed(2)},${y(d.mittel as number).toFixed(2)}`).join(' ')
  const band =
    mit.map((d, i) => `${x(i).toFixed(2)},${y(d.max as number).toFixed(2)}`).join(' ') +
    ' ' +
    [...mit]
      .reverse()
      .map((d, i) => `${x(mit.length - 1 - i).toFixed(2)},${y(d.min as number).toFixed(2)}`)
      .join(' ')
  const letzter = mit[mit.length - 1]
  const schrift = { fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, whiteSpace: 'nowrap' } as const

  return (
    <figure role="img" aria-label={ariaLabel} style={{ margin: 0, maxWidth: 680 }}>
      <div style={{ ...schrift, marginBottom: spacing.xs }}>{preis(hi, einheit, lang)}</div>
      <div style={{ position: 'relative', height: 150, borderTop: `1px dashed ${c.border}`, borderBottom: `1px solid ${c.ink}` }}>
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          <polygon points={band} fill={c.red} opacity={0.14} />
          <polyline points={linie} fill="none" stroke={c.red} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        <span
          style={{
            ...schrift,
            position: 'absolute',
            right: 0,
            top: `calc(${Math.min(88, Math.max(0, y(letzter.mittel as number)))}% - 22px)`,
            color: c.ink,
            fontWeight: 700,
            background: c.bg,
            padding: `0 ${spacing.xs}px`,
          }}
        >
          {preis(letzter.mittel as number, einheit, lang)}
        </span>
      </div>
      <div style={{ ...schrift, display: 'flex', justifyContent: 'space-between', marginTop: spacing.xs }}>
        <span>
          {preis(lo, einheit, lang)} · {datumKurz(mit[0].datum, lang)}
        </span>
        <span>{datumKurz(letzter.datum, lang)}</span>
      </div>
    </figure>
  )
}
