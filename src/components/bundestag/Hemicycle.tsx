import { useEffect, useMemo, useState } from 'react'
import { RAW_SEATS } from '../../data/bundestag-seats'
import { fonts, spacing } from '../../design-system/tokens'
import { useTheme } from '../../design-system/ThemeContext'

const VIEW_W = 800
const VIEW_H = 410
const SEAT_R = 5.8
const FRACT_ANIM_MS = 350

export type SitzverteilungRow = {
  partei: string
  farbe: string
  sitze: number
  position: number
}

export type FraktionVote = {
  partei: string
  ja: number
  nein: number
  enthalten: number
  abwesend: number
}

export interface HemicycleProps {
  sitzverteilung: SitzverteilungRow[]
  abstimmung?: { fraktionen: FraktionVote[] }
  animating?: boolean
}

type MergedParty = {
  key: string
  partei: string
  farbe: string
  sitze: number
  position: number
}

type SeatDerived = {
  cx: number
  cy: number
  rawPartei: string
  rawFarbe: string
  fraktionsIndex: number
  idxInFrak: number
}

function canonicalKey(partei: string): string {
  const s = partei.trim().toLowerCase()
  if (/\blinke\b|die linke|dielinke/.test(s)) return 'linke'
  if (/\bbsw\b|bündnis sarah wagenknecht/.test(s)) return 'bsw'
  if (
    /\bgrün|grüne|bündnis\s*90|b90/.test(s) ||
    (s.includes('grün') && !s.includes('grünwald'))
  )
    return 'grüne'
  if (/\bspd\b|sozialdemokrat/.test(s)) return 'spd'
  if (/\bcdu\b|\bcsu\b|cdu\/csu/.test(s)) return 'cdu/csu'
  if (/\bafd\b/.test(s)) return 'afd'
  if (/fraktionslos|fraktionslose|parteilos|unabhängig/.test(s))
    return 'fraktionslos'
  if (/\bfdp\b|freie demokraten/.test(s)) return 'fdp'
  if (/\bssw\b/.test(s)) return 'ssw'
  return 'unknown'
}

function sortedSitz(sitz: SitzverteilungRow[]): SitzverteilungRow[] {
  return [...sitz].sort((a, b) => a.position - b.position)
}

function mergePartiesForLegend(
  rows: SitzverteilungRow[],
  cduFill: string,
): { legendByKey: Map<string, MergedParty> } {
  const sorted = sortedSitz(rows)
  const map = new Map<string, MergedParty>()

  for (const r of sorted) {
    let key = canonicalKey(r.partei)
    if (key === 'unknown') key = `ext:${r.partei.trim().toLowerCase()}`
    const farbe = key === 'cdu/csu' ? cduFill : r.farbe
    const prev = map.get(key)
    if (prev) {
      map.set(key, {
        key,
        partei: r.partei,
        farbe: key === 'cdu/csu' ? cduFill : prev.farbe,
        sitze: prev.sitze + r.sitze,
        position: Math.min(prev.position, r.position),
      })
    } else {
      map.set(key, {
        key,
        partei: r.partei,
        farbe,
        sitze: r.sitze,
        position: r.position,
      })
    }
  }

  return { legendByKey: map }
}

/** Legenden-Reihenfolge: Kurzname für die Anzeige */
const LEGEND_ORDER: readonly { key: string; kurz: string }[] = [
  { key: 'linke', kurz: 'Die Linke' },
  { key: 'bsw', kurz: 'BSW' },
  { key: 'grüne', kurz: 'Grüne' },
  { key: 'spd', kurz: 'SPD' },
  { key: 'fdp', kurz: 'FDP' },
  { key: 'cdu/csu', kurz: 'CDU/CSU' },
  { key: 'afd', kurz: 'AfD' },
  { key: 'fraktionslos', kurz: 'Fraktionslos' },
]

function orderedLegend(
  legendByKey: Map<string, MergedParty>,
  cduFill: string,
): MergedParty[] {
  const ordered: MergedParty[] = []
  const used = new Set<string>()
  for (const { key, kurz } of LEGEND_ORDER) {
    const p = legendByKey.get(key)
    if (p && p.sitze > 0) {
      used.add(key)
      ordered.push({
        ...p,
        partei: kurz,
        farbe: key === 'cdu/csu' ? cduFill : p.farbe,
      })
    }
  }
  const rest = [...legendByKey.values()]
    .filter((p) => !used.has(p.key) && p.sitze > 0)
    .sort((a, b) => a.position - b.position)
  return [...ordered, ...rest]
}

