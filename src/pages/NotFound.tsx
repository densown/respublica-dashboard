import { Link } from 'react-router-dom'
import { PageHeader, useTheme } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'

export default function NotFound() {
  const { t, c } = useTheme()

  return (
    <>
      <PageHeader title="404" subtitle={t('notFoundSubtitle')} />
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: '0.95rem',
          color: c.muted,
          marginTop: spacing.md,
          marginBottom: spacing.lg,
          lineHeight: 1.6,
        }}
      >
        {t('notFoundBody')}
      </p>
      <Link
        to="/"
        style={{
          fontFamily: fonts.mono,
          fontSize: '0.8rem',
          color: c.red,
          textDecoration: 'none',
        }}
      >
        {t('backToOverview')}
      </Link>
    </>
  )
}
