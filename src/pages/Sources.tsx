import { useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, useTheme } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { interpolate } from '../design-system/i18n'
import { useApi } from '../hooks/useApi'
import { SOURCES_BY_PAGE, type SourceCatalogPage } from '../data/sourcesCatalog'
import type { I18nKey } from '../design-system/i18n'

type WahlenStats = {
  total_records: number
  years_range: { min: number; max: number } | null
}

type WorldMapApiSource = {
  slug: string
  name: string
  provider: string | null
  url: string | null
  license: string | null
  update_freq: string | null
  last_fetched: string | null
  domain: string
  indicator_count: number
  value_count: number
}

type WorldSourcesResponse = {
  sources: WorldMapApiSource[]
}

function sectionHeading(
  c: { ink: string; red: string },
  pageTitleKey: I18nKey,
  href: string,
  headingId: string,
  t: (k: I18nKey) => string,
) {
  return (
    <h2
      id={headingId}
      style={{
        fontFamily: fonts.display,
        fontSize: '1.15rem',
        fontWeight: 600,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
        lineHeight: 1.35,
      }}
    >
      <Link
        to={href}
        style={{
          color: c.ink,
          textDecoration: 'none',
          borderBottom: `1px solid transparent`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = c.red
          e.currentTarget.style.borderBottomColor = c.red
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = c.ink
          e.currentTarget.style.borderBottomColor = 'transparent'
        }}
      >
        {t(pageTitleKey)}
      </Link>
    </h2>
  )
}

function bodyStyle(c: { ink: string; inkSoft: string }) {
  return {
    fontFamily: fonts.body,
    fontSize: '0.9rem',
    lineHeight: 1.6,
    color: c.ink,
    marginBottom: spacing.md,
  } as const
}

function aiSectionTitle(c: { inkSoft: string }, text: string) {
  return (
    <h2
      style={{
        fontFamily: fonts.mono,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: c.inkSoft,
        marginTop: spacing.xxxl,
        marginBottom: spacing.sm,
      }}
    >
      {text}
    </h2>
  )
}

function formatRelativePast(iso: string, locale: string): string | null {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return null
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const diffSec = (then.getTime() - Date.now()) / 1000
  if (Math.abs(diffSec) < 60) return rtf.format(Math.round(diffSec), 'second')
  const diffMin = diffSec / 60
  if (Math.abs(diffMin) < 60) return rtf.format(Math.round(diffMin), 'minute')
  const diffHr = diffMin / 60
  if (Math.abs(diffHr) < 24) return rtf.format(Math.round(diffHr), 'hour')
  const diffDay = diffHr / 24
  if (Math.abs(diffDay) < 7) return rtf.format(Math.round(diffDay), 'day')
  const diffWk = diffDay / 7
  if (Math.abs(diffWk) < 5) return rtf.format(Math.round(diffWk), 'week')
  const diffMo = diffDay / 30
  if (Math.abs(diffMo) < 12) return rtf.format(Math.round(diffMo), 'month')
  const diffYr = diffDay / 365
  return rtf.format(Math.round(diffYr), 'year')
}

