import { Link } from 'react-router-dom'
import { useTheme } from '../../design-system'
import { fonts, fontSize, lineHeight, radius, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import { fuelle, zahl } from './format'
import type { Quelle, QuellenStand } from './typen'

/** Zeitpunkt des letzten erfolgreichen Abrufs, in Ortszeit der Leserin. */
function standText(iso: string, lang: 'de' | 'en', vorlage: string): string {
  const d = new Date(iso)
  const ort = lang === 'de' ? 'de-DE' : 'en-GB'
  return fuelle(vorlage, {
    datum: d.toLocaleDateString(ort, { day: 'numeric', month: 'numeric', year: 'numeric' }),
    zeit: d.toLocaleTimeString(ort, { hour: '2-digit', minute: '2-digit' }),
  })
}

/**
 * Stand als kleiner Stempel: "Stand 28.11.2026, 15:17 Uhr". Gehoert in die
 * Metazeile oder neben eine Abschnittsueberschrift.
 */
export function StandStempel({ stand }: { stand: string | null | undefined }) {
  const { c, t, lang } = useTheme()
  if (!stand) return null
  return (
    <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, whiteSpace: 'nowrap' }}>
      {t('quelleStand')} <time dateTime={stand}>{standText(stand, lang, t('quelleStandUm'))}</time>
    </span>
  )
}

export type QuellenZeileProps = {
  quelle: Quelle | null | undefined
  stand: string | null | undefined
  /** Adresse des gezeigten Gegenstands beim Anbieter, wenn es eine gibt. */
  original?: string | null
}

/**
 * Quelle, Lizenz und Stand unter einer Ansicht. Jede Ansicht mit Fremddaten
 * endet mit dieser Zeile (docs/DESIGN.md: Quelle an der Ansicht). Ist der
 * letzte Abruf ueberfaellig, steht das als Hinweis darueber: lieber eine alte
 * Zahl mit Warnung als eine alte Zahl, die frisch aussieht.
 */
export function QuellenZeile({ quelle, stand, original }: QuellenZeileProps) {
  const { c, t, lang } = useTheme()
  const { data: zustand } = useApi<QuellenStand>(quelle ? `/api/quellen/${quelle.slug}` : '')
  if (!quelle) return null

  const link = { color: c.ink, textUnderlineOffset: 3 } as const
  const veraltet = zustand?.zustand === 'veraltet' && zustand.alter_stunden != null

  return (
    <div style={{ display: 'grid', gap: spacing.sm, maxWidth: '68ch' }}>
      {veraltet && (
        <p
          role="status"
          style={{
            margin: 0,
            padding: `${spacing.sm}px ${spacing.md}px`,
            background: c.noticeBg,
            color: c.noticeFg,
            border: `1px solid ${c.noticeBorder}`,
            borderRadius: radius.sm,
            fontFamily: fonts.body,
            fontSize: fontSize.sm,
            lineHeight: lineHeight.normal,
          }}
        >
          {fuelle(t('quelleVeraltet'), { h: zahl(Math.round(zustand.alter_stunden ?? 0), lang) })}
        </p>
      )}
      <p
        style={{
          margin: 0,
          fontFamily: fonts.mono,
          fontSize: fontSize.xs,
          lineHeight: lineHeight.relaxed,
          color: c.muted,
        }}
      >
        {t('quelleWort')}:{' '}
        <a href={original || quelle.url} target="_blank" rel="noopener noreferrer" style={link}>
          {quelle.name}
        </a>
        {quelle.daten ? ` · ${t('quelleDaten')}: ${quelle.daten}` : ''}
        {quelle.lizenz && (
          <>
            {' · '}
            {t('quelleLizenz')}:{' '}
            {quelle.lizenz_url ? (
              <a href={quelle.lizenz_url} target="_blank" rel="noopener noreferrer" style={link}>
                {quelle.lizenz}
              </a>
            ) : (
              quelle.lizenz
            )}
          </>
        )}
        {stand && (
          <>
            {' · '}
            {t('quelleStand')} <time dateTime={stand}>{standText(stand, lang, t('quelleStandUm'))}</time>
          </>
        )}
        {' · '}
        <Link to="/quellen" style={link}>
          {t('quelleAlleQuellen')}
        </Link>
      </p>
    </div>
  )
}
