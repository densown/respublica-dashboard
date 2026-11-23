import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Platzhalter, useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import type { MeinOrt } from '../../hooks/useMeins'
import { shortFraktionName, wahlkreisTeile } from '../bundestag/fraktion'
import { Portraet } from '../bundestag/Portraet'
import type { AbgeordnetenApiRow } from '../bundestag/sitzplaetze'
import { StimmMarke } from '../bundestag/StimmMarke'
import { normalizeStimme, type Stimme, type StimmenZeile } from '../bundestag/stimmen'

/** Alle Abgeordneten, die im Wahlkreis angetreten sind und im Bundestag sitzen. */
function abgeordneteImWahlkreis(alle: AbgeordnetenApiRow[], ort: MeinOrt): AbgeordnetenApiRow[] {
  return alle.filter((a) => wahlkreisTeile(a.wahlkreis)?.name === ort.name)
}

/**
 * Die Abgeordneten aus dem eigenen Wahlkreis mit Foto. Mit `pollId` steht
 * daneben, wie sie bei dieser Abstimmung gestimmt haben: so wird aus einer
 * Zahl im Bundestag etwas, das mit dem eigenen Ort zu tun hat.
 */
export function MeineAbgeordneten({ ort, pollId }: { ort: MeinOrt; pollId?: number }) {
  const { c, t } = useTheme()
  const { data, loading } = useApi<AbgeordnetenApiRow[]>('/api/abgeordnete')
  const { data: stimmen } = useApi<{ votes: StimmenZeile[] }>(
    pollId ? `/api/bundestag/poll-votes/${pollId}` : '',
  )

  const meine = useMemo(() => abgeordneteImWahlkreis(data ?? [], ort), [data, ort])
  const stimmeVon = useMemo(
    () => new Map((stimmen?.votes ?? []).map((v) => [v.mandate_id, normalizeStimme(v.vote)] as const)),
    [stimmen],
  )

  if (loading && !data) return <Platzhalter zeilen={2} form="zeile" />
  if (meine.length === 0) {
    return (
      <p style={{ margin: 0, fontFamily: fonts.body, fontSize: fontSize.md, color: c.muted }}>
        {t('ortNiemand')}
      </p>
    )
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {meine.map((a) => {
        const stimme: Stimme | undefined = stimmeVon.get(a.aw_id)
        return (
          <li key={a.aw_id}>
            <Link
              to={`/bundestag/abgeordnete/${a.aw_id}`}
              className="rp-zeile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 56,
                padding: `${spacing.sm}px 0`,
                borderBottom: `1px solid ${c.border}`,
                color: c.ink,
                textDecoration: 'none',
              }}
            >
              <Portraet name={a.name} fotoUrl={a.foto_url ?? null} groesse={44} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontFamily: fonts.body,
                    fontWeight: 600,
                    fontSize: fontSize.base,
                    lineHeight: lineHeight.tight,
                  }}
                >
                  {a.name}
                </span>
                <span style={{ display: 'block', fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
                  {shortFraktionName(a.fraktion)}
                </span>
              </span>
              {stimme && <StimmMarke stimme={stimme} />}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
