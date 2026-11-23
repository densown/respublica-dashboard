import { PageHeader, useTheme } from '../design-system'
import { fontSize, fonts, spacing } from '../design-system/tokens'
import { useSeo } from '../hooks/useSeo'

export default function EuParliament() {
  const { t, c } = useTheme()
  // Platzhalter ohne Inhalt: nicht in den Suchindex.
  useSeo({ titel: 'EU-Parlament', nichtIndexieren: true })

  return (
    <>
      <PageHeader title="EU-Parlament." subtitle={t('euParliament')} />
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
