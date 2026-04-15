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
  individuelleVotes?: Map<number, 'yes' | 'no' | 'abstain' | 'no_show'>
  abgeordnete?: Map<
    number,
    {
      aw_id: number
      name: string
      fraktion: string
      wahlkreis: string
      foto_url: string | null
      profil_url: string | null
    }
  >
  animating?: boolean
  onSeatSelect?: (seatId: number) => void
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
  seatId: number
  rawPartei: string
  rawFarbe: string
  fraktionsIndex: number
  idxInFrak: number
}

const normalizeFraktion = (f: string): string => f.replace(/\u00AD/g, '').trim()
const SSW_COLOR = '#003F8E'
const SSW_NAME = 'Stefan Seidler'

function getEffektiveFraktion(abgeordneter: { name: string; fraktion: string }): string {
  if (normalizeFraktion(abgeordneter.name) === SSW_NAME) return 'SSW'
  return normalizeFraktion(abgeordneter.fraktion)
}

function canonicalKey(fraktion: string): string {
  const f = normalizeFraktion(fraktion).toLowerCase()
  if (f.includes('grün') || f.includes('bündnis')) return 'Grüne'
  if (f.includes('linke')) return 'Linke'
  if (f.includes('spd')) return 'SPD'
  if (f.includes('cdu') || f.includes('csu')) return 'CDU/CSU'
  if (f.includes('afd')) return 'AfD'
  if (f.includes('ssw')) return 'SSW'
  if (f === 'fraktionslos') return 'Fraktionslos'
  return fraktion
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
    const key = canonicalKey(r.partei)
    const farbe = key === 'CDU/CSU' ? cduFill : r.farbe
    const prev = map.get(key)
    if (prev) {
      map.set(key, {
        key,
        partei: r.partei,
        farbe: key === 'CDU/CSU' ? cduFill : prev.farbe,
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

  const fraktionslos = map.get('Fraktionslos')
  const hasSsw = map.has('SSW')
  if (!hasSsw && fraktionslos && fraktionslos.sitze > 0) {
    map.set('SSW', {
      key: 'SSW',
      partei: 'SSW',
      farbe: SSW_COLOR,
      sitze: 1,
      position: fraktionslos.position,
    })
    map.set('Fraktionslos', {
      ...fraktionslos,
      sitze: Math.max(0, fraktionslos.sitze - 1),
    })
  }

  return { legendByKey: map }
}

/** Legenden-Reihenfolge: Kurzname für die Anzeige */
const LEGEND_ORDER: readonly { key: string; kurz: string }[] = [
  { key: 'Linke', kurz: 'Die Linke' },
  { key: 'SSW', kurz: 'SSW' },
  { key: 'Grüne', kurz: 'Grüne' },
  { key: 'SPD', kurz: 'SPD' },
  { key: 'CDU/CSU', kurz: 'CDU/CSU' },
  { key: 'AfD', kurz: 'AfD' },
  { key: 'Fraktionslos', kurz: 'Fraktionslos' },
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
        farbe: key === 'CDU/CSU' ? cduFill : p.farbe,
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
  const hit = sorted.find((r) => canonicalKey(r.partei) === sk)
  if (hit) return hit
  const sl = seatLabel.toLowerCase()
  const slNorm = normalizeFraktion(sl)
  return sorted.find((r) => {
    const rl = normalizeFraktion(r.partei).toLowerCase()
    return rl.includes(slNorm) || slNorm.includes(rl)
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
    return canonicalKey(seatLabel) === 'CDU/CSU' ? cduFill : rawFarbe
  }
  return canonicalKey(row.partei) === 'CDU/CSU' ? cduFill : row.farbe
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
  const s = normalizeFraktion(seatLabel).toLowerCase()
  return fraktionen.find((f) => {
    const fl = normalizeFraktion(f.partei).toLowerCase()
    const fk = canonicalKey(f.partei)
    if (fk === sk) return true
    if (fl.includes(s) || s.includes(fl)) return true
    if (sk === 'Grüne' && fl.includes('grün')) return true
    if (sk === 'Linke' && fl.includes('linke')) return true
    if (sk === 'CDU/CSU' && (fl.includes('cdu') || fl.includes('csu')))
      return true
    if (sk === 'AfD' && /\bafd\b/i.test(fl)) return true
    if (sk === 'SPD' && /\bspd\b/i.test(fl)) return true
    if (sk === 'SSW' && fl.includes('ssw')) return true
    if (sk === 'Fraktionslos' && fl.includes('fraktionslos')) return true
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
  return RAW_SEATS.map(
    ([cx, cy, rawPartei, rawFarbe, fraktionsIndex], seatId) => {
    const i = counters.get(rawPartei) ?? 0
    counters.set(rawPartei, i + 1)
    return {
      cx,
      cy,
      seatId,
      rawPartei,
      rawFarbe,
      fraktionsIndex,
      idxInFrak: i,
    }
    },
  )
}

export function Hemicycle({
  sitzverteilung,
  abstimmung,
  individuelleVotes,
  abgeordnete,
  animating,
  onSeatSelect,
}: HemicycleProps) {
  const { c, t, theme } = useTheme()
  const [voteReveal, setVoteReveal] = useState(false)
  const [hoveredSeatId, setHoveredSeatId] = useState<number | null>(null)

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
      const abg = abgeordnete?.get(d.seatId)
      const individuellerVote =
        abg != null ? individuelleVotes?.get(abg.aw_id) : undefined

      let voteColor = partyColor
      let voteLabel: string | undefined
      if (individuellerVote === 'yes') {
        voteColor = c.yes
        voteLabel = t('yes')
      } else if (individuellerVote === 'no') {
        voteColor = c.no
        voteLabel = t('no')
      } else if (individuellerVote === 'abstain') {
        voteColor = c.abstain
        voteLabel = t('abstain')
      } else if (individuellerVote === 'no_show') {
        voteColor = c.absent
        voteLabel = t('absentL')
      } else if (fv != null) {
        voteColor = voteColorForSeatInPartei(
          d.idxInFrak,
          fv,
          c.yes,
          c.no,
          c.abstain,
          c.absent,
        )
        voteLabel =
          d.idxInFrak < fv.ja
            ? t('yes')
            : d.idxInFrak < fv.ja + fv.nein
              ? t('no')
              : d.idxInFrak < fv.ja + fv.nein + fv.enthalten
                ? t('abstain')
                : t('absentL')
      }
      return {
        ...d,
        partyColor,
        partei,
        voteColor,
        voteLabel,
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
    t,
    abgeordnete,
    individuelleVotes,
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
  const hoveredSeat = hoveredSeatId != null ? seatRender[hoveredSeatId] : null
  const hoveredAbg = hoveredSeatId != null ? abgeordnete?.get(hoveredSeatId) : null

  return (
    <div style={{ position: 'relative' }}>
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
          const abg = abgeordnete?.get(s.seatId)
          const effektiveFraktion =
            abg != null
              ? getEffektiveFraktion({ name: abg.name, fraktion: abg.fraktion })
              : null
          const title =
            abg != null
              ? `${abg.name} (${effektiveFraktion ?? abg.fraktion})\nWahlkreis: ${abg.wahlkreis}${
                  abstimmung && s.voteLabel ? `\nStimme: ${s.voteLabel}` : ''
                }`
              : s.partei
          return (
            <circle
              key={i}
              cx={s.cx}
              cy={s.cy}
              r={SEAT_R}
              fill={fill}
              onMouseEnter={() => setHoveredSeatId(s.seatId)}
              onMouseLeave={() => setHoveredSeatId((prev) => (prev === s.seatId ? null : prev))}
              onClick={() => {
                if (abgeordnete?.has(s.seatId)) onSeatSelect?.(s.seatId)
              }}
              style={{
                transition: abstimmung ? 'fill 0.4s ease' : 'fill 0.2s ease',
                transitionDelay: abstimmung ? `${s.delay}ms` : '0ms',
                cursor: abgeordnete?.has(s.seatId) ? 'pointer' : 'default',
              }}
            >
              <title>{title}</title>
            </circle>
          )
        })}
      </svg>
      {hoveredSeat && hoveredAbg && (
        <div
          style={{
            position: 'absolute',
            left: `${(hoveredSeat.cx / VIEW_W) * 100}%`,
            top: `${(hoveredSeat.cy / VIEW_H) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 12px))',
            pointerEvents: 'none',
            zIndex: 3,
            background: c.cardBg,
            border: `1px solid ${c.border}`,
            borderRadius: 6,
            padding: `${spacing.xs}px ${spacing.sm}px`,
            boxShadow: c.shadow,
            minWidth: 140,
          }}
        >
          <div
            style={{
              fontFamily: fonts.body,
              color: c.ink,
              fontSize: '0.78rem',
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {hoveredAbg.name}
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              color: c.muted,
              fontSize: '0.66rem',
              marginTop: 2,
            }}
          >
            {getEffektiveFraktion({
              name: hoveredAbg.name,
              fraktion: hoveredAbg.fraktion,
            })}
          </div>
        </div>
      )}

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
                <span style={{ color: c.ink }}>{t('abstain')}</span>
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
