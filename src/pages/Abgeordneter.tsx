import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Chip,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Section,
  useTheme,
  VoteBar,
} from '../design-system'
import { stimmFlaeche } from '../design-system/palettes'
import { fontSize, fonts, lineHeight, measure, motion, radius, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSeo } from '../hooks/useSeo'
import { anzeigeTitel, datumLang, ergebnisZeile, stimmenKurz } from '../components/bundestag/abstimmungText'
import {
  hatFraktionslinie,
  shortFraktionName,
  wahlkreisKurz,
} from '../components/bundestag/fraktion'
import { MemberTopicProfile, type MemberTopicProfileData } from '../components/bundestag/MemberTopicProfile'
import { fotoDateiseite } from '../components/bundestag/foto'
import { Portraet } from '../components/bundestag/Portraet'
import { StimmMarke } from '../components/bundestag/StimmMarke'
import { fuerSuche, normalizeStimme, STIMMEN, type Stimme } from '../components/bundestag/stimmen'

/** Zeile aus /api/abgeordnete/:awId/votes */
type StimmZeile = {
  poll_id: number
  vote: string
  poll_titel: string
  poll_datum: string
  /** Ab API #9: Fraktion am Tag der Abstimmung und deren Mehrheit */
  fraktion?: string | null
  fraktion_vote?: string | null
}

type Zeile = {
  pollId: number
  titel: string
  datum: string
  stimme: Stimme
  fraktion: string | null
  fraktionsStimme: Stimme | null
  abweichung: boolean
}

const SEITE = 40
const AW_PROFILE = 'https://www.abgeordnetenwatch.de/bundestag'

const STIMM_ART = {
  yes: 'ja',
  no: 'nein',
  abstain: 'enthalten',
  no_show: 'abwesend',
} as const

/**
 * Profil einer oder eines Abgeordneten auf eigener Seite, damit man es
 * verlinken und teilen kann. Aufgebaut wie die Abstimmungsseite:
 * Bilanz, Abweichungen von der eigenen Fraktion, Themen, alle Stimmen.
 * Konzept: projekte/app-redesign/tabs/bundestag.md im Brain.
 */
