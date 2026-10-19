import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip, EmptyState, useTheme, VoteBar } from '../../design-system'
import { fontSize, fonts, lineHeight, measure, radius, spacing } from '../../design-system/tokens'
import { StimmMarke } from './StimmMarke'
import {
  anzeigeTitel,
  aufzaehlen,
  datumLang,
  ergebnisWort,
  kurztextFuer,
  lagerDerFraktionen,
  stimmenKurz,
} from './abstimmungText'
import type { AbstimmungsDetailData, AbstimmungsListenEintrag } from './fraktion'
import { fuerSuche } from './stimmen'

/**
 * Alle namentlichen Abstimmungen als Karten, nach Sitzungstag gruppiert.
 * Jede Karte sagt, was die Abstimmungskarte fuer Instagram sagt, nur knapper:
 * Titel, worum es geht, Ergebnis, wer dafuer und wer dagegen war. Ein Tipp
 * oeffnet die Seite der Abstimmung.
 *
 * Ohne Ergebnis in der Liste (API vor Migration 020) bleibt es bei Titel
 * und Datum.
 */

const SEITE = 20

const LAGER = [
  { stimme: 'yes', wort: 'bundestagCampYes' },
  { stimme: 'no', wort: 'bundestagCampNo' },
  { stimme: 'abstain', wort: 'bundestagCampAbstain' },
] as const

function mitErgebnis(a: AbstimmungsListenEintrag): AbstimmungsDetailData | null {
  if (!a.ergebnis || !a.fraktionen) return null
  return { ...a, ergebnis: a.ergebnis, fraktionen: a.fraktionen }
}

function AbstimmungsKachel({ eintrag }: { eintrag: AbstimmungsListenEintrag }) {
  const { c, t, lang } = useTheme()
  const d = mitErgebnis(eintrag)
  const kurztext = kurztextFuer(eintrag, lang)
  const { lager, gespalten } = d ? lagerDerFraktionen(d.fraktionen) : { lager: null, gespalten: [] }
  const zahl = (n: number) => n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')

  return (
    <Link
      to={`/bundestag/${eintrag.poll_id}`}
      className="rp-chip"
      style={{
        display: 'block',
        padding: spacing.lg,
        background: c.cardBg,
        border: `1px solid ${c.cardBorder}`,
        color: c.ink,
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          display: 'block',
          fontFamily: fonts.body,
          fontWeight: 600,
          fontSize: fontSize.lg,
          lineHeight: lineHeight.tight,
          maxWidth: '60ch',
        }}
      >
        {anzeigeTitel(eintrag.poll_titel)}
      </span>

      {kurztext && (
        <span style={{ display: 'block', marginTop: spacing.sm, maxWidth: '68ch' }}>
          <span
            style={{
              display: 'block',
              fontFamily: fonts.body,
              fontSize: fontSize.md,
              lineHeight: lineHeight.normal,
              color: c.inkSoft,
            }}
          >
            {kurztext}
          </span>
          <span
            style={{
              display: 'block',
              marginTop: spacing.xs,
              fontFamily: fonts.mono,
              fontSize: fontSize.micro,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: c.muted,
            }}
          >
            {t('bundestagAuto')}
          </span>
        </span>
      )}

      {d && lager && (
        <span style={{ display: 'block', marginTop: spacing.md }}>
          <span
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              columnGap: spacing.sm,
              marginBottom: spacing.xs,
            }}
          >
            <span style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.md }}>
              {ergebnisWort(d, t)}
            </span>
            <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
              {t('bundestagCardResult')
                .replace('{ja}', zahl(d.ergebnis.ja_gesamt))
                .replace('{nein}', zahl(d.ergebnis.nein_gesamt))}
            </span>
          </span>
          <VoteBar
            ja={d.ergebnis.ja_gesamt}
            nein={d.ergebnis.nein_gesamt}
            enthalten={d.ergebnis.enthalten_gesamt}
            abwesend={d.ergebnis.abwesend_gesamt}
            height={10}
            beschriftung="keine"
            animiert={false}
            ariaLabel={stimmenKurz(
              {
                ja: d.ergebnis.ja_gesamt,
                nein: d.ergebnis.nein_gesamt,
                enthalten: d.ergebnis.enthalten_gesamt,
                abwesend: d.ergebnis.abwesend_gesamt,
              },
              t,
            )}
          />
          <span style={{ display: 'grid', gap: spacing.xs, marginTop: spacing.sm }}>
            {LAGER.filter((l) => lager[l.stimme].length > 0).map((l) => (
              <span
                key={l.stimme}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: spacing.sm,
                  fontFamily: fonts.body,
                  fontSize: fontSize.sm,
                  lineHeight: lineHeight.normal,
                  color: c.inkSoft,
                }}
              >
                <span style={{ alignSelf: 'center', display: 'inline-flex' }}>
                  <StimmMarke stimme={l.stimme} ohneWort />
                </span>
                <span>
                  {t(l.wort)}: {aufzaehlen(lager[l.stimme], t)}
                </span>
              </span>
            ))}
            {gespalten.length > 0 && (
              <span
                style={{
                  fontFamily: fonts.body,
                  fontStyle: 'italic',
                  fontWeight: 600,
                  fontSize: fontSize.sm,
                  color: c.red,
                }}
              >
                {t('votePageDekSplitMany').replace('{liste}', aufzaehlen(gespalten, t))}
              </span>
            )}
          </span>
        </span>
      )}
    </Link>
  )
}

