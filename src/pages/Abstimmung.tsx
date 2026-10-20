import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Chip,
  LoadingSpinner,
  PageHeader,
  Section,
  useTheme,
  VoteBar,
} from '../design-system'
import { fontSize, fonts, lineHeight, motion, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSeo } from '../hooks/useSeo'
import { AbgeordnetenStimmen } from '../components/bundestag/AbgeordnetenStimmen'
import { AbstimmungsBild } from '../components/bundestag/AbstimmungsBild'
import { FraktionsStimmen } from '../components/bundestag/FraktionsStimmen'
import { Hemicycle, type SitzverteilungRow } from '../components/bundestag/Hemicycle'
import {
  anzeigeTitel,
  datumLang,
  ergebnisWort,
  ergebnisZeile,
  kurztextFuer,
  stimmenKurz,
  vorspann,
} from '../components/bundestag/abstimmungText'
import type { AbstimmungsDetailData, QuellenLink } from '../components/bundestag/fraktion'
import { abstimmungsSitze, type AbgeordnetenApiRow } from '../components/bundestag/sitzplaetze'
import {
  abweichlerJeFraktion,
  stimmEintraege,
  type StimmenZeile,
} from '../components/bundestag/stimmen'

/**
 * Absaetze der Einleitung, die ohne Aufklappen zu sehen sind. Einer reicht:
 * sonst steht auf dem Handy das Ergebnis erst nach zwei Bildschirmen Text.
 * Gibt es einen Kurztext, steht er vorn und die Einleitung ganz dahinter.
 */
const ABSAETZE_SICHTBAR = 1

const AW_ALLE_ABSTIMMUNGEN = 'https://www.abgeordnetenwatch.de/bundestag/21/abstimmungen'
const BT_ABSTIMMUNGEN = 'https://www.bundestag.de/parlament/plenum/abstimmung/liste'

