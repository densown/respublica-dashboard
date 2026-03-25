import { useTheme, PageHeader } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useParams } from 'react-router-dom'

export default function Bundestag() {
  const { t, c } = useTheme()
  const { pollId } = useParams()

  return (
    <>
      <PageHeader title="Bundestag" subtitle={t('bundestag')} />
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: '0.95rem',
          color: c.muted,
          marginTop: spacing.md,
          lineHeight: 1.6,
        }}
      >
        Abstimmungen und Parlamentsvisualisierung. Kommt in Phase 4.
      </p>
      {pollId && (
        <p
          style={{
            fontFamily: fonts.mono,
            fontSize: '0.85rem',
            color: c.inkSoft,
            marginTop: spacing.lg,
          }}
        >
          Abstimmung {pollId}
        </p>
      )}
    </>
  )
}
