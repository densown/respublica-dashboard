import { PageHeader, useTheme } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'

export default function Admin() {
  const { t, c } = useTheme()

  return (
    <>
      <PageHeader title="Admin." subtitle={t('admin')} />
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: '0.95rem',
          color: c.muted,
          marginTop: spacing.md,
          lineHeight: 1.6,
        }}
      >
        {t('adminPhase')}
      </p>
    </>
  )
}
