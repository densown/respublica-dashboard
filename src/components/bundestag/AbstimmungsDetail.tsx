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

function farbeForFraktion(
  partei: string,
  rows: { partei: string; farbe: string }[],
): string {
  const hit = rows.find(
    (r) =>
      partei.includes(r.partei) ||
      r.partei.includes(partei.split(/\s+/)[0] ?? ''),
  )
  return hit?.farbe ?? '#888888'
}

export function AbstimmungsDetail({
  data,
  sitzverteilung,
}: AbstimmungsDetailProps) {
  const { c, t } = useTheme()
  const { ergebnis } = data
  const accepted = ergebnis.ja_gesamt > ergebnis.nein_gesamt

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = `${baseUrl}/bundestag/${data.poll_id}`

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

      {data.fraktionen.map((f) => (
        <VoteBar
          key={f.partei}
          label={f.partei}
          labelColor={farbeForFraktion(f.partei, sitzverteilung)}
          ja={f.ja}
          nein={f.nein}
          enthalten={f.enthalten}
          abwesend={f.abwesend}
        />
      ))}

      <ShareToolbar title={data.poll_titel} url={shareUrl} />
    </div>
  )
}
