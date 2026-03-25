import { PageHeader, useTheme } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'

export default function EuParliament() {
  const { t, c } = useTheme()

  return (
    <>
      <PageHeader title="EU-Parlament." subtitle={t('euParliament')} />
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: '0.95rem',
          color: c.muted,
          marginTop: spacing.md,
          lineHeight: 1.6,
        }}
      >
        {t('phasePlaceholder')}
      </p>
    </>
  )
}
