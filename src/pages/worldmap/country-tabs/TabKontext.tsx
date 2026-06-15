import SectionDivider from '../../../design-system/components/SectionDivider'
import { useTheme } from '../../../design-system'
import { fonts, spacing } from '../../../design-system/tokens'
import type { WorldCountryDetail } from '../worldTypes'
import type { ConsoleTabLayoutDirection, WorldConsoleArticle } from '../CountrySidebar'

export function TabKontext({
  articles,
  layoutDirection,
}: {
  countryDetail: WorldCountryDetail | null
  articles?: WorldConsoleArticle[]
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t } = useTheme()

  const dataSources = [
    { source: t('worldConsoleSourceWdi'), desc: t('worldConsoleSourceWdiDesc') },
    { source: t('worldConsoleSourceVdem'), desc: t('worldConsoleSourceVdemDesc') },
    { source: t('worldConsoleSourceComtrade'), desc: t('worldConsoleSourceComtradeDesc') },
  ]

  const sourcesAndMethods = (
    <>
      <SectionDivider label={t('worldConsoleSourcesHeading')} />
      {dataSources.map((u, i) => (
        <div key={i} style={{ padding: `${spacing.sm}px 0`, borderBottom: `1px solid ${c.border}` }}>
          <div style={{ fontFamily: fonts.body, fontSize: 13, color: c.ink, fontWeight: 500 }}>{u.source}</div>
          <div style={{ fontFamily: fonts.body, fontSize: 11, color: c.muted, marginTop: 2 }}>{u.desc}</div>
        </div>
      ))}
      <SectionDivider label={t('worldConsoleMethodsHeading')} />
      <p style={{ fontFamily: fonts.body, fontSize: 12, color: c.muted, lineHeight: 1.6 }}>
        {t('worldConsoleMethodsBody')}
      </p>
    </>
  )

  const visitLink = (
    <a
      href="https://respublica.media"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: fonts.mono,
        fontSize: 11,
        color: c.red,
        marginTop: spacing.md,
        cursor: 'pointer',
        textDecoration: 'none',
      }}
    >
      {t('worldConsoleVisitRp')} <span>→</span>
    </a>
  )

  const articlesBlock =
    articles && articles.length > 0 ? (
      <>
        <SectionDivider label={t('worldConsoleArticlesHeading')} />
        {articles.map((a, i) => (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: `${spacing.md}px 0`,
              borderBottom: `1px solid ${c.border}`,
              textDecoration: 'none',
            }}
          >
            {a.tag && (
              <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xs }}>
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#fff',
                    background: c.badgeBg,
                    borderRadius: 3,
                    padding: '2px 6px',
                  }}
                >
                  {a.tag}
                </span>
              </div>
            )}
            <div
              style={{
                fontFamily: fonts.body,
                fontWeight: 600,
                fontSize: 13,
                color: c.ink,
                lineHeight: 1.45,
              }}
            >
              {a.title}
            </div>
            {a.date && (
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  color: c.muted,
                  marginTop: spacing.xs,
                }}
              >
                {a.date}
              </div>
            )}
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                color: c.red,
                marginTop: spacing.xs,
              }}
            >
              {t('worldConsoleReadArticle')}
            </div>
          </a>
        ))}
      </>
    ) : null

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {sourcesAndMethods}
        </div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {articlesBlock}
          {visitLink}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {articlesBlock}
      {sourcesAndMethods}
      {visitLink}
    </div>
  )
}
