import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTheme } from '../../design-system'
import { fonts, fontSize, spacing } from '../../design-system/tokens'
import { Diagramm } from './Diagramm'
import { fuelle } from './format'
import { achsenSkala, zeitMarken } from './skala'

export type ZeitreihenReihe = {
  name: string
  farbe: string
  /** Strichmuster (stroke-dasharray) als zweites Merkmal neben der Farbe. */
  strich?: string
  werte: (number | null)[]
}

export type ZeitreiheProps = {
  /** Beschriftung je Punkt der Zeitachse, ausgeschrieben fuer Ablesezeile und Tabelle. */
  achse: string[]
  /** Kurze Fassung fuer die Marken der Zeitachse. Ohne sie gilt `achse`. */
  achseKurz?: string[]
  reihen: ZeitreihenReihe[]
  /** Wert mit Einheit fuer die Ablesezeile, etwa "7,2 ct/kWh". */
  format: (v: number) => string
  /** Skalenwert ohne Einheit. Ohne ihn gilt `format`. */
  formatMarke?: (v: number) => string
  /** Was die senkrechte Achse misst, mit Einheit: "Tagesmittel in ct/kWh". */
  yTitel: string
  /** Skala bei null beginnen (Preise). Sonst beim runden Wert unter dem Minimum. */
  abNull?: boolean
  hoehe?: number
  ariaLabel: string
}

/** Kleines Linienstueck fuer Legende und Tabelle, mit demselben Strichmuster wie im Diagramm. */
export function ReihenMarke({ farbe, strich }: { farbe: string; strich?: string }) {
  return (
    <svg aria-hidden width={22} height={8} style={{ flexShrink: 0 }}>
      <line x1={0} x2={22} y1={4} y2={4} stroke={farbe} strokeWidth={2.5} strokeDasharray={strich || undefined} />
    </svg>
  )
}

/**
 * Zeitreihe zum Anfassen: eine oder mehrere Linien auf einer beschrifteten
 * Achse. Finger, Maus oder Pfeiltasten waehlen einen Zeitpunkt, die Werte
 * dazu stehen mit Einheit in der Zeile darueber. Kein schwebender Tooltip,
 * der auf dem Handy unter dem Finger liegt.
 *
 * Fehlende Werte unterbrechen die Linie, sie werden nie ueberbrueckt. Ein
 * einzelner Wert zwischen zwei Luecken steht als Punkt da. Jede Reihe hat
 * Farbe und Strichmuster. Die Werte gibt es darunter auch als Tabelle.
 */
