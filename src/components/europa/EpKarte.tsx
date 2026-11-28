import { Link } from 'react-router-dom'
import { Stempel, useTheme, VoteBar } from '../../design-system'
import { fonts, fontSize, lineHeight, measure, spacing } from '../../design-system/tokens'
import { artWort } from './epArt'
import { StimmMarke } from '../bundestag/StimmMarke'
import { datumKurz, fuelle, STIMME } from './format'
import type { EpAbstimmung, Position } from './typen'


/**
 * Eine Abstimmung des EU-Parlaments als Karte: Datum und Art, Titel,
 * Gesamtergebnis als Balken, darunter die deutschen Stimmen in einem Satz.
 * Gleiche Bauart wie die Karten des Bundestags, damit beide Parlamente
 * gleich gelesen werden.
 *
 * `position` zeigt zusaetzlich, wie eine bestimmte Person gestimmt hat
 * (Profilseite).
 */
export function EpKarte({ a, position }: { a: EpAbstimmung; position?: Position }) {
  const { c, t, lang } = useTheme()
  const meta = { fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted } as const
  const s = a.stimmen
  const kurz = fuelle(t('epStimmenKurz'), { ja: s.ja, nein: s.nein, enth: s.enthaltung })

  return (
    <article
      style={{
        borderTop: `1px solid ${c.border}`,
        padding: `${spacing.lg}px 0`,
        display: 'grid',
        gap: spacing.md,
        maxWidth: measure.liste,
      }}
    >
      <div style={{ ...meta, display: 'flex', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }}>
        <span>{datumKurz(a.datum, lang)}</span>
        <span aria-hidden>·</span>
        <span>{t(artWort(a.art))}</span>
        {a.ergebnis && (
          <Stempel
            wort={t(a.ergebnis === 'angenommen' ? 'accepted' : 'rejected')}
            art={a.ergebnis === 'angenommen' ? 'ja' : 'nein'}
            groesse={10}
            ruhig
            style={{ marginLeft: 'auto' }}
          />
        )}
      </div>

      <h3 style={{ margin: 0, fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.lg, lineHeight: lineHeight.tight }}>
        <Link
          to={`/europa/parlament/${a.id}`}
          style={{ color: c.ink, textDecoration: 'none', display: 'block', minHeight: 44 }}
        >
          {a.titel}
        </Link>
      </h3>

      <VoteBar
        ja={s.ja}
        nein={s.nein}
        enthalten={s.enthaltung}
        abwesend={s.nicht}
        height={24}
        ariaLabel={kurz}
        animiert={false}
      />

      <div style={{ ...meta, display: 'flex', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' }}>
        <span>
          {fuelle(t('epDeutscheKurz'), {
            ja: a.deutschland.ja,
            nein: a.deutschland.nein,
            enth: a.deutschland.enthaltung,
          })}
        </span>
        {position && <StimmMarke stimme={STIMME[position]} />}
      </div>
    </article>
  )
}
