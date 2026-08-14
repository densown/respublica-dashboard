import { useMemo } from 'react'
import { useTheme } from '../../design-system'
import { fonts, fontSize, radius, spacing } from '../../design-system/tokens'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { governanceFarbe } from './governanceScale'
import type { LandVerlauf } from './governanceTypes'

type Props = {
  laender: LandVerlauf[]
  lang: 'de' | 'en'
  seit: number
  /** Beschriftung der Delta-Spalte, etwa "seit 2013". */
  deltaLabel: string
  onSelect?: (iso3: string) => void
  selected?: string | null
}

/**
 * Ein Streifen je Jahr, eine Zeile je Land.
 *
 * Bewusst kein Liniendiagramm: bei sieben Laendern ueber 24 Jahre kreuzen sich
 * die Linien so oft, dass man einzelne Verlaeufe nicht mehr folgen kann. Die
 * Streifen zeigen stattdessen die Richtung als Flaeche — man liest sie ohne
 * Achsen und ohne Legende, und der Bruch bei Hongkong ab 2019 springt sofort
 * ins Auge.
 *
 * Technisch sind es schlichte divs. Kein Chart, keine Bibliothek, identisches
 * Verhalten auf dem Handy.
 */
export function GovernanceStripes({
  laender,
  lang,
  seit,
  deltaLabel,
  onSelect,
  selected,
}: Props) {
  const { c, theme } = useTheme()
  const narrow = useIsMobile()
  const dunkel = theme === 'dark'

  const spanne = useMemo(() => {
    const alle = laender.flatMap((l) => l.jahre)
    return alle.length ? { von: Math.min(...alle), bis: Math.max(...alle) } : null
  }, [laender])

  if (!laender.length || !spanne) return null

  const namensBreite = narrow ? 82 : 116

  return (
    <div>
      {/* Jahreszahlen nur an den Raendern und am Bezugsjahr — 24 Zahlen
          nebeneinander waeren auf dem Handy unlesbar. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: spacing.sm,
          marginBottom: spacing.xs,
          fontFamily: fonts.mono,
          fontSize: fontSize.micro,
          color: c.muted,
        }}
      >
        <span style={{ width: namensBreite, flex: `0 0 ${namensBreite}px` }} />
        <span style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
          <span>{spanne.von}</span>
          <span>{seit}</span>
          <span>{spanne.bis}</span>
        </span>
        <span style={{ width: 52, flex: '0 0 52px' }} />
      </div>

      {laender.map((l) => {
        const aktiv = l.iso3 === selected
        const name = lang === 'de' ? l.name_de : l.name_en
        const delta = l.veraenderung
        return (
          <div
            key={l.iso3}
            onClick={onSelect ? () => onSelect(l.iso3) : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              marginBottom: 3,
              cursor: onSelect ? 'pointer' : 'default',
              opacity: selected && !aktiv ? 0.55 : 1,
            }}
          >
            <span
              style={{
                width: namensBreite,
                flex: `0 0 ${namensBreite}px`,
                textAlign: 'right',
                fontFamily: fonts.body,
                fontSize: fontSize.sm,
                fontWeight: aktiv ? 700 : 400,
                color: c.ink,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </span>

            <span style={{ display: 'flex', flex: 1, gap: 1, minWidth: 0 }}>
              {l.werte.map((w, i) => (
                <span
                  key={l.jahre[i]}
                  title={`${l.jahre[i]}: ${w.toFixed(2)}`}
                  style={{
                    flex: 1,
                    height: narrow ? 20 : 26,
                    borderRadius: 1,
                    background: governanceFarbe(w, dunkel),
                  }}
                />
              ))}
            </span>

            <span
              style={{
                width: 52,
                flex: '0 0 52px',
                textAlign: 'right',
                fontFamily: fonts.mono,
                fontSize: fontSize.xs,
                color:
                  delta == null || Math.abs(delta) < 0.05
                    ? c.subtle
                    : delta > 0
                      ? c.yes
                      : c.no,
              }}
              title={deltaLabel}
            >
              {delta == null
                ? '—'
                : `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(delta).toFixed(2)}`}
            </span>
          </div>
        )
      })}

      {/* Legende: die Skala ist divergierend, das muss man einmal sagen */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          marginTop: spacing.md,
          fontFamily: fonts.mono,
          fontSize: fontSize.micro,
          color: c.muted,
          flexWrap: 'wrap',
        }}
      >
        {[
          { w: 1.4, t: lang === 'de' ? 'über dem Weltmittel' : 'above world average' },
          { w: 0, t: lang === 'de' ? 'Weltmittel' : 'world average' },
          { w: -1.4, t: lang === 'de' ? 'darunter' : 'below' },
        ].map((x) => (
          <span key={x.t} style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: radius.xs,
                background: governanceFarbe(x.w, dunkel),
                border: `1px solid ${c.border}`,
              }}
            />
            {x.t}
          </span>
        ))}
      </div>
    </div>
  )
}