export interface AbstimmungsListeProps {
  abstimmungen: AbstimmungsListenEintrag[]
}

export function AbstimmungsListe({ abstimmungen }: AbstimmungsListeProps) {
  const { c, t, lang } = useTheme()
  const [suche, setSuche] = useState('')
  const [sichtbar, setSichtbar] = useState(SEITE)

  const gefiltert = useMemo(() => {
    const q = fuerSuche(suche.trim())
    if (!q) return abstimmungen
    return abstimmungen.filter((a) =>
      fuerSuche(`${a.poll_titel} ${kurztextFuer(a, lang) ?? ''}`).includes(q),
    )
  }, [abstimmungen, suche, lang])

  // Nach Sitzungstag, in der Reihenfolge der API (neueste zuerst)
  const tage = useMemo(() => {
    const gruppen: { datum: string; eintraege: AbstimmungsListenEintrag[] }[] = []
    for (const a of gefiltert.slice(0, sichtbar)) {
      const letzte = gruppen[gruppen.length - 1]
      if (letzte && letzte.datum === a.poll_datum) letzte.eintraege.push(a)
      else gruppen.push({ datum: a.poll_datum, eintraege: [a] })
    }
    return gruppen
  }, [gefiltert, sichtbar])

  if (abstimmungen.length === 0) return <EmptyState text={t('bundestagVotesEmpty')} />

  // Wie viele an einem Tag insgesamt, auch wenn nur ein Teil schon sichtbar ist
  const jeTag = new Map<string, number>()
  for (const a of gefiltert) jeTag.set(a.poll_datum, (jeTag.get(a.poll_datum) ?? 0) + 1)

  const mitKurztext = abstimmungen.some((a) => kurztextFuer(a, lang))

  return (
    <div style={{ maxWidth: measure.liste }}>
      {mitKurztext && (
        <p
          style={{
            margin: `0 0 ${spacing.md}px`,
            fontFamily: fonts.body,
            fontSize: fontSize.sm,
            lineHeight: lineHeight.normal,
            color: c.muted,
            maxWidth: '68ch',
          }}
        >
          {t('bundestagAutoHint')}
        </p>
      )}
      <input
        type="search"
        value={suche}
        onChange={(e) => {
          setSuche(e.target.value)
          setSichtbar(SEITE)
        }}
        placeholder={t('bundestagVotesSearch')}
        aria-label={t('bundestagVotesSearch')}
        autoComplete="off"
        style={{
          width: '100%',
          minHeight: 44,
          boxSizing: 'border-box',
          padding: `0 ${spacing.md}px`,
          border: `1px solid ${c.inputBorder}`,
          borderRadius: radius.md,
          background: c.inputBg,
          color: c.ink,
          fontFamily: fonts.body,
          fontSize: fontSize.base,
          marginBottom: spacing.md,
        }}
      />

      <div
        aria-live="polite"
        style={{
          fontFamily: fonts.mono,
          fontSize: fontSize.xs,
          color: c.muted,
          paddingBottom: spacing.sm,
          marginBottom: spacing.lg,
          borderBottom: `1px solid ${c.ink}`,
        }}
      >
        {suche.trim()
          ? t('bundestagVotesMatches')
              .replace('{n}', String(gefiltert.length))
              .replace('{gesamt}', String(abstimmungen.length))
          : t('bundestagVotesCount').replace('{n}', String(abstimmungen.length))}
      </div>

      {gefiltert.length === 0 ? (
        <EmptyState text={t('bundestagVotesNone')} />
      ) : (
        tage.map((tag) => {
          const n = jeTag.get(tag.datum) ?? tag.eintraege.length
          return (
            <section key={tag.datum} style={{ marginBottom: spacing.xl }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  columnGap: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontFamily: fonts.body,
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: fontSize.base,
                    color: c.inkSoft,
                  }}
                >
                  {datumLang(tag.datum, lang, true)}
                </h3>
                <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
                  {n === 1 ? t('bundestagDayOne') : t('bundestagDayMany').replace('{n}', String(n))}
                </span>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: spacing.md }}>
                {tag.eintraege.map((a) => (
                  <li key={a.poll_id}>
                    <AbstimmungsKachel eintrag={a} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}

      {gefiltert.length > sichtbar && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Chip label={t('bundestagVotesMore')} onClick={() => setSichtbar(sichtbar + SEITE)} />
        </div>
      )}
    </div>
  )
}
