import { Link } from 'react-router-dom'
import { PageHeader, useTheme } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { interpolate } from '../design-system/i18n'
import { useApi } from '../hooks/useApi'
import { SOURCES_BY_PAGE } from '../data/sourcesCatalog'
import type { I18nKey } from '../design-system/i18n'

type WahlenStats = {
  total_records: number
  years_range: { min: number; max: number } | null
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

export default function Sources() {
  const { c, t } = useTheme()
  const stats = useApi<WahlenStats>('/api/wahlen/stats')

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

  return (
    <div style={{ paddingBottom: spacing.xl }}>
      <PageHeader title={t('sourcesPageTitle')} subtitle={t('sourcesIntro')} />

      {SOURCES_BY_PAGE.map((block) => {
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
      })}

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
