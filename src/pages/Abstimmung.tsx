import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
import { AbgeordnetenProfil } from '../components/bundestag/AbgeordnetenProfil'
import { AbgeordnetenStimmen } from '../components/bundestag/AbgeordnetenStimmen'
import { AbstimmungsBild } from '../components/bundestag/AbstimmungsBild'
import { FraktionsStimmen } from '../components/bundestag/FraktionsStimmen'
import { Hemicycle, type SitzverteilungRow } from '../components/bundestag/Hemicycle'
import {
  ergebnisZeile,
  istAngenommen,
  stimmenKurz,
  vorspann,
} from '../components/bundestag/abstimmungText'
import type { AbstimmungsDetailData } from '../components/bundestag/fraktion'
import {
  nachAwId,
  sitzeZuordnen,
  type AbgeordnetenApiRow,
} from '../components/bundestag/sitzplaetze'
import {
  abweichlerJeFraktion,
  stimmEintraege,
  type StimmenZeile,
} from '../components/bundestag/stimmen'

/**
 * Absaetze der Einleitung, die ohne Aufklappen zu sehen sind. Einer reicht:
 * sonst steht auf dem Handy das Ergebnis erst nach zwei Bildschirmen Text.
 */
const ABSAETZE_SICHTBAR = 1

function datumLang(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
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

  const { data, loading, error } = useApi<AbstimmungsDetailData>(
    gueltig ? `/api/bundestag/abstimmungen/${id}` : '',
  )
  const { data: stimmen, loading: ladeStimmen } = useApi<{ votes: StimmenZeile[] }>(
    gueltig ? `/api/bundestag/poll-votes/${id}` : '',
  )
  const { data: abgeordnete } = useApi<AbgeordnetenApiRow[]>('/api/abgeordnete')
  const { data: sitzverteilung } = useApi<SitzverteilungRow[]>('/api/bundestag/sitzverteilung')

  const nachId = useMemo(() => nachAwId(abgeordnete ?? []), [abgeordnete])
  const sitze = useMemo(() => sitzeZuordnen(abgeordnete ?? []), [abgeordnete])
  const eintraege = useMemo(
    () => stimmEintraege(stimmen?.votes ?? [], nachId),
    [stimmen, nachId],
  )
  const abweichler = useMemo(() => abweichlerJeFraktion(eintraege), [eintraege])
  const einzelStimmen = useMemo(
    () => new Map(eintraege.map((e) => [e.awId, e.stimme] as const)),
    [eintraege],
  )

  const [profilId, setProfilId] = useState<number | null>(null)
  const profil = profilId != null ? (nachId.get(profilId) ?? null) : null
  const schliessen = useCallback(() => setProfilId(null), [])

  const [listeFraktion, setListeFraktion] = useState<string | null>(null)
  const [ganzerText, setGanzerText] = useState(false)
  const listeRef = useRef<HTMLDivElement>(null)

  // Beim Wechsel auf eine andere Abstimmung Filter und Aufklappen zuruecksetzen
  useEffect(() => {
    setListeFraktion(null)
    setGanzerText(false)
    setProfilId(null)
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

  useSeo({
    titel: data?.poll_titel ?? t('votes'),
    beschreibung: dek || undefined,
    pfad: gueltig ? `/bundestag/${id}` : undefined,
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
    const nichtDa = !gueltig || error === 'HTTP 404'
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
  const gezeigt = ganzerText ? absaetze : absaetze.slice(0, ABSAETZE_SICHTBAR)
  const nachladen = loading

  let nummer = 0
  const naechste = () => (nummer += 1)

  return (
    <>
    <div
      style={{
        // Wechsel zu einer anderen Abstimmung: alten Inhalt stehen lassen
        opacity: nachladen ? 0.55 : 1,
        transition: `opacity ${motion.fast} ${motion.easing}`,
      }}
    >
      {zurueck}
      <PageHeader kicker={kicker} title={data.poll_titel} subtitle={dek} />

      {absaetze.length > 0 && (
        <Section number={naechste()} title={t('votePageWhat')}>
          <div style={{ maxWidth: '68ch' }}>
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
              {absaetze.length > ABSAETZE_SICHTBAR && (
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
        title={istAngenommen(data) ? t('accepted') : t('rejected')}
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
        note={`${t('votePageGroupsNote')} ${t('votePageGroupsTap')}`}
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
              if (abg) setProfilId(abg.aw_id)
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
              onSelect={setProfilId}
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
          <li>
            {t('votePageSourceAw')}:{' '}
            <a
              href={data.quelle_url ?? 'https://www.abgeordnetenwatch.de/bundestag/21/abstimmungen'}
              target="_blank"
              rel="noreferrer"
              style={{ color: c.ink, wordBreak: 'break-all' }}
            >
              {data.quelle_url ?? 'https://www.abgeordnetenwatch.de/bundestag/21/abstimmungen'}
            </a>
          </li>
          <li>
            {t('votePageSourceBt')}:{' '}
            <a
              href="https://www.bundestag.de/parlament/plenum/abstimmung/liste"
              target="_blank"
              rel="noreferrer"
              style={{ color: c.ink, wordBreak: 'break-all' }}
            >
              https://www.bundestag.de/parlament/plenum/abstimmung/liste
            </a>
          </li>
        </ul>
      </Section>
    </div>

    {profil && <AbgeordnetenProfil abgeordneter={profil} onClose={schliessen} />}
    </>
  )
}
