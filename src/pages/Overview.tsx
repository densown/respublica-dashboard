import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Chip,
  Fundstelle,
  PageHeader,
  Piktogramm,
  Platzhalter,
  Stempel,
  useTheme,
  VoteBar,
} from '../design-system'
import { fontSize, fonts, lineHeight, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useMeinOrt, vorigerBesuch } from '../hooks/useMeins'
import { useSeo } from '../hooks/useSeo'
import {
  anzeigeTitel,
  aufzaehlen,
  datumLang,
  ergebnisWort,
  istAngenommen,
  kurztextFuer,
  lagerDerFraktionen,
  stimmenKurz,
  ueberBeschlussempfehlung,
} from '../components/bundestag/abstimmungText'
import type {
  AbstimmungsDetailData,
  AbstimmungsListenEintrag,
} from '../components/bundestag/fraktion'
import { StimmMarke } from '../components/bundestag/StimmMarke'
import { DeineBilanz } from '../components/einstieg/DeineBilanz'
import { MeineAbgeordneten } from '../components/einstieg/MeineAbgeordneten'
import { Rundgang } from '../components/einstieg/Rundgang'
import { WahlkreisFrage } from '../components/einstieg/WahlkreisFrage'
import { PollStanding } from './elections/PollStanding'
import { OTHER, standing } from './elections/pollMath'
import type { PollRow, Wahltermin } from './elections/pollTypes'

type WahlterminListe = { wahltermine: Wahltermin[] }
type Umfragen = { parteien: string[]; umfragen: PollRow[] }
type Antwort = {
  dokumentnummer: string
  schlagzeile: string | null
  fraktion_name: string | null
  pdf_url: string | null
  kernzahlen: { wert: string; einheit: string | null; bedeutung: string }[] | null
}
type Woche = { neu?: number; daten: Antwort[] }

const LAGER = [
  { stimme: 'yes', wort: 'bundestagCampYes' },
  { stimme: 'no', wort: 'bundestagCampNo' },
  { stimme: 'abstain', wort: 'bundestagCampAbstain' },
] as const

function mitErgebnis(a: AbstimmungsListenEintrag): AbstimmungsDetailData | null {
  if (!a.ergebnis || !a.fraktionen) return null
  return { ...a, ergebnis: a.ergebnis, fraktionen: a.fraktionen }
}

/** Antraege zu einem Gesetz sind Beiwerk, der Aufmacher ist das Gesetz selbst. */
const BEIWERK = /\((Änderungsantrag|Entschließungsantrag)\)\s*$/i

/**
 * Aufmacher: vom juengsten Sitzungstag die Abstimmung, die am ehesten eine
 * Nachricht ist. Erst Hauptsachen vor Aenderungsantraegen, dann die mit
 * Kurztext, dann die knappste.
 */
function aufmacherVon(liste: AbstimmungsListenEintrag[]): {
  aufmacher: AbstimmungsDetailData | null
  amTag: AbstimmungsDetailData[]
} {
  const mit = liste.map(mitErgebnis).filter((d): d is AbstimmungsDetailData => d !== null)
  if (mit.length === 0) return { aufmacher: null, amTag: [] }
  const tag = mit[0].poll_datum
  const vomTag = mit.filter((d) => d.poll_datum === tag)
  const abstand = (d: AbstimmungsDetailData) => Math.abs(d.ergebnis.ja_gesamt - d.ergebnis.nein_gesamt)
  const rang = (d: AbstimmungsDetailData) =>
    (BEIWERK.test(d.poll_titel) || ueberBeschlussempfehlung(d.poll_titel) ? 2 : 0) + (d.kurztext ? 0 : 1)
  const sortiert = [...vomTag].sort((a, b) => rang(a) - rang(b) || abstand(a) - abstand(b))
  return { aufmacher: sortiert[0], amTag: sortiert.slice(1) }
}

function tageBis(iso: string | null): number | null {
  if (!iso) return null
  const ziel = new Date(`${iso}T00:00:00`).getTime()
  if (Number.isNaN(ziel)) return null
  const heute = new Date()
  heute.setHours(0, 0, 0, 0)
  return Math.round((ziel - heute.getTime()) / 86_400_000)
}

