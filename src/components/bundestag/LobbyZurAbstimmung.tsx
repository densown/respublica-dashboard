import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../design-system'
import { fontSize, fonts, lineHeight, spacing } from '../../design-system/tokens'

export type LobbyZurAbstimmungData = {
  drucksachen: string[]
  gesamt: number
  organisationen: Array<{
    register_number: string | null
    name: string | null
    financial_expenses_euro: number | null
    vorhaben: number
    titel: string | null
    project_url: string | null
    drucksache: string | null
  }>
}

const ZUERST = 8

/**
 * Organisationen, die im Lobbyregister ein Vorhaben mit einer Drucksache
 * dieser Abstimmung angegeben haben. Die Angabe ist eine Selbstauskunft:
 * Sie sagt, wer das Vorhaben als Gegenstand seiner Interessenvertretung
 * nennt, nicht, wer sich durchgesetzt hat. Der Text darueber sagt das dazu.
 */
export function LobbyZurAbstimmung({ data }: { data: LobbyZurAbstimmungData }) {
  const { c, t, lang } = useTheme()
  const [alle, setAlle] = useState(false)
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'

  const geld = (wert: number | null): string => {
    if (wert == null) return t('voteLobbyNoAmount')
    if (wert >= 1_000_000) {
      return `${(wert / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })} ${lang === 'de' ? 'Mio. €' : 'm €'}`
    }
    return `${Math.round(wert).toLocaleString(locale)} €`
  }

  const liste = alle ? data.organisationen : data.organisationen.slice(0, ZUERST)
  const rest = data.organisationen.length - liste.length

  return (
    <div style={{ maxWidth: 720 }}>
      <p
        style={{
          margin: `0 0 ${spacing.md}px`,
          fontFamily: fonts.body,
          fontSize: fontSize.md,
          lineHeight: lineHeight.relaxed,
          color: c.inkSoft,
        }}
      >
        {t('voteLobbyIntro')
          .replace('{n}', String(data.gesamt))
          .replace('{drs}', data.drucksachen.join(', '))}
      </p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {liste.map((o, i) => (
          <li
            key={`${o.register_number ?? ''}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: spacing.md,
              padding: `${spacing.sm}px 0`,
              borderBottom: `1px solid ${c.border}`,
            }}
          >
            <span style={{ minWidth: 0 }}>
              {o.register_number ? (
                <Link
                  to={`/lobbyregister?register=${encodeURIComponent(o.register_number)}`}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: fontSize.base,
                    fontWeight: 600,
                    color: c.ink,
                    textDecorationColor: c.red,
                    textUnderlineOffset: 3,
                  }}
                >
                  {o.name || o.register_number}
                </Link>
              ) : (
                <span style={{ fontFamily: fonts.body, fontSize: fontSize.base, fontWeight: 600, color: c.ink }}>
                  {o.name || ''}
                </span>
              )}
            </span>
            <span
              style={{
                flexShrink: 0,
                fontFamily: fonts.mono,
                fontSize: fontSize.sm,
                color: c.muted,
                whiteSpace: 'nowrap',
              }}
            >
              {geld(o.financial_expenses_euro)}
            </span>
          </li>
        ))}
      </ol>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setAlle(true)}
          style={{
            marginTop: spacing.md,
            minHeight: 44,
            padding: `0 ${spacing.md}px`,
            background: 'transparent',
            border: `1px solid ${c.border}`,
            borderRadius: 2,
            fontFamily: fonts.body,
            fontSize: fontSize.md,
            color: c.ink,
            cursor: 'pointer',
          }}
        >
          {t('voteLobbyMore').replace('{n}', String(rest))}
        </button>
      )}
      <p
        style={{
          margin: `${spacing.md}px 0 0`,
          fontFamily: fonts.body,
          fontStyle: 'italic',
          fontSize: fontSize.sm,
          lineHeight: lineHeight.relaxed,
          color: c.muted,
        }}
      >
        {t('voteLobbyNote')}
      </p>
    </div>
  )
}