function matchApiRowForSeat(
  seatLabel: string,
  rows: SitzverteilungRow[],
): SitzverteilungRow | undefined {
  const sorted = sortedSitz(rows)
  const sk = canonicalKey(seatLabel)
  if (sk !== 'unknown') {
    const hit = sorted.find((r) => canonicalKey(r.partei) === sk)
    if (hit) return hit
  }
  const sl = seatLabel.toLowerCase()
  return sorted.find((r) => {
    const rl = r.partei.toLowerCase()
    return rl.includes(sl) || sl.includes(rl)
  })
}

function partyFillForSeat(
  seatLabel: string,
  rawFarbe: string,
  rows: SitzverteilungRow[],
  cduFill: string,
): string {
  const row = matchApiRowForSeat(seatLabel, rows)
  if (!row) {
    return canonicalKey(seatLabel) === 'cdu/csu' ? cduFill : rawFarbe
  }
  return canonicalKey(row.partei) === 'cdu/csu' ? cduFill : row.farbe
}

function displayParteiForSeat(
  seatLabel: string,
  rows: SitzverteilungRow[],
): string {
  return matchApiRowForSeat(seatLabel, rows)?.partei ?? seatLabel
}

function matchFraktionVote(
  seatLabel: string,
  fraktionen: FraktionVote[],
): FraktionVote | undefined {
  const sk = canonicalKey(seatLabel)
  const s = seatLabel.toLowerCase()
  return fraktionen.find((f) => {
    const fl = f.partei.toLowerCase()
    if (sk !== 'unknown') {
      const fk = canonicalKey(f.partei)
      if (fk !== 'unknown' && fk === sk) return true
    }
    if (fl.includes(s) || s.includes(fl)) return true
    if (sk === 'grüne' && fl.includes('grün')) return true
    if (sk === 'linke' && fl.includes('linke')) return true
    if (sk === 'cdu/csu' && (fl.includes('cdu') || fl.includes('csu')))
      return true
    if (sk === 'afd' && /\bafd\b/i.test(fl)) return true
    if (sk === 'fdp' && /\bfdp\b/i.test(fl)) return true
    if (sk === 'spd' && /\bspd\b/i.test(fl)) return true
    if (sk === 'bsw' && fl.includes('bsw')) return true
    if (sk === 'ssw' && fl.includes('ssw')) return true
    if (sk === 'fraktionslos' && fl.includes('fraktionslos')) return true
    return false
  })
}

function voteColorForSeatInPartei(
  localIndex: number,
  f: FraktionVote,
  yes: string,
  no: string,
  abstain: string,
  absent: string,
): string {
  const { ja, nein, enthalten } = f
  if (localIndex < ja) return yes
  if (localIndex < ja + nein) return no
  if (localIndex < ja + nein + enthalten) return abstain
  return absent
}

function buildSeatDerived(): SeatDerived[] {
  const counters = new Map<string, number>()
  return RAW_SEATS.map(([cx, cy, rawPartei, rawFarbe, fraktionsIndex]) => {
    const i = counters.get(rawPartei) ?? 0
    counters.set(rawPartei, i + 1)
    return {
      cx,
      cy,
      rawPartei,
      rawFarbe,
      fraktionsIndex,
      idxInFrak: i,
    }
  })
}

