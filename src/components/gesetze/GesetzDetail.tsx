import { useMemo, useState, type CSSProperties } from 'react'
import { Badge, EmptyState, LoadingSpinner, useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import { courtBadgeVariant, formatDisplayDate } from './utils'
import type { Gesetz, Urteil } from './types'

export type GesetzDetailProps = {
  gesetz: Gesetz | null
  loading: boolean
  error: string | null
  notFound?: boolean
  linkedUrteile: Urteil[]
  lobbyItems: LobbyLawResponse
  lobbyLoading: boolean
  lobbyError: string | null
}

export type LobbyLawItem = {
  id: number
  title: string | null
  project_number: string | null
  project_url: string | null
  lobbyist_name: string | null
  financial_expenses_euro: number | null
}

export type LobbyLawResponse = {
  exact: LobbyLawItem[]
  related: LobbyLawItem[]
}

function DiffSynopse({ diff }: { diff: string }) {
  const { c, theme } = useTheme()
  const isDark = theme === 'dark'
  const greenBg = isDark ? '#1a3a2a' : '#e6ffec'
  const greenFg = isDark ? '#7ee787' : '#1a7f37'
  const redBg = isDark ? '#3d1f1f' : '#ffebe9'
  const redFg = isDark ? '#ff7b72' : '#cf222e'
  const hunkFg = isDark ? '#79c0ff' : '#0969da'

  const lines = diff.split(/\r?\n/)

  return (
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: '0.72rem',
        lineHeight: 1.5,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: 420,
        background: c.bgAlt,
      }}
    >
      {lines.map((line, i) => {
        const lineStyle: CSSProperties = {
          background: 'transparent',
          color: c.ink,
          fontStyle: 'normal',
          padding: `${2}px ${spacing.md}px`,
          whiteSpace: 'pre',
          minHeight: '1.35em',
        }
        if (line.startsWith('+') && !line.startsWith('+++')) {
          lineStyle.background = greenBg
          lineStyle.color = greenFg
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          lineStyle.background = redBg
          lineStyle.color = redFg
        } else if (line.startsWith('@@')) {
          lineStyle.color = hunkFg
          lineStyle.fontStyle = 'italic'
        }
        return (
          <div key={`${i}-${line.slice(0, 32)}`} style={lineStyle}>
            {line || '\u00a0'}
          </div>
        )
      })}
    </div>
  )
}

