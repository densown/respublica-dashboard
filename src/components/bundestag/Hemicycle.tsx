import { useEffect, useMemo, useState } from 'react'
import { fonts, spacing } from '../../design-system/tokens'
import { useTheme } from '../../design-system/ThemeContext'

const INNER_RADIUS = 120
const OUTER_RADIUS = 280
const ROW_SPACING = 16
const SEAT_RADIUS = 5
const GAP = 2
const PITCH = SEAT_RADIUS * 2 + GAP

const VOTE_YES = '#2D7D46'
const VOTE_NO = '#B91C1C'
const VOTE_ABSTAIN = '#94A3B8'
const VOTE_ABSENT = '#D1D5DB'

const CX = 300
const CY = 300

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
}

type Seat = {
  id: string
  x: number
  y: number
  partei: string
  fraktionIndex: number
  seatInPartei: number
  partyColor: string
  voteColor: string
  delay: number
}

function sortedSitz(sitz: SitzverteilungRow[]): SitzverteilungRow[] {
  return [...sitz].sort((a, b) => a.position - b.position)
}

function matchFraktion(
  parteiShort: string,
  fraktionen: FraktionVote[],
): FraktionVote | undefined {
  const short = parteiShort.trim()
  const s = short.toLowerCase()
  return fraktionen.find((f) => {
    const fl = f.partei.toLowerCase()
    if (fl.includes(s)) return true
    if (s === 'grüne' && fl.includes('grün')) return true
    if (s === 'cdu/csu' && (fl.includes('cdu') || fl.includes('csu')))
      return true
    if (s === 'linke' && fl.includes('linke')) return true
    if (s === 'afd' && /\bafd\b/i.test(fl)) return true
    if (s === 'fdp' && /\bfdp\b/i.test(fl)) return true
    if (s === 'spd' && /\bspd\b/i.test(fl)) return true
    if (s === 'bsw' && fl.includes('bsw')) return true
    if (s === 'fraktionslos' && fl.includes('fraktionslos')) return true
    return false
  })
}

function voteColorForSeatInPartei(
  localIndex: number,
  f: FraktionVote,
): string {
  const { ja, nein, enthalten } = f
  if (localIndex < ja) return VOTE_YES
  if (localIndex < ja + nein) return VOTE_NO
  if (localIndex < ja + nein + enthalten) return VOTE_ABSTAIN
  return VOTE_ABSENT
}

function generateSeats(sitz: SitzverteilungRow[]): Omit<Seat, 'voteColor'>[] {
  const ordered = sortedSitz(sitz)
  const totalNeeded = ordered.reduce((s, p) => s + p.sitze, 0)
  const slots: { r: number; theta: number }[] = []

  for (let r = INNER_RADIUS; r <= OUTER_RADIUS; r += ROW_SPACING) {
    const arc = Math.PI * r
    const n = Math.max(1, Math.floor(arc / PITCH))
    for (let i = 0; i < n; i++) {
      const theta =
        n === 1 ? Math.PI / 2 : Math.PI - (i / (n - 1)) * Math.PI
      slots.push({ r, theta })
    }
  }

  let rExtra = OUTER_RADIUS + ROW_SPACING
  while (slots.length < totalNeeded && rExtra <= 420) {
    const arc = Math.PI * rExtra
    const n = Math.max(1, Math.floor(arc / PITCH))
    for (let i = 0; i < n; i++) {
      const theta =
        n === 1 ? Math.PI / 2 : Math.PI - (i / (n - 1)) * Math.PI
      slots.push({ r: rExtra, theta })
    }
    rExtra += ROW_SPACING
  }

  const used = slots.slice(0, totalNeeded)

  const seats: Omit<Seat, 'voteColor'>[] = []
  let partyIdx = 0
  let takenInParty = 0
  let seatInPartei = 0

  for (let g = 0; g < used.length; g++) {
    const { r, theta } = used[g]
    const x = CX + r * Math.cos(theta)
    const y = CY - r * Math.sin(theta)

    while (partyIdx < ordered.length && takenInParty >= ordered[partyIdx].sitze) {
      partyIdx += 1
      takenInParty = 0
      seatInPartei = 0
    }
    if (partyIdx >= ordered.length) break

    const row = ordered[partyIdx]
    seats.push({
      id: `s-${g}`,
      x,
      y,
      partei: row.partei,
      fraktionIndex: partyIdx,
      seatInPartei,
      partyColor: row.farbe,
      delay: partyIdx * 300,
    })
    takenInParty += 1
    seatInPartei += 1
  }

  return seats
}

export function Hemicycle({
  sitzverteilung,
  abstimmung,
}: HemicycleProps) {
  const { c, t } = useTheme()
  const [voteReveal, setVoteReveal] = useState(false)

  const baseSeats = useMemo(
    () => generateSeats(sitzverteilung),
    [sitzverteilung],
  )

  const seats: Seat[] = useMemo(() => {
    const fr = abstimmung?.fraktionen ?? []
    return baseSeats.map((s) => {
      const fv = matchFraktion(s.partei, fr)
      const voteColor =
        fv != null ? voteColorForSeatInPartei(s.seatInPartei, fv) : s.partyColor
      return { ...s, voteColor }
    })
  }, [baseSeats, abstimmung])

  useEffect(() => {
    if (!abstimmung) {
      setVoteReveal(false)
      return
    }
    setVoteReveal(false)
    const id = window.requestAnimationFrame(() => {
      setVoteReveal(true)
    })
    return () => window.cancelAnimationFrame(id)
  }, [abstimmung])

  const showVoteFill = Boolean(abstimmung && voteReveal)

  const legendParties = sortedSitz(sitzverteilung)

  return (
    <div>
      <svg
        viewBox="0 0 600 320"
        style={{
          width: '100%',
          maxWidth: 600,
          display: 'block',
          margin: '0 auto',
          background: 'transparent',
        }}
        aria-label="Bundestag Hemicycle"
      >
        {seats.map((seat) => {
          const fill =
            showVoteFill && abstimmung ? seat.voteColor : seat.partyColor
          return (
            <circle
              key={seat.id}
              cx={seat.x}
              cy={seat.y}
              r={SEAT_RADIUS}
              fill={fill}
              style={{
                transition: abstimmung
                  ? 'fill 0.4s ease'
                  : 'fill 0.2s ease',
                transitionDelay: abstimmung ? `${seat.delay}ms` : '0ms',
              }}
            >
              <title>{seat.partei}</title>
            </circle>
          )
        })}
      </svg>

      <div
        style={{
          marginTop: spacing.lg,
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
          legendParties.map((p) => (
            <span
              key={p.partei}
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
              <span style={{ color: c.inkSoft }}>
                {p.partei}{' '}
                <span style={{ fontFamily: fonts.mono, fontSize: '0.7rem' }}>
                  ({p.sitze} {t('seats')})
                </span>
              </span>
            </span>
          ))}
        {abstimmung && (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: VOTE_YES,
                }}
              />
              {t('yes')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: VOTE_NO,
                }}
              />
              {t('no')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: VOTE_ABSTAIN,
                }}
              />
              {t('abstained')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: VOTE_ABSENT,
                }}
              />
              {t('absentL')}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