export function Hemicycle({
  sitzverteilung,
  abstimmung,
  animating,
}: HemicycleProps) {
  const { c, t, theme } = useTheme()
  const [voteReveal, setVoteReveal] = useState(false)

  const cduSeat = theme === 'dark' ? '#CCCCCC' : '#000000'

  const { legendByKey } = useMemo(
    () => mergePartiesForLegend(sitzverteilung, cduSeat),
    [sitzverteilung, cduSeat],
  )

  const legendOrdered = useMemo(
    () => orderedLegend(legendByKey, cduSeat),
    [legendByKey, cduSeat],
  )

  const seatDerived = useMemo(() => buildSeatDerived(), [])

  const seatRender = useMemo(() => {
    return seatDerived.map((d) => {
      const partyColor = partyFillForSeat(
        d.rawPartei,
        d.rawFarbe,
        sitzverteilung,
        cduSeat,
      )
      const partei = displayParteiForSeat(d.rawPartei, sitzverteilung)
      const fv =
        abstimmung != null
          ? matchFraktionVote(d.rawPartei, abstimmung.fraktionen)
          : undefined
      const voteColor =
        fv != null
          ? voteColorForSeatInPartei(
              d.idxInFrak,
              fv,
              c.yes,
              c.no,
              c.abstain,
              c.absent,
            )
          : partyColor
      return {
        ...d,
        partyColor,
        partei,
        voteColor,
        delay: d.fraktionsIndex * FRACT_ANIM_MS,
      }
    })
  }, [
    seatDerived,
    sitzverteilung,
    cduSeat,
    abstimmung,
    c.yes,
    c.no,
    c.abstain,
    c.absent,
  ])

  useEffect(() => {
    if (!abstimmung) {
      setVoteReveal(false)
      return
    }
    setVoteReveal(false)
    const id = window.requestAnimationFrame(() => setVoteReveal(true))
    return () => window.cancelAnimationFrame(id)
  }, [abstimmung])

  const showVoteFill = Boolean(abstimmung && voteReveal)

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        style={{
          width: '100%',
          maxWidth: 820,
          display: 'block',
          margin: '0 auto',
          background: c.bg,
        }}
        aria-label="Bundestag-Sitzverteilung"
        aria-busy={animating ? true : undefined}
      >
        <title>Bundestag-Sitzverteilung</title>
        <rect
          x={382}
          y={392}
          width={36}
          height={12}
          rx={2}
          fill={c.muted}
          opacity={0.55}
        />
        <rect
          x={374}
          y={396}
          width={10}
          height={8}
          rx={1}
          fill={c.border}
          opacity={0.9}
        />
        <rect
          x={416}
          y={396}
          width={10}
          height={8}
          rx={1}
          fill={c.border}
          opacity={0.9}
        />

        {seatRender.map((s, i) => {
          const fill =
            showVoteFill && abstimmung ? s.voteColor : s.partyColor
          return (
            <circle
              key={i}
              cx={s.cx}
              cy={s.cy}
              r={SEAT_R}
              fill={fill}
              style={{
                transition: abstimmung ? 'fill 0.4s ease' : 'fill 0.2s ease',
                transitionDelay: abstimmung ? `${s.delay}ms` : '0ms',
              }}
            >
              <title>{s.partei}</title>
            </circle>
          )
        })}
      </svg>

      <div
        style={{
          marginTop: spacing.lg,
          padding: spacing.md,
          borderRadius: 8,
          border: `1px solid ${c.border}`,
          borderLeft: `3px solid ${c.red}`,
          background: c.cardBg,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing.md,
            justifyContent: 'center',
            fontFamily: fonts.body,
            fontSize: '0.78rem',
            color: c.muted,
          }}
        >
          {!abstimmung &&
            legendOrdered.map((p) => (
              <span
                key={p.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: p.farbe,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: c.ink }}>
                  {p.partei}{' '}
                  <span style={{ fontFamily: fonts.mono, fontSize: '0.7rem' }}>
                    ({p.sitze} {t('seats')})
                  </span>
                </span>
              </span>
            ))}
          {abstimmung && (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: c.yes,
                  }}
                />
                <span style={{ color: c.ink }}>{t('yes')}</span>
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: c.no,
                  }}
                />
                <span style={{ color: c.ink }}>{t('no')}</span>
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: c.abstain,
                  }}
                />
                <span style={{ color: c.ink }}>{t('abstained')}</span>
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: c.absent,
                  }}
                />
                <span style={{ color: c.ink }}>{t('absentL')}</span>
              </span>
            </>
          )}
        </div>
        {!abstimmung && (
          <p
            style={{
              marginTop: spacing.md,
              marginBottom: 0,
              fontFamily: fonts.body,
              fontSize: '0.72rem',
              color: c.subtle,
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            {t('hemicycleVoteHint')}
          </p>
        )}
      </div>
    </div>
  )
}