function renderStaticSourcesBlock(
  block: SourceCatalogPage,
  c: { ink: string; inkSoft: string; red: string; border: string; badgeBg: string; badgeText: string },
  t: (k: I18nKey) => string,
  badgeStyle: CSSProperties,
) {
  const headingId = `sources-section-${block.href.replace(/\//g, '')}`
  return (
    <section key={block.href} aria-labelledby={headingId}>
      {sectionHeading(c, block.pageTitleKey, block.href, headingId, t)}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {block.sources.map((src) => (
          <li
            key={`${block.href}-${src.nameKey}`}
            style={{
              marginBottom: spacing.lg,
              paddingBottom: spacing.md,
              borderBottom: `1px solid ${c.border}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: spacing.sm,
                marginBottom: spacing.sm,
              }}
            >
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: fonts.body,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: c.red,
                  textDecoration: 'none',
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none'
                }}
              >
                {t(src.nameKey)}
              </a>
              <span style={badgeStyle}>{t(src.licenseKey)}</span>
            </div>
            <p style={{ ...bodyStyle(c), marginBottom: 0 }}>{t(src.descKey)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Sources() {
  const { c, t, lang } = useTheme()
  const stats = useApi<WahlenStats>('/api/wahlen/stats')
  const worldSrc = useApi<WorldSourcesResponse>('/api/world/sources')

  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const intlLocale = lang === 'de' ? 'de' : 'en'

  const worldRows = useMemo(() => {
    const list = worldSrc.data?.sources ?? []
    return list
      .filter((s) => s.domain === 'worldmap' && s.value_count > 0)
      .sort((a, b) => b.value_count - a.value_count)
  }, [worldSrc.data?.sources])

  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale])

  const updatedLine =
    stats.error != null
      ? t('sourcesLastUpdatedUnknown')
      : stats.data?.years_range != null
        ? interpolate(t('sourcesLastUpdated'), {
            range: `${stats.data.years_range.min}–${stats.data.years_range.max}`,
          })
        : t('sourcesLastUpdatedUnknown')

  const badgeStyle = {
    fontFamily: fonts.mono,
    fontSize: '0.62rem',
    fontWeight: 500,
    letterSpacing: '0.02em',
    background: c.badgeBg,
    color: c.badgeText,
    padding: '4px 10px',
    borderRadius: 6,
    whiteSpace: 'nowrap' as const,
  }

  const euIdx = SOURCES_BY_PAGE.findIndex((b) => b.href === '/eu-recht')
  const headBlocks =
    euIdx >= 0 ? SOURCES_BY_PAGE.slice(0, euIdx) : SOURCES_BY_PAGE
  const tailBlocks = euIdx >= 0 ? SOURCES_BY_PAGE.slice(euIdx) : []

  const worldHeadingId = 'sources-section-weltkarte'

  return (
    <div style={{ paddingBottom: spacing.xl }}>
      <PageHeader title={t('sourcesPageTitle')} subtitle={t('sourcesIntro')} />

      {headBlocks.map((block) => renderStaticSourcesBlock(block, c, t, badgeStyle))}

      <section key="weltkarte-dynamic" aria-labelledby={worldHeadingId}>
        {sectionHeading(c, 'worldMap', '/weltkarte', worldHeadingId, t)}
        {worldSrc.loading ? (
          <p style={{ ...bodyStyle(c), marginBottom: 0 }}>{t('sourcesWorldmapLoading')}</p>
        ) : worldSrc.error != null ? (
          <p style={{ ...bodyStyle(c), marginBottom: 0 }}>{t('sourcesWorldmapError')}</p>
        ) : worldRows.length === 0 ? (
          <p style={{ ...bodyStyle(c), marginBottom: 0 }}>{t('sourcesWorldmapEmpty')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {worldRows.map((src) => {
              const nameEl =
                src.url && src.url.trim() ? (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: fonts.body,
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: c.red,
                      textDecoration: 'none',
                      minHeight: 44,
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none'
                    }}
                  >
                    {src.name}
                  </a>
                ) : (
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: c.ink,
                      minHeight: 44,
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    {src.name}
                  </span>
                )
              const whenRaw = src.last_fetched
                ? formatRelativePast(src.last_fetched, intlLocale)
                : null
              const whenLine = interpolate(t('sourcesWorldmapFetchedLine'), {
                when: whenRaw ?? t('sourcesWorldmapLastFetchedUnknown'),
              })
              return (
                <li
                  key={src.slug}
                  style={{
                    marginBottom: spacing.lg,
                    paddingBottom: spacing.md,
                    borderBottom: `1px solid ${c.border}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: spacing.sm,
                      marginBottom: spacing.sm,
                    }}
                  >
                    {nameEl}
                    <span style={badgeStyle}>
                      {src.license?.trim()
                        ? src.license.trim()
                        : t('sourcesWorldmapLicenseMissing')}
                    </span>
                  </div>
                  <p style={{ ...bodyStyle(c), marginBottom: spacing.xs }}>
                    {interpolate(t('sourcesWorldmapDesc'), {
                      values: nf.format(src.value_count),
                      indicators: nf.format(src.indicator_count),
                    })}
                  </p>
                  <p
                    style={{
                      ...bodyStyle(c),
                      marginBottom: 0,
                      fontFamily: fonts.mono,
                      fontSize: '0.75rem',
                      color: c.inkSoft,
                    }}
                  >
                    {whenLine}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {tailBlocks.map((block) => renderStaticSourcesBlock(block, c, t, badgeStyle))}

      {aiSectionTitle(c, t('sourcesSecAi'))}
      <p style={bodyStyle(c)}>{t('sourcesAi1')}</p>

      <p
        style={{
          ...bodyStyle(c),
          marginTop: spacing.xl,
          fontFamily: fonts.mono,
          fontSize: '0.75rem',
          color: c.inkSoft,
        }}
      >
        {stats.loading ? `${t('sourcesLastUpdatedUnknown')}…` : updatedLine}
      </p>
    </div>
  )
}