export function GesetzDetail({
  gesetz,
  loading,
  error,
  notFound = false,
  linkedUrteile,
  lobbyItems,
  lobbyLoading,
  lobbyError,
}: GesetzDetailProps) {
  const { c, t, lang } = useTheme()
  const [kontextOpen, setKontextOpen] = useState(false)
  const [synopseOpen, setSynopseOpen] = useState(false)

  const sortedLinked = useMemo(
    () =>
      [...linkedUrteile].sort((a, b) => {
        const ta = (a.datum && Date.parse(a.datum)) || 0
        const tb = (b.datum && Date.parse(b.datum)) || 0
        return tb - ta
      }),
    [linkedUrteile],
  )

  if (loading) {
    return <LoadingSpinner />
  }

  if (notFound) {
    return <EmptyState text={t('gesetzNotFound')} />
  }

  if (error) {
    return (
      <div
        style={{
          padding: spacing.xl,
          fontFamily: fonts.body,
          color: c.no,
        }}
      >
        {error}
      </div>
    )
  }

  if (!gesetz) {
    return <EmptyState text={t('gesetzSelectPrompt')} />
  }

  const ku = (gesetz.kuerzel ?? '').trim()
  const titel =
    (gesetz.titel ?? '').trim() ||
    (gesetz.name ?? '').trim() ||
    ku ||
    '—'
  const summary = (gesetz.zusammenfassung ?? '').trim()
  const kontext = (gesetz.kontext ?? '').trim()
  const diffRaw = (gesetz.diff ?? '').trim()
  const hasSummary = summary.length > 0

  const toggleBtnStyle: CSSProperties = {
    display: 'inline-block',
    marginTop: spacing.sm,
    padding: 0,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontFamily: fonts.body,
    fontSize: '0.9rem',
    color: c.red,
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  }

  const formatMoney = (value: number | null): string => {
    if (value == null) return '—'
    const locale = lang === 'de' ? 'de-DE' : 'en-GB'
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toLocaleString(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} ${lang === 'de' ? 'Mrd €' : 'bn €'}`
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} ${lang === 'de' ? 'Mio €' : 'm €'}`
    }
    return `${value.toLocaleString(locale)} €`
  }

  const hasExactLobby = lobbyItems.exact.length > 0
  const hasRelatedLobby = lobbyItems.related.length > 0

  return (
    <div
      style={{
        padding: spacing.lg,
        paddingLeft: spacing.xl,
        minHeight: 200,
      }}
    >
      <h2
        style={{
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize: 'clamp(1.2rem, 2.5vw, 1.65rem)',
          color: c.ink,
          lineHeight: 1.2,
          marginBottom: spacing.sm,
          wordBreak: 'break-word',
        }}
      >
        {titel}
      </h2>
      {(gesetz.amtliche_abkuerzung ?? '').trim() ||
      ku ||
      (gesetz.ausfertigung_datum ?? '').trim() ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing.sm,
            fontFamily: fonts.mono,
            fontSize: '0.78rem',
            color: c.muted,
            marginBottom: spacing.md,
          }}
        >
          {(gesetz.amtliche_abkuerzung ?? '').trim() || ku ? (
            <span>{(gesetz.amtliche_abkuerzung ?? '').trim() || ku}</span>
          ) : null}
          {gesetz.ausfertigung_datum ? (
            <time dateTime={gesetz.ausfertigung_datum}>
              {formatDisplayDate(gesetz.ausfertigung_datum, lang)}
            </time>
          ) : null}
        </div>
      ) : null}
      {(gesetz.letzter_stand ?? '').trim() ? (
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: '0.82rem',
            lineHeight: 1.5,
            color: c.muted,
            marginBottom: spacing.md,
          }}
        >
          <span style={{ fontFamily: fonts.mono, fontSize: '0.68rem' }}>
            {t('gesetzeLetzterStand')}
            {': '}
          </span>
          {(gesetz.letzter_stand ?? '').trim()}
        </p>
      ) : null}

      {hasSummary ? (
        <>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.98rem',
              lineHeight: 1.65,
              color: c.ink,
              marginBottom: spacing.sm,
            }}
          >
            {summary}
          </p>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.78rem',
              lineHeight: 1.5,
              color: c.muted,
              marginBottom: spacing.lg,
            }}
          >
            {t('legislationAiDisclaimerEmoji')}
          </p>
        </>
      ) : null}

      {kontext ? (
        <div style={{ marginBottom: spacing.lg }}>
          <button
            type="button"
            aria-expanded={kontextOpen}
            onClick={() => setKontextOpen((v) => !v)}
            style={toggleBtnStyle}
          >
            {kontextOpen ? t('gesetzeKontextHide') : t('gesetzeKontextShow')}
          </button>
          {kontextOpen ? (
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: '0.92rem',
                lineHeight: 1.65,
                color: c.inkSoft,
                marginTop: spacing.md,
                whiteSpace: 'pre-wrap',
              }}
            >
              {kontext}
            </p>
          ) : null}
        </div>
      ) : null}

      {gesetz.bgbl_referenz ? (
        <div style={{ marginBottom: spacing.lg }}>
          <Badge text={String(gesetz.bgbl_referenz)} variant="muted" />
        </div>
      ) : null}

      <div style={{ marginBottom: spacing.xl }}>
        <button
          type="button"
          aria-expanded={synopseOpen}
          onClick={() => setSynopseOpen((v) => !v)}
          style={toggleBtnStyle}
        >
          {synopseOpen ? t('gesetzeSynopseHide') : t('gesetzeSynopseShow')}
        </button>
        {synopseOpen ? (
          <div style={{ marginTop: spacing.md }}>
            {!diffRaw ? (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: '0.88rem',
                  color: c.muted,
                }}
              >
                {t('gesetzeNoSynopse')}
              </p>
            ) : (
              <DiffSynopse diff={diffRaw} />
            )}
          </div>
        ) : null}
      </div>

      <section>
        <h3
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: '1.1rem',
            color: c.ink,
            marginBottom: spacing.md,
          }}
        >
          {t('lobbyActivityTitle')}
        </h3>
        {lobbyLoading ? (
          <LoadingSpinner />
        ) : lobbyError ? (
          <p
            style={{
              fontFamily: fonts.body,
              color: c.no,
              fontSize: '0.86rem',
              marginBottom: spacing.lg,
            }}
          >
            {t('dataLoadError')}
          </p>
        ) : !hasExactLobby && !hasRelatedLobby ? (
          <p
            style={{
              fontFamily: fonts.body,
              color: c.muted,
              fontSize: '0.9rem',
              marginBottom: spacing.lg,
            }}
          >
            {t('lobbyActivityEmpty')}
          </p>
        ) : (
          <>
            {hasExactLobby ? (
              <div style={{ marginBottom: spacing.lg }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    marginBottom: spacing.xs,
                  }}
                >
                  <h4
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      color: c.ink,
                      margin: 0,
                    }}
                  >
                    {t('lobbyActivityExactTitle')}
                  </h4>
                  <Badge text={t('lobbyActivityExactBadge')} variant="yes" />
                </div>
                <p
                  style={{
                    fontFamily: fonts.body,
                    color: c.muted,
                    fontSize: '0.84rem',
                    marginTop: 0,
                    marginBottom: spacing.md,
                  }}
                >
                  {t('lobbyActivityExactSubtext')}
                </p>
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing.sm,
                  }}
                >
                  {lobbyItems.exact.map((item) => (
                    <li
                      key={`exact-${item.id}-${item.project_number ?? ''}`}
                      style={{
                        borderBottom: `1px solid ${c.border}`,
                        paddingBottom: spacing.sm,
                      }}
                    >
                      <div style={{ fontFamily: fonts.body, fontWeight: 700, color: c.ink }}>
                        {item.lobbyist_name || '—'}
                      </div>
                      <div style={{ fontFamily: fonts.mono, fontSize: '0.78rem', color: c.muted }}>
                        {formatMoney(item.financial_expenses_euro)}
                      </div>
                      <div
                        style={{
                          fontFamily: fonts.body,
                          fontStyle: 'italic',
                          color: c.inkSoft,
                          fontSize: '0.9rem',
                          marginTop: 2,
                        }}
                      >
                        {item.title || '—'}
                      </div>
                      {item.project_url ? (
                        <a
                          href={item.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: '0.75rem',
                            color: c.red,
                            textDecoration: 'none',
                          }}
                        >
                          {t('lobbyProjectLinkProject')} →
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasRelatedLobby ? (
              <div style={{ marginBottom: spacing.xl }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    marginBottom: spacing.xs,
                  }}
                >
                  <h4
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      color: c.ink,
                      margin: 0,
                    }}
                  >
                    {t('lobbyActivityRelatedTitle')}
                  </h4>
                  <Badge text={t('lobbyActivityRelatedBadge')} variant="muted" />
                </div>
                <p
                  style={{
                    fontFamily: fonts.body,
                    color: c.muted,
                    fontSize: '0.84rem',
                    marginTop: 0,
                    marginBottom: spacing.md,
                  }}
                >
                  {t('lobbyActivityRelatedSubtext')}
                </p>
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing.sm,
                  }}
                >
                  {lobbyItems.related.map((item) => (
                    <li
                      key={`related-${item.id}-${item.project_number ?? ''}`}
                      style={{
                        borderBottom: `1px solid ${c.border}`,
                        paddingBottom: spacing.sm,
                      }}
                    >
                      <div style={{ fontFamily: fonts.body, fontWeight: 700, color: c.ink }}>
                        {item.lobbyist_name || '—'}
                      </div>
                      <div style={{ fontFamily: fonts.mono, fontSize: '0.78rem', color: c.muted }}>
                        {formatMoney(item.financial_expenses_euro)}
                      </div>
                      <div
                        style={{
                          fontFamily: fonts.body,
                          fontStyle: 'italic',
                          color: c.inkSoft,
                          fontSize: '0.9rem',
                          marginTop: 2,
                        }}
                      >
                        {item.title || '—'}
                      </div>
                      {item.project_url ? (
                        <a
                          href={item.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: '0.75rem',
                            color: c.red,
                            textDecoration: 'none',
                          }}
                        >
                          {t('lobbyProjectLinkProject')} →
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section>
        <h3
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: '1.1rem',
            color: c.ink,
            marginBottom: spacing.md,
          }}
        >
          {t('linkedRulings')} ({sortedLinked.length})
        </h3>
        {sortedLinked.length === 0 ? (
          <p
            style={{
              fontFamily: fonts.body,
              color: c.muted,
              fontSize: '0.9rem',
            }}
          >
            {t('noRulingsForLaw')}
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.sm,
            }}
          >
            {sortedLinked.map((u) => (
              <li
                key={u.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm}px 0`,
                  borderBottom: `1px solid ${c.border}`,
                }}
              >
                <Badge
                  text={(u.gericht ?? '').trim() || '—'}
                  variant={courtBadgeVariant(u.gericht ?? '')}
                />
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.82rem',
                    color: c.ink,
                  }}
                >
                  {u.aktenzeichen?.trim() || '—'}
                </span>
                <time
                  dateTime={u.datum ?? undefined}
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.75rem',
                    color: c.muted,
                    marginLeft: 'auto',
                  }}
                >
                  {formatDisplayDate(u.datum, lang)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
