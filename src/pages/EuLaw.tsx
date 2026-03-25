import { PageHeader, useTheme } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useParams } from 'react-router-dom'

export default function EuLaw() {
  const { c } = useTheme()
  const { id } = useParams()

  return (
    <>
      <PageHeader title="EU-Recht." />
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: '0.95rem',
          color: c.muted,
          marginTop: spacing.md,
          lineHeight: 1.6,
        }}
      >
        {id
          ? `EU-Rechtsakt ${id}`
          : 'EU-Recht und EUR-Lex. Kommt in einer späteren Phase.'}
      </p>
    </>
  )
}
