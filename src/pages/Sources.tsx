import { PageHeader, useTheme } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { interpolate } from '../design-system/i18n'
import { useApi } from '../hooks/useApi'

type WahlenStats = {
  total_records: number
  years_range: { min: number; max: number } | null
}

function sectionTitle(c: { inkSoft: string }, text: string) {
  return (
    <h2
      style={{
        fontFamily: fonts.mono,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: c.inkSoft,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
      }}
    >
      {text}
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

  return (
    <div style={{ paddingBottom: spacing.xl }}>
      <PageHeader title={t('sourcesPageTitle')} subtitle={t('sourcesIntro')} />

      {sectionTitle(c, t('sourcesSecElections'))}
      <p style={bodyStyle(c)}>{t('sourcesGerda1')}</p>
      <p style={bodyStyle(c)}>{t('sourcesGerda2')}</p>
      <p style={bodyStyle(c)}>{t('sourcesGerda3')}</p>

      {sectionTitle(c, t('sourcesSecParliament'))}
      <p style={bodyStyle(c)}>{t('sourcesParliament1')}</p>
      <p style={bodyStyle(c)}>{t('sourcesParliament2')}</p>

      {sectionTitle(c, t('sourcesSecLegislation'))}
      <p style={bodyStyle(c)}>{t('sourcesLegislation1')}</p>

      {sectionTitle(c, t('sourcesSecEuLaw'))}
      <p style={bodyStyle(c)}>{t('sourcesEuLaw1')}</p>

      {sectionTitle(c, t('sourcesSecEuCourts'))}
      <p style={bodyStyle(c)}>{t('sourcesEuCourts1')}</p>

      {sectionTitle(c, t('sourcesSecGeo'))}
      <p style={bodyStyle(c)}>{t('sourcesGeo1')}</p>

      {sectionTitle(c, t('sourcesSecAi'))}
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
