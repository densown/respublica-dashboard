import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, DataCard, useTheme } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { breakpoints, fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import { formatDisplayDate } from '../gesetze/utils'
import type { EuRechtDetail, EuRechtListItem } from './types'

const REG_COLOR = '#2563eb'
const DIR_COLOR = '#16a34a'
const DEC_COLOR = '#d97706'
const PREVIEW_LEN = 200

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

function typColors(typ: string): { bg: string; fg: string } {
  if (typ === 'REG') return { bg: REG_COLOR, fg: '#FFFFFF' }
  if (typ === 'DIR') return { bg: DIR_COLOR, fg: '#FFFFFF' }
  if (typ === 'DEC') return { bg: DEC_COLOR, fg: '#FFFFFF' }
  return { bg: '#6B7280', fg: '#FFFFFF' }
}

function typLabelI18n(
  typ: string,
  t: (k: I18nKey) => string,
): string {
  if (typ === 'REG') return t('euLawTypRegulation')
  if (typ === 'DIR') return t('euLawTypDirective')
  if (typ === 'DEC') return t('euLawTypDecision')
  return typ
}

function eurovocToStrings(tags: unknown): string[] {
  if (tags == null) return []
  if (Array.isArray(tags)) {
    return tags
      .map((x) => {
        if (typeof x === 'string') return x.trim()
        if (x && typeof x === 'object' && 'label' in x) {
          const l = (x as { label?: unknown }).label
          return typeof l === 'string' ? l.trim() : ''
        }
        return String(x)
      })
      .filter(Boolean)
  }
  if (typeof tags === 'string') {
    const s = tags.trim()
    if (!s) return []
    try {
      const p = JSON.parse(s) as unknown
      return eurovocToStrings(p)
    } catch {
      return [s]
    }
  }
  return []
}

export type EuLawCardProps = {
  item: EuRechtListItem
  startExpanded?: boolean
}

export function EuLawCard({ item, startExpanded }: EuLawCardProps) {
  const { c, t, lang } = useTheme()
  const navigate = useNavigate()
  const narrow = useIsNarrow()
  const [expanded, setExpanded] = useState(Boolean(startExpanded))

  useEffect(() => {
    if (startExpanded) setExpanded(true)
  }, [startExpanded, item.id])

  const detailEndpoint = expanded
    ? `/api/eu-recht/${encodeURIComponent(String(item.id))}`
    : ''
  const { data: detail, loading: detailLoading } =
    useApi<EuRechtDetail>(detailEndpoint)

  const title =
    lang === 'de'
      ? (item.titel_de ?? item.titel_en ?? '—')
      : (item.titel_en ?? item.titel_de ?? '—')

  const summaryFull = (item.zusammenfassung ?? '').trim()
  const preview = summaryFull ? trunc(summaryFull, PREVIEW_LEN) : ''

  const tc = typColors(String(item.typ))
  const typBadgeText =
    lang === 'de' && item.typ_label?.trim()
      ? item.typ_label.trim()
      : typLabelI18n(String(item.typ), t)

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
    WebkitLineClamp: 2,
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
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
        <span
          style={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            fontFamily: fonts.mono,
            fontSize: '0.63rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: `${spacing.xs}px ${spacing.sm}px`,
            borderRadius: 3,
            background: tc.bg,
            color: tc.fg,
            lineHeight: 1.2,
          }}
        >
          {typBadgeText}
        </span>
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

  const eurovocStrings = useMemo(
    () => eurovocToStrings(detail?.eurovoc_tags),
    [detail?.eurovoc_tags],
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

        {summaryFull && !expanded ? (
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
          </>
        ) : null}

        {expanded ? (
          <div
            onClick={(e) => e.stopPropagation()}
            role="presentation"
            style={{ marginTop: spacing.lg }}
          >
            {summaryFull ? (
              <>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    color: c.ink,
                    marginTop: 0,
                    marginBottom: 0,
                  }}
                >
                  {summaryFull}
                </p>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '0.76rem',
                    color: c.muted,
                    marginTop: spacing.sm,
                    marginBottom: spacing.md,
                  }}
                >
                  {t('euLawAiDisclaimerEmoji')}
                </p>
              </>
            ) : null}
            {item.linked_gesetze?.length ? (
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
                  {t('euLawLinkedGermanLaws')}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  {item.linked_gesetze.map((g) => (
                    <button
                      key={`${g.id}-${g.kuerzel}`}
                      type="button"
                      onClick={() => navigate(`/gesetze/${g.id}`)}
                      style={{
                        minHeight: 44,
                        minWidth: 44,
                        padding: `${spacing.xs}px ${spacing.sm}px`,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Badge text={g.kuerzel} variant="muted" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {detailLoading ? (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: '0.82rem',
                  color: c.muted,
                  marginBottom: spacing.md,
                }}
              >
                {t('euLawDetailLoading')}
              </p>
            ) : eurovocStrings.length ? (
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
                  {t('euLawEurovocHeading')}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  {eurovocStrings.map((tag) => (
                    <Badge key={tag} text={tag} variant="muted" />
                  ))}
                </div>
              </div>
            ) : null}

            {item.eurlex_url ? (
              <p style={{ marginBottom: 0 }}>
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
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </DataCard>
  )
}
