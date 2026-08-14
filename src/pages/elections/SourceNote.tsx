import { useTheme } from '../../design-system'
import { fontSize, fonts, spacing } from '../../design-system/tokens'
import type { Quelle } from './pollTypes'

type SourceNoteProps = { quelle: Quelle | undefined }

/**
 * Pflicht-Quellenhinweis. dawum.de steht unter ODC-ODbL — die Namensnennung
 * von Quelle und Autor ist Lizenzbedingung und muss sichtbar an den Daten
 * stehen, nicht im Impressum. Die Angaben kommen aus der API-Antwort, damit
 * sie nicht an zwei Stellen gepflegt werden muessen.
 */
export function SourceNote({ quelle }: SourceNoteProps) {
  const { c, t } = useTheme()
  if (!quelle) return null

  return (
    <p
      style={{
        fontFamily: fonts.mono,
        fontSize: fontSize.xs,
        lineHeight: 1.6,
        color: c.muted,
        margin: 0,
        marginTop: spacing.lg,
      }}
    >
      {t('electionPollsSource')}:{' '}
      <a
        href={quelle.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: c.inkSoft }}
      >
        {quelle.name}
      </a>
      {' · '}
      {quelle.autor}
      {' · '}
      <a
        href={quelle.lizenz_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: c.inkSoft }}
      >
        {quelle.lizenz}
      </a>
    </p>
  )
}