export default function Abgeordneter() {
  const { awId } = useParams()
  const id = Number.parseInt(awId ?? '', 10)
  const gueltig = Number.isFinite(id) && id > 0
  const { c, t, lang } = useTheme()
  const isMobile = useIsMobile()

  const profil = useApi<MemberTopicProfileData>(gueltig ? `/api/abgeordnete/${id}/themen` : '')
  const stimmen = useApi<StimmZeile[]>(gueltig ? `/api/abgeordnete/${id}/votes` : '')

  const zeilen: Zeile[] = useMemo(
    () =>
      (stimmen.data ?? []).map((r) => {
        const stimme = normalizeStimme(r.vote)
        const fraktionsStimme = r.fraktion_vote ? normalizeStimme(r.fraktion_vote) : null
        return {
          pollId: r.poll_id,
          titel: anzeigeTitel(r.poll_titel),
          datum: r.poll_datum,
          stimme,
          fraktion: r.fraktion ? shortFraktionName(r.fraktion) : null,
          fraktionsStimme,
          abweichung: stimme !== 'no_show' && fraktionsStimme != null && stimme !== fraktionsStimme,
        }
      }),
    [stimmen.data],
  )
  // Vor API #9 fehlt die Fraktionsmehrheit je Abstimmung; dann zaehlt das
  // Themenprofil, das nur Abstimmungen mit Sachgebiet kennt.
  const mitFraktionsStimme = (stimmen.data ?? []).some((r) => 'fraktion_vote' in r)
  const abweichungen = useMemo(() => zeilen.filter((z) => z.abweichung), [zeilen])

  const [suche, setSuche] = useState('')
  const [filter, setFilter] = useState<Stimme | 'abweichung' | null>(null)
  const [sichtbar, setSichtbar] = useState(SEITE)
  // Beim Wechsel zu einer anderen Person Suche und Filter zuruecksetzen
  useEffect(() => {
    setSuche('')
    setFilter(null)
    setSichtbar(SEITE)
  }, [id])

  const gefiltert = useMemo(() => {
    const q = fuerSuche(suche.trim())
    return zeilen.filter((z) => {
      if (filter === 'abweichung' ? !z.abweichung : filter && z.stimme !== filter) return false
      return !q || fuerSuche(z.titel).includes(q)
    })
  }, [zeilen, suche, filter])

  const person = profil.data?.abgeordnete
  const fraktion = person ? shortFraktionName(person.fraktion) : ''
  const ohneLinie = person ? !hatFraktionslinie(fraktion) : false

  const bilanz = useMemo(() => {
    if (stimmen.data) {
      const z = { ja: 0, nein: 0, enthalten: 0, abwesend: 0 }
      for (const r of zeilen) {
        if (r.stimme === 'yes') z.ja += 1
        else if (r.stimme === 'no') z.nein += 1
        else if (r.stimme === 'abstain') z.enthalten += 1
        else z.abwesend += 1
      }
      return z
    }
    const g = profil.data?.gesamt
    return g ? { ja: g.ja, nein: g.nein, enthalten: g.enthalten, abwesend: g.abwesend } : null
  }, [stimmen.data, zeilen, profil.data])

  const zahlAbweichungen = mitFraktionsStimme
    ? abweichungen.length
    : (profil.data?.gesamt.abweichungen ?? 0)

  const dek = useMemo(() => {
    if (!person || !bilanz) return ''
    const gesamt = bilanz.ja + bilanz.nein + bilanz.enthalten + bilanz.abwesend
    if (gesamt === 0) return ''
    const saetze = [
      t('profileDekTurnout')
        .replace('{n}', String(gesamt - bilanz.abwesend))
        .replace('{gesamt}', String(gesamt)),
    ]
    if (ohneLinie) saetze.push(t('profileDekNoGroup'))
    else if (zahlAbweichungen === 0) saetze.push(t('profileDekNever'))
    else if (zahlAbweichungen === 1) saetze.push(t('profileDekOnce'))
    else saetze.push(t('profileDekMany').replace('{n}', String(zahlAbweichungen)))
    return saetze.join(' ')
  }, [person, bilanz, ohneLinie, zahlAbweichungen, t])

  const nichtDa = !gueltig || profil.error === 'HTTP 404'

  useSeo({
    titel: person ? person.name : t('profileBack'),
    beschreibung: dek || undefined,
    pfad: gueltig ? `/bundestag/abgeordnete/${id}` : undefined,
    // Unbekannte Nummer: Seite bleibt erreichbar, aber nicht im Suchindex
    nichtIndexieren: nichtDa,
  })

  const zurueck = (
    <Link
      to="/bundestag?ansicht=abgeordnete"
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
      {t('profileBack')}
    </Link>
  )

  if (!gueltig || (profil.error && !profil.data)) {
    return (
      <>
        {zurueck}
        <PageHeader
          title={t('bundestagViewMembers')}
          subtitle={nichtDa ? t('profileNotFound') : t('dataLoadError')}
        />
      </>
    )
  }

  if (!person) {
    return (
      <>
        {zurueck}
        <LoadingSpinner />
      </>
    )
  }

  const wahlkreis = wahlkreisKurz(person.wahlkreis)
  const kicker = [fraktion, wahlkreis ? t('wahlkreis').replace('{name}', wahlkreis) : '']
    .filter(Boolean)
    .join(', ')
  const mandat = [
    person.mandat_von ? t('profileSince').replace('{datum}', datumLang(person.mandat_von, lang)) : '',
    person.mandat_bis ? t('profileUntil').replace('{datum}', datumLang(person.mandat_bis, lang)) : '',
  ]
    .filter(Boolean)
    .join('. ')
  const fotoSeite = fotoDateiseite(person.foto_url)
  const stimmWort: Record<Stimme, string> = {
    yes: t('yes'),
    no: t('no'),
    abstain: t('abstain'),
    no_show: t('absentL'),
  }
  const zahlJeStimme = (s: Stimme) => zeilen.filter((z) => z.stimme === s).length
  // Ohne Abweichung sagt der Vorspann alles; ein Abschnitt mit einem Satz
  // wuerde ihn nur wiederholen
  const zeigeAbweichungen = !ohneLinie && mitFraktionsStimme && abweichungen.length > 0

  let nummer = 0
  const naechste = () => (nummer += 1)

  return (
    <div
      style={{
        // Wechsel zu einer anderen Person: alten Inhalt stehen lassen
        opacity: profil.loading ? 0.55 : 1,
        transition: `opacity ${motion.fast} ${motion.easing}`,
      }}
    >
      {zurueck}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          columnGap: spacing.xl,
        }}
      >
        <div style={{ marginBottom: spacing.lg }}>
          <Portraet
            name={person.name}
            fotoUrl={person.foto_url}
            groesse={isMobile ? 80 : 120}
            alt={t('profilePhotoAlt').replace('{name}', person.name)}
          />
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <PageHeader kicker={kicker} title={person.name} subtitle={dek} meta={mandat || undefined} />
        </div>
      </div>

      {bilanz && (
        <Section
          number={naechste()}
          title={t('profileBalance')}
          note={ergebnisZeile(
            {
              ja_gesamt: bilanz.ja,
              nein_gesamt: bilanz.nein,
              enthalten_gesamt: bilanz.enthalten,
              abwesend_gesamt: bilanz.abwesend,
            },
            t,
          )}
        >
          <VoteBar
            ja={bilanz.ja}
            nein={bilanz.nein}
            enthalten={bilanz.enthalten}
            abwesend={bilanz.abwesend}
            height={isMobile ? 40 : 52}
            beschriftung="wort"
            ariaLabel={stimmenKurz(bilanz, t)}
          />
        </Section>
      )}

      {zeigeAbweichungen && (
        <Section number={naechste()} title={t('profileDeviations')} note={t('profileDeviationsNote')}>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              maxWidth: measure.liste,
              borderTop: `1px solid ${c.ink}`,
            }}
          >
            {abweichungen.map((z) => (
              <li key={z.pollId} style={{ borderBottom: `1px solid ${c.border}` }}>
                <Link
                  to={`/bundestag/${z.pollId}`}
                  className="rp-chip"
                  style={{
                    display: 'block',
                    padding: `${spacing.md}px 0`,
                    color: c.ink,
                    textDecoration: 'none',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontFamily: fonts.mono,
                      fontSize: fontSize.xs,
                      color: c.muted,
                      marginBottom: spacing.xs,
                    }}
                  >
                    {datumLang(z.datum, lang)}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: fonts.body,
                      fontWeight: 600,
                      fontSize: fontSize.base,
                      lineHeight: lineHeight.tight,
                      marginBottom: spacing.sm,
                    }}
                  >
                    {z.titel}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      columnGap: spacing.lg,
                      rowGap: spacing.xs,
                      fontFamily: fonts.mono,
                      fontSize: fontSize.xs,
                      color: c.muted,
                    }}
                  >
                    <span style={{ display: 'inline-flex', gap: spacing.sm, alignItems: 'center' }}>
                      {t('profileOwnVote')} <StimmMarke stimme={z.stimme} />
                    </span>
                    {z.fraktionsStimme && (
                      <span style={{ display: 'inline-flex', gap: spacing.sm, alignItems: 'center' }}>
                        {t('profileGroupMajority').replace('{fraktion}', z.fraktion ?? fraktion)}{' '}
                        <StimmMarke stimme={z.fraktionsStimme} />
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section number={naechste()} title={t('profileTopics')} note={t('profileTopicsNote')}>
        <MemberTopicProfile data={profil.data} />
      </Section>

      <Section
        number={naechste()}
        title={t('profileVotesTitle').replace('{n}', String(zeilen.length))}
      >
        {stimmen.loading && !stimmen.data ? (
          <LoadingSpinner />
        ) : stimmen.error && !stimmen.data ? (
          <p style={{ margin: 0, fontFamily: fonts.body, color: c.inkSoft }}>{t('dataLoadError')}</p>
        ) : zeilen.length === 0 ? (
          <EmptyState text={t('profileVotesEmpty')} />
        ) : (
          <div style={{ maxWidth: measure.liste }}>
            <input
              type="search"
              value={suche}
              onChange={(e) => {
                setSuche(e.target.value)
                setSichtbar(SEITE)
              }}
              placeholder={t('profileVotesSearch')}
              aria-label={t('profileVotesSearch')}
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
              aria-label={t('memberListFilterVote')}
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                gap: spacing.sm,
                marginBottom: spacing.lg,
                paddingBottom: spacing.xs,
                scrollbarWidth: 'thin',
              }}
            >
              <Chip
                dense
                label={`${t('memberListAll')} ${zeilen.length}`}
                active={filter == null}
                onClick={() => {
                  setFilter(null)
                  setSichtbar(SEITE)
                }}
              />
              {STIMMEN.filter((s) => zahlJeStimme(s) > 0).map((s) => (
                <Chip
                  key={s}
                  dense
                  label={`${stimmWort[s]} ${zahlJeStimme(s)}`}
                  dot={s === 'no_show' ? c.hatch : stimmFlaeche(STIMM_ART[s], c)}
                  active={filter === s}
                  onClick={() => {
                    setFilter(filter === s ? null : s)
                    setSichtbar(SEITE)
                  }}
                />
              ))}
              {zeigeAbweichungen && abweichungen.length > 0 && (
                <Chip
                  dense
                  label={`${t('memberListDeviators')} ${abweichungen.length}`}
                  active={filter === 'abweichung'}
                  onClick={() => {
                    setFilter(filter === 'abweichung' ? null : 'abweichung')
                    setSichtbar(SEITE)
                  }}
                />
              )}
            </div>

            <div
              aria-live="polite"
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSize.xs,
                color: c.muted,
                paddingBottom: spacing.sm,
                borderBottom: `1px solid ${c.ink}`,
              }}
            >
              {t('bundestagVotesCount').replace('{n}', String(gefiltert.length))}
            </div>

            {gefiltert.length === 0 ? (
              <EmptyState text={t('profileVotesNone')} />
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {gefiltert.slice(0, sichtbar).map((z) => (
                  <li key={z.pollId} style={{ borderBottom: `1px solid ${c.border}` }}>
                    <Link
                      to={`/bundestag/${z.pollId}`}
                      className="rp-chip"
                      style={{
                        minHeight: 56,
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: `${spacing.sm}px 0`,
                        color: c.ink,
                        textDecoration: 'none',
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: 'block',
                            fontFamily: fonts.body,
                            fontSize: fontSize.base,
                            lineHeight: lineHeight.tight,
                          }}
                        >
                          {z.titel}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            marginTop: spacing.xs,
                            fontFamily: fonts.mono,
                            fontSize: fontSize.xs,
                            color: c.muted,
                          }}
                        >
                          {datumLang(z.datum, lang)}
                        </span>
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: spacing.xs,
                          flexShrink: 0,
                        }}
                      >
                        <StimmMarke stimme={z.stimme} />
                        {z.abweichung && (
                          <span
                            style={{
                              fontFamily: fonts.body,
                              fontStyle: 'italic',
                              fontWeight: 600,
                              fontSize: fontSize.xs,
                              color: c.red,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t('memberListDeviates')}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {gefiltert.length > sichtbar && (
              <div style={{ marginTop: spacing.lg, display: 'flex', justifyContent: 'center' }}>
                <Chip
                  label={t('memberListMore').replace(
                    '{n}',
                    String(Math.min(gefiltert.length - sichtbar, SEITE * 2)),
                  )}
                  onClick={() => setSichtbar(sichtbar + SEITE * 2)}
                />
              </div>
            )}
          </div>
        )}
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
            { titel: t('profileSourceAw'), url: person.profil_url || AW_PROFILE },
            ...(fotoSeite ? [{ titel: t('profileSourcePhoto'), url: fotoSeite }] : []),
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
