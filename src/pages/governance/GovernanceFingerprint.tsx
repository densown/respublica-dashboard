import { useTheme } from '../../design-system'
import { fonts, fontSize, lineHeight, radius, spacing } from '../../design-system/tokens'
import type { Dimension, LandVeraenderung } from './governanceTypes'

type Props = {
  land: LandVeraenderung
  dimensionen: Dimension[]
  reihenfolge: string[]
  lang: 'de' | 'en'
  /** Kurze redaktionelle Einordnung, was das Muster zeigt. */
  deutung?: string
}

/** Groesster Ausschlag, auf den die Balken skaliert werden. */
const MAX_DELTA = 1.2

/**
 * Veränderung aller sechs Dimensionen eines Landes als Balken um eine Nulllinie.
 *
 * Das ist der analytische Kern der Seite. Ein zusammengefasster Demokratie-Wert
 * zeigt bei Hongkong und der Tuerkei dasselbe — Rueckgang. Erst die sechs
 * Balken nebeneinander machen sichtbar, dass es zwei verschiedene Vorgaenge
 * sind: in Hongkong bricht die Mitsprache weg, waehrend Verwaltung und
 * Korruptionskontrolle nahezu unveraendert bleiben; in der Tuerkei faellt
 * alles zugleich.
 *
 * Balken statt Netzdiagramm, weil die Flaeche eines Netzes von der Reihenfolge
 * der Achsen abhaengt und damit eine Aussage suggeriert, die in den Daten nicht
 * steht.
 */
export function GovernanceFingerprint({
  land,
  dimensionen,
  reihenfolge,
  lang,
  deutung,
}: Props) {
  const { c } = useTheme()
  const namen = new Map(dimensionen.map((d) => [d.code, d]))

  return (
    <div>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: fontSize.lg,
          color: c.ink,
          marginBottom: deutung ? 2 : spacing.sm,
        }}
      >
        {lang === 'de' ? land.name_de : land.name_en}
      </div>
      {deutung && (
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: fontSize.md,
            lineHeight: lineHeight.normal,
            color: c.muted,
            marginBottom: spacing.md,
            maxWidth: '46ch',
          }}
        >
          {deutung}
        </div>
      )}

      {reihenfolge.map((code) => {
        const d = land.dimensionen[code]
        if (!d) return null
        const dim = namen.get(code)
        const label = dim ? (lang === 'de' ? dim.name_de : dim.name_en) : code
        const anteil = Math.min(1, Math.abs(d.delta) / MAX_DELTA) * 50
        return (
          <div
            key={code}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              marginBottom: 3,
            }}
          >
            <span
              style={{
                width: 132,
                flex: '0 0 132px',
                textAlign: 'right',
                fontFamily: fonts.body,
                fontSize: fontSize.sm,
                color: c.inkSoft,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={label}
            >
              {label}
            </span>

            <span style={{ position: 'relative', flex: 1, height: 16, minWidth: 0 }}>
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: c.border,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  height: 10,
                  borderRadius: radius.xs,
                  background: d.delta < 0 ? c.no : c.yes,
                  ...(d.delta < 0
                    ? { right: '50%', width: `${anteil}%` }
                    : { left: '50%', width: `${anteil}%` }),
                }}
              />
            </span>

            <span
              style={{
                width: 48,
                flex: '0 0 48px',
                fontFamily: fonts.mono,
                fontSize: fontSize.xs,
                color: c.muted,
              }}
            >
              {d.delta > 0 ? '+' : d.delta < 0 ? '−' : '±'}
              {Math.abs(d.delta).toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
