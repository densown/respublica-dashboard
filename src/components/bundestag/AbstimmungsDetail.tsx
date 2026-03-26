import { useMemo } from 'react'
import { Badge, ShareToolbar, VoteBar, useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'

export type AbstimmungsDetailData = {
  poll_id: number
  poll_titel: string
  poll_datum: string
  ergebnis: {
    ja_gesamt: number
    nein_gesamt: number
    enthalten_gesamt: number
    abwesend_gesamt: number
  }
  fraktionen: {
    partei: string
    ja: number
    nein: number
    enthalten: number
    abwesend: number
  }[]
}

export interface AbstimmungsDetailProps {
  data: AbstimmungsDetailData
  sitzverteilung: { partei: string; farbe: string }[]
}

/** Stimmfarben im Fraktionsbalken (Bundestag) */
const BUNDESTAG_VOTE_SEG = {
  ja: '#2D8E4E',
  nein: '#C92A2A',
  enthalten: '#8899AA',
  abwesend: '#CDD5DE',
} as const

const BUNDESTAG_WP_SUFFIX = /\s*\(Bundestag\s+2025\s*[-–]\s*2029\)\s*$/i

/** Kürzt API-Parteilabel für die Ansicht */
export function shortFraktionName(apiPartei: string): string {
  let s = apiPartei.replace(BUNDESTAG_WP_SUFFIX, '').trim()
  const l = s.toLowerCase()
  if (
    (l.includes('bündnis') || l.includes('b90')) &&
    (l.includes('grün') || l.includes('grüne'))
  )
    return 'Grüne'
  if (l.includes('linke')) return 'Die Linke'
  if (l.includes('cdu') || l.includes('csu')) return 'CDU/CSU'
  if (/\bfdp\b/.test(l)) return 'FDP'
  if (/\bspd\b/.test(l)) return 'SPD'
  if (/\bafd\b/.test(l)) return 'AfD'
  if (l.includes('fraktionslos')) return 'Fraktionslos'
  if (l.includes('bsw')) return 'BSW'
  if (l.includes('ssw')) return 'SSW'
  return s
}

/** Politische Reihenfolge links → rechts; nicht Gematchtes ans Ende */
export const PARTEI_ORDER = [
  'Linke',
  'BSW',
  'Grüne',
  'BÜNDNIS',
  'SPD',
  'FDP',
  'CDU',
  'AfD',
  'fraktionslos',
] as const

const FDP_LABEL_COLOR = '#B8860B'

function matchesOrderToken(apiPartei: string, token: string): boolean {
  const p = apiPartei.toLowerCase()
  const tok = token.toLowerCase()
  if (tok === 'grüne' || tok === 'bündnis')
    return p.includes('grün') || p.includes('bündnis')
  if (tok === 'linke') return p.includes('linke')
  if (tok === 'bsw') return p.includes('bsw')
  if (tok === 'spd') return /\bspd\b/.test(p)
  if (tok === 'fdp') return /\bfdp\b/.test(p)
  if (tok === 'cdu') return p.includes('cdu') || p.includes('csu')
  if (tok === 'afd') return /\bafd\b/.test(p)
  if (tok === 'fraktionslos') return p.includes('fraktionslos')
  return p.includes(tok)
}

function politicalSortIndex(apiPartei: string): number {
  const hits = PARTEI_ORDER.map((token, i) =>
    matchesOrderToken(apiPartei, token) ? i : -1,
  ).filter((i) => i >= 0)
  return hits.length ? Math.min(...hits) : PARTEI_ORDER.length
}

function matchesSitzRow(apiPartei: string, stamm: string): boolean {
  const p = apiPartei.toLowerCase()
  const s = stamm.toLowerCase()
  if (s === 'grüne') return p.includes('grün') || p.includes('bündnis')
  if (s.includes('cdu') || stamm === 'CDU/CSU')
    return p.includes('cdu') || p.includes('csu')
  if (s === 'linke') return p.includes('linke')
  if (s === 'fraktionslos') return p.includes('fraktionslos')
  if (s === 'afd') return /\bafd\b/.test(p)
  if (s === 'fdp') return /\bfdp\b/.test(p)
  if (s === 'spd') return /\bspd\b/.test(p)
  if (s === 'bsw') return p.includes('bsw')
  return p.includes(s) || apiPartei.includes(stamm)
}

/** Farbe aus sitzverteilung; FDP-Label wegen Kontrast dunkelgold */
export function labelColorFromSitzverteilung(
  apiPartei: string,
  rows: { partei: string; farbe: string }[],
): string {
  const row = rows.find((r) => matchesSitzRow(apiPartei, r.partei))
  const farbe = row?.farbe
  if (!farbe) return '#888888'
  if (row?.partei === 'FDP' || /\bfdp\b/i.test(apiPartei)) return FDP_LABEL_COLOR
  return farbe
}

function labelColorForVoteBar(
  apiPartei: string,
  rows: { partei: string; farbe: string }[],
  theme: 'light' | 'dark',
): string {
  const base = labelColorFromSitzverteilung(apiPartei, rows)
  if (theme === 'dark') {
    const hex = base.replace('#', '').toLowerCase()
    if (hex === '000000' || hex === '1a1a1a') return '#CCCCCC'
  }
  return base
}

export function sortFraktionenByPoliticalOrder<
  T extends { partei: string },
>(fraktionen: T[]): T[] {
  return [...fraktionen].sort(
    (a, b) => politicalSortIndex(a.partei) - politicalSortIndex(b.partei),
  )
}

export function AbstimmungsDetail({
  data,
  sitzverteilung,
}: AbstimmungsDetailProps) {
  const { c, t, theme } = useTheme()
  const { ergebnis } = data
  const accepted = ergebnis.ja_gesamt > ergebnis.nein_gesamt

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = `${baseUrl}/bundestag/${data.poll_id}`

  const fraktionenSorted = useMemo(
    () => sortFraktionenByPoliticalOrder(data.fraktionen),
    [data.fraktionen],
  )

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: '1.1rem',
            fontWeight: 700,
            color: c.ink,
            flex: '1 1 240px',
            lineHeight: 1.35,
          }}
        >
          {data.poll_titel}
        </h2>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: '0.75rem',
            color: c.muted,
            flexShrink: 0,
          }}
        >
          {data.poll_datum}
        </span>
      </div>

      <div style={{ marginBottom: spacing.md }}>
        <Badge
          variant={accepted ? 'yes' : 'no'}
          text={accepted ? t('accepted') : t('rejected')}
        />
      </div>

      <p
        style={{
          fontFamily: fonts.display,
          fontSize: '1.5rem',
          fontWeight: 700,
          margin: `0 0 ${spacing.sm}px`,
          lineHeight: 1.25,
        }}
      >
        <span style={{ color: c.yes }}>{ergebnis.ja_gesamt}</span>
        <span style={{ color: c.muted, fontWeight: 400 }}> {t('yes')} </span>
        <span style={{ color: c.muted }}>/ </span>
        <span style={{ color: c.no }}>{ergebnis.nein_gesamt}</span>
        <span style={{ color: c.muted, fontWeight: 400 }}> {t('no')}</span>
      </p>
      <p
        style={{
          fontFamily: fonts.mono,
          fontSize: '0.75rem',
          color: c.muted,
          margin: `0 0 ${spacing.lg}px`,
        }}
      >
        {t('abstained')}: {ergebnis.enthalten_gesamt} / {t('absentL')}:{' '}
        {ergebnis.abwesend_gesamt}
      </p>

      <p
        style={{
          fontFamily: fonts.mono,
          fontSize: '0.6rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: c.muted,
          marginBottom: spacing.sm,
        }}
      >
        {t('result')}
      </p>

      {fraktionenSorted.map((f) => (
        <VoteBar
          key={f.partei}
          label={shortFraktionName(f.partei)}
          labelColor={labelColorForVoteBar(f.partei, sitzverteilung, theme)}
          ja={f.ja}
          nein={f.nein}
          enthalten={f.enthalten}
          abwesend={f.abwesend}
          trackVariant="outline"
          segmentColors={BUNDESTAG_VOTE_SEG}
          expandedDetails="secondary"
        />
      ))}

      <ShareToolbar title={data.poll_titel} url={shareUrl} />
    </div>
  )
}