/** "Gesetzentwurf, Drucksache 21/1234 (PDF)" */
function quellenTitel(l: QuellenLink): string {
  const teile = [l.titel]
  if (l.dokument && l.dokument !== l.titel) teile.push(l.dokument)
  const pdf = /\.pdf($|[?#])/i.test(l.url) ? ' (PDF)' : ''
  return teile.join(', ') + pdf
}

/**
 * Eine namentliche Abstimmung auf eigener Seite, aufgebaut wie die
 * Abstimmungskarten fuer Instagram: Worum es ging, Ergebnis, Fraktionen,
 * dann alle Abgeordneten und das Bild zum Teilen.
 * Konzept: projekte/app-redesign/tabs/bundestag.md im Brain.
 */
export default function Abstimmung() {
  const { pollId } = useParams()
  const id = Number.parseInt(pollId ?? '', 10)
  const gueltig = Number.isFinite(id) && id > 0
  const { c, t, lang } = useTheme()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const { data, loading, error } = useApi<AbstimmungsDetailData>(
    gueltig ? `/api/bundestag/abstimmungen/${id}` : '',
  )
  const { data: stimmen, loading: ladeStimmen } = useApi<{ votes: StimmenZeile[] }>(
    gueltig ? `/api/bundestag/poll-votes/${id}` : '',
  )
  // alle=1: auch wer inzwischen ausgeschieden ist, fuer aeltere Abstimmungen
  const { data: abgeordnete } = useApi<AbgeordnetenApiRow[]>('/api/abgeordnete?alle=1')
  const { data: sitzverteilung } = useApi<SitzverteilungRow[]>('/api/bundestag/sitzverteilung')

  const { sitze, personen } = useMemo(
    () => abstimmungsSitze(stimmen?.votes ?? [], abgeordnete ?? []),
    [stimmen, abgeordnete],
  )
  const eintraege = useMemo(
    () => stimmEintraege(stimmen?.votes ?? [], personen),
    [stimmen, personen],
  )
  const abweichler = useMemo(() => abweichlerJeFraktion(eintraege), [eintraege])
  const einzelStimmen = useMemo(
    () => new Map(eintraege.map((e) => [e.awId, e.stimme] as const)),
    [eintraege],
  )

  const zumProfil = useCallback(
    (awId: number) => navigate(`/bundestag/abgeordnete/${awId}`),
    [navigate],
  )

  const [listeFraktion, setListeFraktion] = useState<string | null>(null)
  const [ganzerText, setGanzerText] = useState(false)
  const listeRef = useRef<HTMLDivElement>(null)

  // Beim Wechsel auf eine andere Abstimmung Filter und Aufklappen zuruecksetzen
  useEffect(() => {
    setListeFraktion(null)
    setGanzerText(false)
  }, [id])

  // Halbrund nach dem Laden einer Abstimmung einmal durchlaufen lassen
  const [halbrundLaeuft, setHalbrundLaeuft] = useState(false)
  const geladeneId = data?.poll_id
  useEffect(() => {
    if (geladeneId == null) return
    setHalbrundLaeuft(true)
    const timer = window.setTimeout(() => setHalbrundLaeuft(false), 2500)
    return () => window.clearTimeout(timer)
  }, [geladeneId])

  const datum = data ? datumLang(data.poll_datum, lang) : ''
  const kicker = t('votePageKicker').replace('{datum}', datum)
  const dek = data ? vorspann(data, t, lang) : ''

  const nichtDa = !gueltig || error === 'HTTP 404'

  useSeo({
    titel: data ? anzeigeTitel(data.poll_titel) : t('votes'),
    beschreibung: dek || undefined,
    pfad: gueltig ? `/bundestag/${id}` : undefined,
    // Unbekannte Nummer: Seite bleibt erreichbar, aber nicht im Suchindex
    nichtIndexieren: nichtDa,
  })

  const zurFraktion = useCallback((kurzname: string) => {
    setListeFraktion(kurzname)
    const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    listeRef.current?.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' })
  }, [])

  const zurueck = (
    <Link
      to="/bundestag"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 44,
        marginBottom: spacing.sm,
        fontFamily: fonts.mono,
        fontSize: fontSize.xs,
        color: c.muted,
        textDecoration: 'none',
      }}
    >
      <span aria-hidden>←</span>
      {t('votePageBack')}
    </Link>
  )

  if (!gueltig || (error && !data)) {
    return (
      <>
        {zurueck}
        <PageHeader
          title={t('votes')}
          subtitle={nichtDa ? t('votePageNotFound') : t('dataLoadError')}
        />
      </>
    )
  }

  if (!data) {
    return (
      <>
        {zurueck}
        <LoadingSpinner />
      </>
    )
  }

  const { ergebnis } = data
  const absaetze = (data.intro ?? '')
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter(Boolean)
  const kurztext = kurztextFuer(data, lang)
  const sichtbarOhneKlick = kurztext ? 0 : ABSAETZE_SICHTBAR
  const gezeigt = ganzerText ? absaetze : absaetze.slice(0, sichtbarOhneKlick)
  const nachladen = loading

  let nummer = 0
  const naechste = () => (nummer += 1)

  return (
    <div
      style={{
        // Wechsel zu einer anderen Abstimmung: alten Inhalt stehen lassen
        opacity: nachladen ? 0.55 : 1,
        transition: `opacity ${motion.fast} ${motion.easing}`,
      }}
    >
      {zurueck}
      <PageHeader kicker={kicker} title={anzeigeTitel(data.poll_titel)} subtitle={dek} />

      {absaetze.length > 0 && (
        <Section number={naechste()} title={t('votePageWhat')}>
          <div style={{ maxWidth: '68ch' }}>
            {kurztext && (
              <div style={{ marginBottom: spacing.md }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fonts.body,
                    fontSize: fontSize.lg,
                    lineHeight: lineHeight.normal,
                    color: c.ink,
                  }}
                >
                  {kurztext}
                </p>
                <div
                  style={{
                    marginTop: spacing.xs,
                    fontFamily: fonts.mono,
                    fontSize: fontSize.micro,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: c.muted,
                  }}
                >
                  {t('bundestagAuto')}
                </div>
              </div>
            )}
            {gezeigt.map((a, i) => (
              <p
                key={i}
                style={{
                  margin: `0 0 ${spacing.md}px`,
                  fontFamily: fonts.body,
                  fontSize: fontSize.base,
                  lineHeight: lineHeight.relaxed,
                  color: c.ink,
                }}
              >
                {a}
              </p>
            ))}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              {absaetze.length > sichtbarOhneKlick && (
                <Chip
                  dense
                  label={ganzerText ? t('votePageWhatLess') : t('votePageWhatMore')}
                  onClick={() => setGanzerText(!ganzerText)}
                />
              )}
              {data.quelle_url ? (
                <a
                  href={data.quelle_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}
                >
                  {t('votePageWhatSource')}
                </a>
              ) : (
                <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
                  {t('votePageWhatSource')}
                </span>
              )}
            </div>
          </div>
        </Section>
      )}

      <Section
        number={naechste()}
        title={ergebnisWort(data, t)}
        note={ergebnisZeile(ergebnis, t)}
      >
        <VoteBar
          ja={ergebnis.ja_gesamt}
          nein={ergebnis.nein_gesamt}
          enthalten={ergebnis.enthalten_gesamt}
          abwesend={ergebnis.abwesend_gesamt}
          height={isMobile ? 40 : 52}
          beschriftung="wort"
          ariaLabel={stimmenKurz(
            {
              ja: ergebnis.ja_gesamt,
              nein: ergebnis.nein_gesamt,
              enthalten: ergebnis.enthalten_gesamt,
              abwesend: ergebnis.abwesend_gesamt,
            },
            t,
          )}
        />
      </Section>

      <Section
        number={naechste()}
        title={t('votePageGroups')}
        note={`${t('votePageGroupsScale')} ${t('votePageGroupsNote')} ${t('votePageGroupsTap')}`}
      >
        <FraktionsStimmen
          fraktionen={data.fraktionen}
          abweichler={abweichler}
          onFraktion={zurFraktion}
        />
      </Section>

      {sitzverteilung && sitzverteilung.length > 0 && (
        <Section number={naechste()} title={t('votePagePlenum')} note={t('votePagePlenumNote')}>
          <Hemicycle
            sitzverteilung={sitzverteilung}
            abstimmung={{ fraktionen: data.fraktionen }}
            individuelleVotes={einzelStimmen}
            abgeordnete={sitze}
            animating={halbrundLaeuft}
            onSeatSelect={(sitz) => {
              const abg = sitze.get(sitz)
              if (abg) zumProfil(abg.aw_id)
            }}
          />
        </Section>
      )}

      <div ref={listeRef} style={{ scrollMarginTop: spacing.xl }}>
        <Section
          number={naechste()}
          title={t('votePageMembers').replace(
            '{n}',
            String(
              eintraege.length ||
                ergebnis.ja_gesamt +
                  ergebnis.nein_gesamt +
                  ergebnis.enthalten_gesamt +
                  ergebnis.abwesend_gesamt,
            ),
          )}
        >
          {ladeStimmen && !stimmen ? (
            <LoadingSpinner />
          ) : (
            <AbgeordnetenStimmen
              key={data.poll_id}
              eintraege={eintraege}
              onSelect={zumProfil}
              fraktion={listeFraktion}
              onFraktionChange={setListeFraktion}
            />
          )}
        </Section>
      </div>

      <Section number={naechste()} title={t('votePageShare')}>
        <AbstimmungsBild data={data} abweichler={abweichler} kicker={kicker} />
      </Section>

      <Section number={naechste()} title={t('votePageSources')} last>
        <ul
          style={{
            margin: 0,
            paddingLeft: spacing.lg,
            fontFamily: fonts.body,
            fontSize: fontSize.md,
            lineHeight: lineHeight.relaxed,
            color: c.inkSoft,
          }}
        >
          {[
            ...(data.links ?? []).map((l) => ({ titel: quellenTitel(l), url: l.url })),
            { titel: t('votePageSourceAw'), url: data.quelle_url ?? AW_ALLE_ABSTIMMUNGEN },
            { titel: t('votePageSourceBt'), url: BT_ABSTIMMUNGEN },
          ].map((q) => (
            <li key={q.url}>
              {q.titel}:{' '}
              <a
                href={q.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: c.ink, wordBreak: 'break-all' }}
              >
                {q.url}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
