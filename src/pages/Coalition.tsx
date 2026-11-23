import { PageHeader, useTheme } from '../design-system'
import { fontSize, fonts, spacing } from '../design-system/tokens'
import { useSeo } from '../hooks/useSeo'

export default function Coalition() {
  const { t, c } = useTheme()
  // Platzhalter ohne Inhalt: nicht in den Suchindex.
  useSeo({ titel: 'Koalitionsvertrag', nichtIndexieren: true })

  return (
    <>
      <PageHeader title="Koalitionsvertrag." subtitle={t('coalition')} />
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: fontSize.base,
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
