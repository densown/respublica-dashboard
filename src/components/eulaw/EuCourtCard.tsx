import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Badge, DataCard, useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { breakpoints, fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import { formatDisplayDate } from '../gesetze/utils'
import type { EuUrteilDetail, EuUrteilListItem } from './types'

const EUGH_COLOR = '#dc2626'
const EUG_COLOR = '#2563eb'
const PREVIEW_LEN = 220

function useIsNarrow() {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.innerWidth < breakpoints.mobile,
  )
  useEffect(() => {
    const onResize = () =>
      setNarrow(window.innerWidth < breakpoints.mobile)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return narrow
}

function trunc(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

function courtColors(gericht: string): { bg: string; fg: string } {
  if (gericht === 'EuG') return { bg: EUG_COLOR, fg: '#FFFFFF' }
  return { bg: EUGH_COLOR, fg: '#FFFFFF' }
}

function courtLabel(gericht: string, t: (k: I18nKey) => string): string {
  if (gericht === 'EuG') return t('euLawCourtBadgeEuG')
  return t('euLawCourtBadgeEuGH')
}

function keywordsToList(kw: string | null | undefined): string[] {
  if (!kw?.trim()) return []
  const s = kw.trim()
  if (s.includes(','))
    return s.split(',').map((x) => x.trim()).filter(Boolean)
  return s.split(/\n+/).map((x) => x.trim()).filter(Boolean)
}

export type EuCourtCardProps = {
  item: EuUrteilListItem
  startExpanded?: boolean
}

export function EuCourtCard({ item, startExpanded }: EuCourtCardProps) {
  const { c, t, lang } = useTheme()
  const narrow = useIsNarrow()
  const [expanded, setExpanded] = useState(Boolean(startExpanded))

  useEffect(() => {
    if (startExpanded) setExpanded(true)
  }, [startExpanded, item.id])

  const detailEndpoint = expanded
    ? `/api/eu-urteile/${encodeURIComponent(String(item.id))}`
    : ''
  const { data: detail, loading: detailLoading } =
    useApi<EuUrteilDetail>(detailEndpoint)

  const title =
    (item.betreff ?? '').trim() ||
    (item.parteien ?? '').trim() ||
    item.celex

  const summary =
    lang === 'de'
      ? (item.zusammenfassung_de ?? '').trim()
      : (item.zusammenfassung_en ?? '').trim()

  const preview = summary ? trunc(summary, PREVIEW_LEN) : ''

  const fullSummary =
    lang === 'de'
      ? (item.zusammenfassung_de ?? '').trim()
      : (item.zusammenfassung_en ?? '').trim()

  const impact =
    lang === 'de'
      ? (item.auswirkung_de ?? '').trim()
      : (item.auswirkung_en ?? '').trim()

  const cc = courtColors(item.gericht)
  const badgeText = courtLabel(item.gericht, t)

  const toggle = useCallback(() => {
    setExpanded((v) => !v)
  }, [])

  const onCardClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const el = e.target as HTMLElement
      if (el.closest('a, button')) return
      toggle()
    },
    [toggle],
  )

  const titleStyle: CSSProperties = {
    fontFamily: fonts.body,
    fontSize: narrow ? '0.9rem' : '1rem',
    fontWeight: 600,
    lineHeight: 1.35,
    color: c.ink,
    margin: 0,
    marginTop: spacing.sm,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }

  const headerRow: ReactNode = (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
        flexWrap: 'nowrap',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xs,
          minWidth: 0,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            fontFamily: fonts.body,
            fontSize: '0.72rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: `${spacing.xs}px ${spacing.sm}px`,
            borderRadius: 4,
            background: cc.bg,
            color: cc.fg,
            lineHeight: 1.2,
          }}
        >
          {badgeText}
        </span>
        {item.ecli?.trim() ? (
          <p
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.68rem',
              color: c.muted,
              margin: 0,
              wordBreak: 'break-all',
            }}
          >
            {item.ecli.trim()}
          </p>
        ) : (
          <p
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.72rem',
              color: c.muted,
              margin: 0,
            }}
          >
            {item.celex}
          </p>
        )}
      </div>
      {item.datum ? (
        <time
          dateTime={item.datum}
          style={{
            fontFamily: fonts.mono,
            fontSize: '0.75rem',
            color: c.muted,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {formatDisplayDate(item.datum, lang)}
        </time>
      ) : null}
    </div>
  )

  const kwStrings = useMemo(
    () => keywordsToList(detail?.keywords),
    [detail?.keywords],
  )

  const disclaimerBlock = (
    <p
      style={{
        fontFamily: fonts.body,
        fontSize: '0.76rem',
        color: c.muted,
        marginTop: spacing.sm,
        marginBottom: 0,
      }}
    >
      {t('euLawAiDisclaimerEmoji')}
    </p>
  )

  return (
    <DataCard header={headerRow}>
      <div
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        <p style={titleStyle}>{title}</p>

        {item.rechtsgebiet?.trim() ? (
          <div style={{ marginTop: spacing.sm }}>
            <Badge text={item.rechtsgebiet.trim()} variant="muted" />
          </div>
        ) : null}

        {summary && !expanded ? (
          <>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: '0.88rem',
                lineHeight: 1.6,
                color: c.ink,
                marginTop: spacing.md,
                marginBottom: 0,
              }}
            >
              {preview}
            </p>
            {disclaimerBlock}
          </>
        ) : null}

        {expanded ? (
          <div
            onClick={(e) => e.stopPropagation()}
            role="presentation"
            style={{ marginTop: spacing.lg }}
          >
            {fullSummary ? (
              <>
                <p
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.58rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: c.muted,
                    marginBottom: spacing.sm,
                  }}
                >
                  {t('euLawCourtSummarySection')}
                </p>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    color: c.ink,
                    marginTop: 0,
                    marginBottom: spacing.md,
                  }}
                >
                  {fullSummary}
                </p>
              </>
            ) : null}

            {impact ? (
              <>
                <p
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.58rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: c.muted,
                    marginBottom: spacing.sm,
                  }}
                >
                  {t('euLawCourtImpactSection')}
                </p>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    color: c.ink,
                    marginTop: 0,
                    marginBottom: spacing.md,
                  }}
                >
                  {impact}
                </p>
              </>
            ) : null}

            {disclaimerBlock}

            {detailLoading ? (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: '0.82rem',
                  color: c.muted,
                  marginTop: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                {t('euLawDetailLoading')}
              </p>
            ) : null}

            {detail?.leitsatz?.trim() ? (
              <div style={{ marginBottom: spacing.md }}>
                <p
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.58rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: c.muted,
                    marginBottom: spacing.sm,
                  }}
                >
                  {t('euLawCourtHeadnote')}
                </p>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '0.86rem',
                    lineHeight: 1.6,
                    color: c.ink,
                    margin: 0,
                  }}
                >
                  {detail.leitsatz.trim()}
                </p>
              </div>
            ) : null}

            {kwStrings.length ? (
              <div style={{ marginBottom: spacing.md }}>
                <p
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.58rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: c.muted,
                    marginBottom: spacing.sm,
                  }}
                >
                  {t('euLawKeywordsHeading')}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  {kwStrings.map((tag) => (
                    <Badge key={tag} text={tag} variant="muted" />
                  ))}
                </div>
              </div>
            ) : null}

            {detail?.linked_rechtsakte?.length ? (
              <div style={{ marginBottom: spacing.md }}>
                <p
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.58rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: c.muted,
                    marginBottom: spacing.sm,
                  }}
                >
                  {t('euLawCourtLinkedActs')}
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: spacing.lg,
                    fontFamily: fonts.body,
                    fontSize: '0.84rem',
                    color: c.ink,
                    lineHeight: 1.5,
                  }}
                >
                  {detail.linked_rechtsakte.map((lr) => {
                    const tit =
                      lang === 'de'
                        ? lr.titel_de ?? lr.titel_en
                        : lr.titel_en ?? lr.titel_de
                    const cx = lr.akt_celex ?? lr.rechtsakt_celex ?? '—'
                    return (
                      <li key={lr.link_id}>
                        <span style={{ fontFamily: fonts.mono, fontSize: '0.8rem' }}>
                          {cx}
                        </span>
                        {tit ? ` — ${tit}` : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.sm,
              }}
            >
              {item.eurlex_url ? (
                <a
                  href={item.eurlex_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.78rem',
                    color: c.red,
                    textDecoration: 'none',
                    borderBottom: `1px solid ${c.red}55`,
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {t('euLawViewEurlexArrow')}
                </a>
              ) : null}
              {item.curia_url ? (
                <a
                  href={item.curia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.78rem',
                    color: c.red,
                    textDecoration: 'none',
                    borderBottom: `1px solid ${c.red}55`,
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {t('euLawViewCuriaArrow')}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </DataCard>
  )
}