export function Zeitreihe({ achse, achseKurz, reihen, format, formatMarke, yTitel, abNull, hoehe = 220, ariaLabel }: ZeitreiheProps) {
  const { c, t } = useTheme()
  const n = achse.length
  const [wahl, setWahl] = useState<number | null>(null)
  const alle = reihen.flatMap((r) => r.werte).filter((v): v is number => v != null)
  if (n < 2 || alle.length === 0) return null
  const idx = Math.min(n - 1, wahl ?? n - 1)

  // Die Null gehoert auf die Achse, wenn sie die Linien nicht zusammendrueckt.
  // Liegen alle Werte weit ueber null (Lebenserwartung, BIP pro Kopf), beginnt
  // die Achse hoeher, und das steht dann ausdruecklich neben dem Achsentitel.
  const min = Math.min(...alle)
  const max = Math.max(...alle)
  const mitNull = Boolean(abNull) || (min >= 0 && min < max * 0.6)
  const skala = achsenSkala(min, max, mitNull)
  const abgeschnitten = skala.lo > 0
  const x = (i: number) => (i / (n - 1)) * 100
  const y = (v: number) => 100 - ((v - skala.lo) / (skala.hi - skala.lo)) * 100

  // Zusammenhaengende Stuecke; ein Stueck mit nur einem Wert wird ein Punkt
  const stuecke = (werte: (number | null)[]) => {
    const linien: string[] = []
    const punkte: number[] = []
    let lauf: number[] = []
    const schliessen = () => {
      if (lauf.length > 1) linien.push(lauf.map((i) => `${x(i).toFixed(2)},${y(werte[i] as number).toFixed(2)}`).join(' '))
      else if (lauf.length === 1) punkte.push(lauf[0])
      lauf = []
    }
    werte.forEach((v, i) => (v == null ? schliessen() : lauf.push(i)))
    schliessen()
    return { linien, punkte }
  }

  const zeigen = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const anteil = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    setWahl(Math.round(anteil * (n - 1)))
  }
  const taste = (e: KeyboardEvent<HTMLDivElement>) => {
    const schritt = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (!schritt) return
    e.preventDefault()
    setWahl(Math.min(n - 1, Math.max(0, idx + schritt)))
  }

  const kurz = achseKurz ?? achse
  const zelle = { padding: `${spacing.sm}px ${spacing.md}px`, textAlign: 'right', whiteSpace: 'nowrap' } as const

  return (
    <figure style={{ margin: 0, maxWidth: 760 }}>
      {/* Legende und Ablesezeile in einem: Zeitpunkt, je Reihe Marke, Name, Wert mit Einheit */}
      <div
        aria-live="polite"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: `${spacing.xs}px ${spacing.lg}px`,
          minHeight: 44,
          marginBottom: spacing.md,
          fontFamily: fonts.mono,
          fontSize: fontSize.sm,
          color: c.ink,
        }}
      >
        <strong>{achse[idx]}</strong>
        {reihen.map((r) => {
          const v = r.werte[idx]
          return (
            <span key={r.name} style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}>
              <ReihenMarke farbe={r.farbe} strich={r.strich} />
              {reihen.length > 1 && <span style={{ color: c.inkSoft }}>{r.name}</span>}
              <strong>{v == null ? t('zrKeinWert') : format(v)}</strong>
            </span>
          )
        })}
      </div>

      <Diagramm
        yTitel={abgeschnitten ? `${yTitel} · ${fuelle(t('dgAbgeschnitten'), { wert: (formatMarke ?? format)(skala.lo) })}` : yTitel}
        skala={skala}
        marke={formatMarke ?? format}
        xMarken={zeitMarken(n).map((i) => ({ pos: x(i), text: kurz[i] }))}
        hoehe={hoehe}
        flaecheStil={{ touchAction: 'pan-y', cursor: 'crosshair' }}
        flaeche={{
          role: 'slider',
          tabIndex: 0,
          'aria-label': ariaLabel,
          'aria-valuemin': 0,
          'aria-valuemax': n - 1,
          'aria-valuenow': idx,
          'aria-valuetext': `${achse[idx]}: ${reihen
            .map((r) => `${r.name} ${r.werte[idx] == null ? t('zrKeinWert') : format(r.werte[idx] as number)}`)
            .join(', ')}`,
          onPointerDown: zeigen,
          onPointerMove: (e) => {
            if (e.pointerType === 'mouse' || e.buttons > 0 || e.pointerType === 'touch') zeigen(e)
          },
          onKeyDown: taste,
        }}
      >
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          {reihen.map((r) =>
            stuecke(r.werte).linien.map((punkte, i) => (
              <polyline
                key={`${r.name}${i}`}
                points={punkte}
                fill="none"
                stroke={r.farbe}
                strokeWidth={2}
                strokeDasharray={r.strich || undefined}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )),
          )}
        </svg>
        {/* Einzelwerte zwischen Luecken */}
        {reihen.map((r) =>
          stuecke(r.werte).punkte.map((i) => (
            <span
              key={`${r.name}p${i}`}
              aria-hidden
              style={{
                position: 'absolute',
                left: `${x(i)}%`,
                top: `${y(r.werte[i] as number)}%`,
                width: 6,
                height: 6,
                borderRadius: 999,
                background: r.farbe,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )),
        )}
        {/* Auswahl: Linie und ein Punkt je Reihe */}
        <div
          aria-hidden
          style={{ position: 'absolute', top: 0, bottom: 0, left: `${x(idx)}%`, borderLeft: `1px solid ${c.ink}`, opacity: 0.5 }}
        />
        {reihen.map((r) => {
          const v = r.werte[idx]
          if (v == null) return null
          return (
            <span
              key={r.name}
              aria-hidden
              style={{
                position: 'absolute',
                left: `${x(idx)}%`,
                top: `${y(v)}%`,
                width: 10,
                height: 10,
                borderRadius: 999,
                background: r.farbe,
                border: `2px solid ${c.bg}`,
                boxSizing: 'content-box',
                transform: 'translate(-50%, -50%)',
              }}
            />
          )
        })}
      </Diagramm>

      {/* Dieselben Werte als Tabelle: nachlesbar, kopierbar, fuer Vorleseprogramme */}
      <details style={{ marginTop: spacing.sm }}>
        <summary
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 44,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: fontSize.xs,
            color: c.inkSoft,
          }}
        >
          {t('zrTabelle')}
        </summary>
        <div style={{ maxHeight: 320, overflow: 'auto', borderTop: `1px solid ${c.ink}`, borderBottom: `1px solid ${c.border}` }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.ink }}>
            <caption style={{ captionSide: 'top', textAlign: 'left', padding: `${spacing.sm}px 0`, color: c.muted }}>{yTitel}</caption>
            <thead>
              <tr>
                <th scope="col" style={{ ...zelle, textAlign: 'left', paddingLeft: 0, color: c.muted, fontWeight: 400 }}>
                  {t('zrZeitpunkt')}
                </th>
                {reihen.map((r) => (
                  <th key={r.name} scope="col" style={{ ...zelle, fontWeight: 700 }}>
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {achse
                .map((a, i) => ({ a, i }))
                .reverse()
                .map(({ a, i }) => (
                  <tr key={a} style={{ borderTop: `1px solid ${c.border}` }}>
                    <th scope="row" style={{ ...zelle, textAlign: 'left', paddingLeft: 0, fontWeight: 400 }}>
                      {a}
                    </th>
                    {reihen.map((r) => (
                      <td key={r.name} style={zelle}>
                        {r.werte[i] == null ? t('zrKeinWert') : (formatMarke ?? format)(r.werte[i] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
