import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip, EmptyState, Stempel, useTheme, VoteBar } from '../../design-system'
import { useEigeneStimmen } from '../../hooks/useMeins'
import { fontSize, fonts, lineHeight, measure, radius, spacing } from '../../design-system/tokens'
import { StimmMarke } from './StimmMarke'
import {
  anzeigeTitel,
  aufzaehlen,
  datumLang,
  ergebnisWort,
  istAngenommen,
  istGespalten,
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

/** Bis zu diesem Abstand zwischen Ja und Nein gilt eine Abstimmung als knapp. */
const KNAPP = 60

type Auswahl = 'alle' | 'angenommen' | 'abgelehnt' | 'knapp' | 'gespalten'
const AUSWAHL: { wert: Auswahl; wort: 'bundestagFilterAll' | 'accepted' | 'rejected' | 'bundestagFilterClose' | 'bundestagFilterSplit' }[] = [
  { wert: 'alle', wort: 'bundestagFilterAll' },
  { wert: 'angenommen', wort: 'accepted' },
  { wert: 'abgelehnt', wort: 'rejected' },
  { wert: 'knapp', wort: 'bundestagFilterClose' },
  { wert: 'gespalten', wort: 'bundestagFilterSplit' },
]

const LAGER = [
  { stimme: 'yes', wort: 'bundestagCampYes' },
  { stimme: 'no', wort: 'bundestagCampNo' },
  { stimme: 'abstain', wort: 'bundestagCampAbstain' },
] as const

function mitErgebnis(a: AbstimmungsListenEintrag): AbstimmungsDetailData | null {
  if (!a.ergebnis || !a.fraktionen) return null
  return { ...a, ergebnis: a.ergebnis, fraktionen: a.fraktionen }
}

function AbstimmungsKachel({ eintrag, eigene }: { eintrag: AbstimmungsListenEintrag; eigene?: 'yes' | 'no' | 'abstain' }) {
  const { c, t, lang } = useTheme()
  const d = mitErgebnis(eintrag)
  const kurztext = kurztextFuer(eintrag, lang)
  const { lager, gespalten } = d ? lagerDerFraktionen(d.fraktionen) : { lager: null, gespalten: [] }
  const zahl = (n: number) => n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')

  return (
    <Link
      to={`/bundestag/${eintrag.poll_id}`}
      className="rp-karte"
      style={{
        display: 'block',
        padding: spacing.lg,
        background: c.cardBg,
        border: `1px solid ${c.cardBorder}`,
        borderRadius: radius.sm,
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
              fontFamily: fonts.body,
              fontStyle: 'italic',
              fontSize: fontSize.xs,
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
              alignItems: 'center',
              gap: `${spacing.xs}px ${spacing.md}px`,
              marginBottom: spacing.sm,
            }}
          >
            <Stempel ruhig wort={ergebnisWort(d, t)} art={istAngenommen(d) ? 'ja' : 'nein'} groesse={10} />
            <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
              {t('bundestagCardResult')
                .replace('{ja}', zahl(d.ergebnis.ja_gesamt))
                .replace('{nein}', zahl(d.ergebnis.nein_gesamt))}
            </span>
            {eigene && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs, marginLeft: 'auto', fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.ink }}>
                {t('selbstDu').replace('{wort}', '')}
                <StimmMarke stimme={eigene} />
              </span>
            )}
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
  const [auswahl, setAuswahl] = useState<Auswahl>('alle')
  const { stimmen } = useEigeneStimmen()

  const gefiltert = useMemo(() => {
    const q = fuerSuche(suche.trim())
    return abstimmungen.filter((a) => {
      if (q && !fuerSuche(`${a.poll_titel} ${kurztextFuer(a, lang) ?? ''}`).includes(q)) return false
      if (auswahl === 'alle') return true
      const d = mitErgebnis(a)
      if (!d) return false
      if (auswahl === 'angenommen') return istAngenommen(d)
      if (auswahl === 'abgelehnt') return !istAngenommen(d)
      if (auswahl === 'knapp') return Math.abs(d.ergebnis.ja_gesamt - d.ergebnis.nein_gesamt) <= KNAPP
      return d.fraktionen.some(istGespalten)
    })
  }, [abstimmungen, suche, lang, auswahl])

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
        role="group"
        aria-label={t('bundestagFilterLabel')}
        className="rp-wischzeile"
        style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}
      >
        {AUSWAHL.map((a) => (
          <Chip
            key={a.wert}
            dense
            label={t(a.wort)}
            active={auswahl === a.wert}
            onClick={() => {
              setAuswahl(a.wert)
              setSichtbar(SEITE)
            }}
          />
        ))}
      </div>

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
        {suche.trim() || auswahl !== 'alle'
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
                    <AbstimmungsKachel eintrag={a} eigene={stimmen[String(a.poll_id)]} />
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
      {mitKurztext && (
        <p
          style={{
            margin: `${spacing.xl}px 0 0`,
            fontFamily: fonts.body,
            fontStyle: 'italic',
            fontSize: fontSize.sm,
            lineHeight: lineHeight.normal,
            color: c.muted,
            maxWidth: '68ch',
          }}
        >
          {t('bundestagAutoHint')}
        </p>
      )}
    </div>
  )
}