/**
 * Titelseite. Eine Zeitung fuehrt mit einer Nachricht, nicht mit einem
 * Inhaltsverzeichnis: oben die juengste Abstimmung mit Ergebnis als Stempel
 * und der Frage nach dem eigenen Wahlkreis, daneben die naechste Wahl und die
 * Zahl der Woche. Die Ressorts stehen in Kopfzeile und Leiste, hier nur noch
 * als kurze Liste am Ende.
 * Konzept: projekte/app-redesign/ im Brain, Audit vom 23.11.2026.
 */
export default function Overview() {
  const { c, t, lang } = useTheme()
  useSeo({
    titel: t('overviewHeroTitle'),
    beschreibung:
      'Gesetze, namentliche Abstimmungen, Lobbyregister, EU-Recht und Wahlen aus amtlichen Quellen, gesammelt, verknüpft und täglich aktualisiert.',
  })
  const schmal = useIsMobile()
  const navigate = useNavigate()
  const [ort, setOrt] = useMeinOrt()
  const [ortOffen, setOrtOffen] = useState(false)

  const abstimmungen = useApi<AbstimmungsListenEintrag[]>('/api/bundestag/abstimmungen')
  const { data: wahlen } = useApi<WahlterminListe>('/api/wahltermine?status=kommend')
  const { data: woche } = useApi<Woche>('/api/kleine-anfragen/woche?top=5')

  const { aufmacher, amTag } = useMemo(() => aufmacherVon(abstimmungen.data ?? []), [abstimmungen.data])

  /** Naechste Wahl mit Datum; am selben Tag gewinnt die mit mehr Umfragen. */
  const { wahl, auch } = useMemo(() => {
    const mitDatum = (wahlen?.wahltermine ?? [])
      .filter((w) => w.datum && (tageBis(w.datum) ?? -1) >= 0)
      .sort(
        (a, b) =>
          (a.datum ?? '').localeCompare(b.datum ?? '') ||
          b.umfragen - a.umfragen ||
          (a.land ?? '').localeCompare(b.land ?? ''),
      )
    const wahl = mitDatum[0] ?? null
    return { wahl, auch: wahl ? mitDatum.filter((w) => w !== wahl && w.datum === wahl.datum) : [] }
  }, [wahlen])
  const { data: umfragen } = useApi<Umfragen>(wahl ? `/api/wahltermine/${wahl.slug}/umfragen` : '')
  const stand = useMemo(
    () =>
      umfragen
        ? standing(umfragen.umfragen, umfragen.parteien.filter((p) => p !== OTHER), 3).slice(0, 5)
        : [],
    [umfragen],
  )
  const tage = tageBis(wahl?.datum ?? null)

  /** Zahl der Woche: die erste Kernzahl der wichtigsten Antwort. */
  const zahl = useMemo(() => {
    const a = (woche?.daten ?? []).find((x) => x.kernzahlen && x.kernzahlen.length > 0 && x.schlagzeile)
    return a && a.kernzahlen ? { antwort: a, kern: a.kernzahlen[0] } : null
  }, [woche])

  /** Was seit dem vorigen Besuch dazukam. */
  const vorher = vorigerBesuch()
  const neu = useMemo(() => {
    if (!vorher) return []
    const teile: string[] = []
    const n = (abstimmungen.data ?? []).filter((a) => a.poll_datum > vorher).length
    if (n === 1) teile.push(t('titelNeuAbstimmung'))
    else if (n > 1) teile.push(t('titelNeuAbstimmungen').replace('{n}', String(n)))
    if ((wahlen?.wahltermine ?? []).some((w) => (w.letzte_umfrage ?? '') > vorher)) teile.push(t('titelNeuUmfrage'))
    return teile
  }, [vorher, abstimmungen.data, wahlen, t])

  const heute = new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const zahlFmt = (n: number) => n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')

  const rubrik = (wort: string, rechts?: ReactNode) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingTop: spacing.sm,
        marginBottom: spacing.md,
        borderTop: `2px solid ${c.ink}`,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: fonts.body,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: fontSize.base,
          color: c.red,
        }}
      >
        {wort}
      </h2>
      {rechts}
    </div>
  )

  const weiter = (ziel: string, wort: string) => (
    <Link
      to={ziel}
      className="rp-zeile"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 44,
        fontFamily: fonts.body,
        fontWeight: 600,
        fontSize: fontSize.md,
        color: c.ink,
        textDecoration: 'none',
      }}
    >
      {wort}
      <span className="rp-pfeil" aria-hidden style={{ color: c.red, display: 'inline-flex' }}>
        <Piktogramm name="pfeil" size={16} />
      </span>
    </Link>
  )

  const lager = aufmacher ? lagerDerFraktionen(aufmacher.fraktionen) : null
  const kurztext = aufmacher ? kurztextFuer(aufmacher, lang) : null

  const blockAufmacher = (
    <section style={{ marginBottom: spacing.xxl }}>
      {rubrik(
        t('titelZuletzt'),
        aufmacher && (
          <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
            {datumLang(aufmacher.poll_datum, lang)}
          </span>
        ),
      )}
      {!aufmacher || !lager ? (
        abstimmungen.error ? (
          <p style={{ margin: 0, fontFamily: fonts.body, color: c.inkSoft }}>{t('dataLoadError')}</p>
        ) : (
          <Platzhalter zeilen={1} />
        )
      ) : (
        <div className="rp-ein">
          <Link to={`/bundestag/${aufmacher.poll_id}`} style={{ color: c.ink, textDecoration: 'none' }}>
            <h3
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: schmal ? fontSize.xxl : fontSize.hero,
                lineHeight: 1.12,
                letterSpacing: '-0.01em',
                maxWidth: '22ch',
                textWrap: 'balance',
              }}
            >
              {anzeigeTitel(aufmacher.poll_titel)}
            </h3>
          </Link>
          {kurztext && (
            <p
              style={{
                margin: `${spacing.md}px 0 0`,
                fontFamily: fonts.body,
                fontSize: fontSize.lg,
                lineHeight: lineHeight.normal,
                color: c.inkSoft,
                maxWidth: '60ch',
              }}
            >
              {kurztext}
            </p>
          )}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: `${spacing.sm}px ${spacing.lg}px`,
              margin: `${spacing.lg}px 0 ${spacing.md}px`,
            }}
          >
            <Stempel
              wort={ergebnisWort(aufmacher, t)}
              art={istAngenommen(aufmacher) ? 'ja' : 'nein'}
              groesse={schmal ? 15 : 18}
            />
            <span style={{ fontFamily: fonts.mono, fontSize: fontSize.sm, color: c.inkSoft }}>
              {t('bundestagCardResult')
                .replace('{ja}', zahlFmt(aufmacher.ergebnis.ja_gesamt))
                .replace('{nein}', zahlFmt(aufmacher.ergebnis.nein_gesamt))}
            </span>
          </div>
          <VoteBar
            ja={aufmacher.ergebnis.ja_gesamt}
            nein={aufmacher.ergebnis.nein_gesamt}
            enthalten={aufmacher.ergebnis.enthalten_gesamt}
            abwesend={aufmacher.ergebnis.abwesend_gesamt}
            height={schmal ? 28 : 36}
            beschriftung="zahl"
            ariaLabel={stimmenKurz(
              {
                ja: aufmacher.ergebnis.ja_gesamt,
                nein: aufmacher.ergebnis.nein_gesamt,
                enthalten: aufmacher.ergebnis.enthalten_gesamt,
                abwesend: aufmacher.ergebnis.abwesend_gesamt,
              },
              t,
            )}
          />
          <div style={{ display: 'grid', gap: spacing.xs, marginTop: spacing.md }}>
            {LAGER.filter((l) => lager.lager[l.stimme].length > 0).map((l) => (
              <div
                key={l.stimme}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: spacing.sm,
                  fontFamily: fonts.body,
                  fontSize: fontSize.md,
                  lineHeight: lineHeight.normal,
                  color: c.ink,
                }}
              >
                <span style={{ alignSelf: 'center', display: 'inline-flex' }}>
                  <StimmMarke stimme={l.stimme} ohneWort />
                </span>
                <span>
                  <span style={{ color: c.muted }}>{t(l.wort)}:</span> {aufzaehlen(lager.lager[l.stimme], t)}
                </span>
              </div>
            ))}
          </div>

          {/* Der eigene Wahlkreis: macht aus der Zahl etwas Eigenes */}
          <div
            style={{
              marginTop: spacing.xl,
              padding: spacing.lg,
              background: c.bgAlt,
              borderLeft: `3px solid ${c.red}`,
            }}
          >
            {ort && !ortOffen ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: spacing.sm,
                    marginBottom: spacing.xs,
                  }}
                >
                  <span style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.base, color: c.ink }}>
                    {t('ortSoStimmten')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOrtOffen(true)}
                    title={t('ortAendern')}
                    style={{
                      minHeight: 44,
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      fontFamily: fonts.mono,
                      fontSize: fontSize.xs,
                      color: c.muted,
                      textDecoration: 'underline',
                      textDecorationStyle: 'dotted',
                      textUnderlineOffset: 3,
                      cursor: 'pointer',
                    }}
                  >
                    {ort.name}
                  </button>
                </div>
                <MeineAbgeordneten ort={ort} pollId={aufmacher.poll_id} />
              </>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 900,
                    fontSize: fontSize.xl,
                    lineHeight: lineHeight.tight,
                    color: c.ink,
                  }}
                >
                  {t('ortFrageAbstimmung')}
                </div>
                <p
                  style={{
                    margin: `${spacing.xs}px 0 ${spacing.md}px`,
                    fontFamily: fonts.body,
                    fontSize: fontSize.md,
                    lineHeight: lineHeight.normal,
                    color: c.inkSoft,
                  }}
                >
                  {t('ortFrageText')}
                </p>
                <WahlkreisFrage
                  autoFocus={ortOffen}
                  onWahl={(o) => {
                    setOrt(o)
                    setOrtOffen(false)
                  }}
                />
              </>
            )}
          </div>

          <div style={{ marginTop: spacing.sm }}>
            {weiter(`/bundestag/${aufmacher.poll_id}`, t('titelZurAbstimmung'))}
          </div>
        </div>
      )}
    </section>
  )

  const blockAmTag = amTag.length > 0 && (
    <section style={{ marginBottom: spacing.xxl }}>
      {rubrik(t('titelAuchAmTag'))}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {amTag.slice(0, 3).map((d) => (
          <li key={d.poll_id}>
            <Link
              to={`/bundestag/${d.poll_id}`}
              className="rp-zeile"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
                minHeight: 56,
                padding: `${spacing.md}px 0`,
                borderBottom: `1px solid ${c.border}`,
                color: c.ink,
                textDecoration: 'none',
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontFamily: fonts.body,
                    fontWeight: 600,
                    fontSize: fontSize.base,
                    lineHeight: lineHeight.tight,
                  }}
                >
                  {anzeigeTitel(d.poll_titel)}
                </span>
                <span style={{ display: 'block', marginTop: 2, fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
                  {t('bundestagCardResult')
                    .replace('{ja}', zahlFmt(d.ergebnis.ja_gesamt))
                    .replace('{nein}', zahlFmt(d.ergebnis.nein_gesamt))}
                </span>
              </span>
              <Stempel
                ruhig
                wort={t(istAngenommen(d) ? 'accepted' : 'rejected')}
                art={istAngenommen(d) ? 'ja' : 'nein'}
                groesse={10}
                style={{ flexShrink: 0 }}
              />
            </Link>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: spacing.xs }}>
        {weiter('/bundestag', t('titelAlleAbstimmungen').replace('{n}', String(abstimmungen.data?.length ?? 0)))}
      </div>
    </section>
  )

  const wahlName = wahl ? (lang === 'de' ? wahl.name_de : wahl.name_en) : ''
  const blockWahl = wahl && tage != null && (
    <section style={{ marginBottom: spacing.xxl }}>
      {rubrik(
        t('titelWahl'),
        <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
          {datumLang(wahl.datum ?? '', lang)}
        </span>,
      )}
      <h3
        style={{
          margin: 0,
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: fontSize.xl,
          lineHeight: lineHeight.tight,
          color: c.ink,
          textWrap: 'balance',
        }}
      >
        {tage === 0
          ? t('titelWahlHeute').replace('{name}', wahlName)
          : tage === 1
            ? t('titelWahlMorgen').replace('{name}', wahlName)
            : t('titelWahlIn').replace('{n}', String(tage)).replace('{name}', wahlName)}
      </h3>
      {auch.length > 0 && (
        <p style={{ margin: `${spacing.xs}px 0 0`, fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted }}>
          {t('titelWahlAuch').replace(
            '{land}',
            aufzaehlen(
              auch.map((w) => w.land ?? (lang === 'de' ? w.name_de : w.name_en)),
              t,
            ),
          )}
        </p>
      )}
      {stand.length > 0 && (
        <div style={{ marginTop: spacing.md }}>
          <PollStanding werte={stand} lang={lang} />
          <p style={{ margin: `${spacing.xs}px 0 0`, fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
            {t('titelWahlStand')}
          </p>
        </div>
      )}
      {weiter('/wahlen/umfragen', t('titelWahlMehr'))}
    </section>
  )

  const blockZahl = zahl && (
    <section style={{ marginBottom: spacing.xxl }}>
      {rubrik(t('titelZahl'))}
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: fontSize.hero,
          lineHeight: 1,
          color: c.ink,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {zahl.kern.wert}
        {zahl.kern.einheit && (
          <span style={{ marginLeft: spacing.sm, fontFamily: fonts.body, fontWeight: 400, fontSize: fontSize.lg, color: c.inkSoft }}>
            {zahl.kern.einheit}
          </span>
        )}
      </div>
      <p
        style={{
          margin: `${spacing.sm}px 0`,
          fontFamily: fonts.body,
          fontSize: fontSize.md,
          lineHeight: lineHeight.normal,
          color: c.ink,
        }}
      >
        {zahl.kern.bedeutung}
      </p>
      <p style={{ margin: 0, fontFamily: fonts.body, fontSize: fontSize.sm, lineHeight: lineHeight.normal, color: c.muted }}>
        {t('titelZahlAus').replace('{fraktion}', zahl.antwort.fraktion_name ?? '')}{' '}
        <Fundstelle href={zahl.antwort.pdf_url}>BT-Drs. {zahl.antwort.dokumentnummer}</Fundstelle>
      </p>
      {weiter('/kleine-anfragen', t('titelZahlMehr'))}
    </section>
  )

  const ressorts = [
    { pfad: '/bundestag', name: 'bundestag', wort: t('bundestag') },
    { pfad: '/wahlen/umfragen', name: 'wahlen', wort: t('navElections') },
    { pfad: '/gesetze', name: 'gesetze', wort: t('navGesetze') },
    { pfad: '/lobbyregister', name: 'lobby', wort: t('lobby') },
    { pfad: '/mehr', name: 'mehr', wort: t('navMehr') },
  ] as const
  const blockRessorts = (
    <nav aria-label={t('titelRessorts')} style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xxl }}>
      {ressorts.map((r) => (
        <Chip key={r.pfad} label={r.wort} onClick={() => navigate(r.pfad)} />
      ))}
    </nav>
  )

  const blockNeu = vorher && neu.length > 0 && (
    <p
      className="rp-ein"
      style={{
        margin: `0 0 ${spacing.xl}px`,
        padding: `${spacing.sm}px ${spacing.md}px`,
        borderLeft: `3px solid ${c.red}`,
        fontFamily: fonts.body,
        fontSize: fontSize.md,
        lineHeight: lineHeight.normal,
        color: c.ink,
      }}
    >
      <span style={{ fontStyle: 'italic', color: c.red }}>
        {t('titelNeu').replace('{datum}', datumLang(vorher, lang).replace(/\s\d{4}$/, ''))}:
      </span>{' '}
      {aufzaehlen(neu, t)}.
    </p>
  )

  const rundgang = <Rundgang ersteAbstimmung={aufmacher?.poll_id} />
  const bilanz = <DeineBilanz abstimmungen={abstimmungen.data ?? []} />
  const abstand = { marginBottom: spacing.xxl } as const

  return (
    <div style={{ paddingBottom: spacing.xl }}>
      <PageHeader
        kicker={t('titelKicker').replace('{datum}', heute)}
        title={t('overviewHeroTitle')}
        subtitle={t('titelDek')}
      />
      {blockNeu}
      {schmal ? (
        <>
          {blockAufmacher}
          <div style={abstand}>{rundgang}</div>
          {blockWahl}
          {blockZahl}
          {blockAmTag}
          <div style={abstand}>{bilanz}</div>
          {blockRessorts}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(280px, 1fr)', columnGap: spacing.xxxl }}>
          <div>
            {blockAufmacher}
            {blockAmTag}
          </div>
          <div style={{ borderLeft: `1px solid ${c.border}`, paddingLeft: spacing.xxl }}>
            <div style={abstand}>{rundgang}</div>
            {blockWahl}
            {blockZahl}
            <div style={abstand}>{bilanz}</div>
          </div>
        </div>
      )}
    </div>
  )
}
