import { PageHeader, useTheme } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useParams } from 'react-router-dom'

export default function Legislation() {
  const { c } = useTheme()
  const { id } = useParams()

  return (
    <>
      <PageHeader title="Gesetzgebung." />
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: '0.95rem',
          color: c.muted,
          marginTop: spacing.md,
          lineHeight: 1.6,
        }}
      >
        {id ? `Gesetz ${id}` : 'Gesetzgebung und Verfahren. Kommt in einer späteren Phase.'}
      </p>
    </>
  )
}
