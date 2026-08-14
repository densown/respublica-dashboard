import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Chip,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Section,
  ShareToolbar,
  Toolbar,
  useTheme,
} from '../design-system'
import {
  fonts,
  fontSize,
  motion,
  radius,
  spacing,
} from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { CoalitionCalculator } from './elections/CoalitionCalculator'
import { ElectionsSubNav } from './elections/ElectionsSubNav'
import { PollStanding } from './elections/PollStanding'
import { PollTrendChart } from './elections/PollTrendChart'
import { SourceNote } from './elections/SourceNote'
import { PARTY_LABELS, partyColorsForTheme } from './elections/partyColors'
import { OTHER, standing } from './elections/pollMath'
import type {
  PollRow,
  PollsResponse,
  WahlterminListResponse,
} from './elections/pollTypes'

const FENSTER = 3

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const target = new Date(`${iso}T00:00:00`).getTime()
  if (Number.isNaN(target)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today.getTime()) / 86_400_000)
}

function formatDate(iso: string | null, lang: string, long = false): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: long ? 'long' : '2-digit',
    year: 'numeric',
  }).format(d)
}

export default function ElectionPolls() {
  const { c, t, lang, theme } = useTheme()
  const narrow = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()

  const institut = searchParams.get('institut') || ''

  const setParam = (key: string, value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key === 'wahl') next.delete('institut')
        return next
      },
      // Wahlwechsel als History-Eintrag (Zurueck fuehrt zur vorigen Wahl),
      // der Institutsfilter nur als Verfeinerung — sonst braucht es fuenf
      // Zurueck-Klicks, um die Seite wieder zu verlassen.
      { replace: key !== 'wahl' },
    )
  }

  const { data: liste, loading: listeLoading } =
    useApi<WahlterminListResponse>('/api/wahltermine')

  // Kommende Wahlen zuerst — innerhalb davon der naechste Termin oben, denn
  // das ist die Wahl, um die es gerade geht. Abgeschlossene absteigend,
  // Termine ohne Datum jeweils ans Ende ihrer Gruppe.
  const wahlen = useMemo(() => {
    const all = liste?.wahltermine ?? []
    const rank = (s: string) => (s === 'kommend' ? 0 : s === 'laufend' ? 1 : 2)
    return [...all].sort((a, b) => {
      const byStatus = rank(a.status) - rank(b.status)
      if (byStatus !== 0) return byStatus
      if (!a.datum) return 1
      if (!b.datum) return -1
      return a.status === 'abgeschlossen'
        ? b.datum.localeCompare(a.datum)
        : a.datum.localeCompare(b.datum)
    })
  }, [liste])

  const kommend = useMemo(() => wahlen.filter((w) => w.status !== 'abgeschlossen'), [wahlen])
  const vergangen = useMemo(
    () => wahlen.filter((w) => w.status === 'abgeschlossen' && w.umfragen > 0),
    [wahlen],
  )

  // Ohne ?wahl= die naechste anstehende Wahl zeigen. Bewusst aus den Daten
  // abgeleitet statt fest verdrahtet — ein fixer Slug waere nach dem
  // jeweiligen Wahltag veraltet.
  const wahlSlug =
    searchParams.get('wahl') ||
    wahlen.find((w) => w.status === 'kommend' && w.datum)?.slug ||
    ''

  const endpoint = useMemo(() => {
    if (!wahlSlug) return ''
    const base = `/api/wahltermine/${encodeURIComponent(wahlSlug)}/umfragen`
    return institut ? `${base}?institut=${encodeURIComponent(institut)}` : base
  }, [wahlSlug, institut])

  const { data, loading, error } = useApi<PollsResponse>(endpoint)

  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )

  // Erstes Laden = noch gar nichts anzuzeigen. Jedes spaetere Laden ist ein
  // Nachladen, bei dem der bisherige Stand sichtbar bleiben soll.
  const ersteLadung = (loading || listeLoading) && !data
  const laedtNach = loading && Boolean(data)

  const umfragen = data?.umfragen ?? []
  const parteien = data?.parteien ?? []
  const neueste = umfragen.length ? umfragen[umfragen.length - 1] : null
  const tage = daysUntil(data?.wahl.datum ?? null)
  const werte = useMemo(
    () => standing(umfragen, parteien, FENSTER),
    [umfragen, parteien],
  )
  const wahlName = data?.wahl
    ? lang === 'de'
      ? data.wahl.name_de
      : data.wahl.name_en
    : ''

  useEffect(() => {
    if (wahlName) document.title = `${t('electionPollsTitle')} — ${wahlName}`
  }, [wahlName, t])

  const letzteZehn = useMemo(() => [...umfragen].reverse().slice(0, 10), [umfragen])
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/wahlen/umfragen?wahl=${wahlSlug}`
      : ''

  const renderWahlPills = (gruppe: typeof wahlen) => (
    <Toolbar>
      {gruppe.map((w) => {
        const label = lang === 'de' ? w.name_de : w.name_en
        // "Landtagswahl Sachsen-Anhalt 2026" -> "Sachsen-Anhalt 2026"
        const kurz = w.land ? `${w.land} ${(w.datum ?? '').slice(0, 4)}` : label
        return (
          <Chip
            key={w.slug}
            label={kurz}
            title={label}
            active={w.slug === wahlSlug}
            onClick={() => setParam('wahl', w.slug)}
          />
        )
      })}
    </Toolbar>
  )

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <ElectionsSubNav />

      <PageHeader
        kicker={t('electionPollsKicker')}
        title={wahlName || t('electionPollsTitle')}
        meta={
          data ? (
            <>
              {data.wahl.datum && (
                <>
                  {formatDate(data.wahl.datum, lang, true)}
                  {tage != null && tage >= 0 && (
                    <span style={{ color: c.red, fontWeight: 700 }}>
                      {' · '}
                      {t('electionPollsDaysLeft').replace('{days}', String(tage))}
                    </span>
                  )}
                  {' · '}
                </>
              )}
              {umfragen.length} {t('electionPollsCount')}
              {data.institute.length > 0 && (
                <>
                  {' · '}
                  {data.institute.length} {t('electionPollsInstitutes')}
                </>
              )}
            </>
          ) : undefined
        }
      />

      {/* ---------- Wahl-Auswahl ---------- */}
      {!listeLoading && (
        <div style={{ marginBottom: spacing.xl }}>
          {renderWahlPills(kommend)}
          {vergangen.length > 0 && (
            <details style={{ marginTop: spacing.md }}>
              <summary
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.xs,
                  color: c.muted,
                  cursor: 'pointer',
                  padding: `${spacing.sm}px 0`,
                }}
              >
                {t('electionPollsPastElections')} ({vergangen.length})
              </summary>
              <div style={{ marginTop: spacing.sm }}>{renderWahlPills(vergangen)}</div>
            </details>
          )}
        </div>
      )}

      {/*
        Spinner nur beim allerersten Laden. Beim Wechsel von Wahl oder
        Institut bleibt der bisherige Inhalt stehen und wird nur abgeblendet:
        haengt man ihn aus, faellt die Seite auf Spinner-Hoehe zusammen, der
        Browser springt nach oben und die Legenden-Auswahl im Chart geht
        verloren, weil PollTrendChart seinen State beim Unmount vergisst.
      */}
      {ersteLadung && <LoadingSpinner />}
      {error && !data && <EmptyState text={t('electionPollsError')} />}

      {data && (
        <div
          style={{
            // Zurueckhaltend: die API antwortet meist in Millisekunden, ein
            // starkes Abblenden wirkt dann wie ein Flackern statt wie Feedback.
            opacity: laedtNach ? 0.6 : 1,
            transition: `opacity ${motion.fast} ${motion.easing}`,
          }}
          aria-busy={laedtNach}
        >
          {umfragen.length < 2 ? (
            <EmptyState text={t('electionPollsNoData')} />
          ) : (
            <>
              {/* ---------- Aktueller Stand ---------- */}
              <Section
                title={t('electionPollsStanding')}
                note={t('electionPollsStandingHint')
                  .replace('{n}', String(Math.min(FENSTER, umfragen.length)))
                  .replace('{date}', formatDate(neueste?.veroeffentlicht ?? null, lang))}
              >
                <PollStanding werte={werte} lang={lang} />
              </Section>

              {/* ---------- Rechnerische Mehrheiten ---------- */}
              <Section
                title={t('electionPollsCoalitions')}
                note={t('electionPollsCoalitionsHint')}
              >
                <CoalitionCalculator werte={werte} lang={lang} t={t} />
              </Section>

              {/* ---------- Verlauf ---------- */}
              <Section
                title={t('electionPollsTrend')}
                note={t('electionPollsThresholdHint')}
              >
                <PollTrendChart
                  data={umfragen}
                  parties={parteien}
                  lang={lang}
                  wahlDatum={data.wahl.datum}
                  height={narrow ? 300 : 400}
                />
              </Section>

              {/* ---------- Einzelne Umfragen ---------- */}
              <Section title={t('electionPollsRecent')}>
                {data.institute.length > 1 && (
                  <Toolbar label={t('electionPollsInstitute')}>
                    {['', ...data.institute].map((inst) => (
                      <Chip
                        key={inst || 'all'}
                        dense
                        label={inst || t('electionPollsAllInstitutes')}
                        active={inst === institut}
                        onClick={() => setParam('institut', inst || null)}
                      />
                    ))}
                  </Toolbar>
                )}

                <div style={{ display: 'grid', gap: 0 }}>
                  {letzteZehn.map((row) => (
                    <PollRowItem
                      key={row.dawum_survey_id}
                      row={row}
                      parteien={parteien}
                      lang={lang}
                      colors={partyColors}
                      dateLabel={formatDate(row.veroeffentlicht, lang)}
                    />
                  ))}
                </div>
              </Section>

              {/* ---------- Teilen + Quelle ---------- */}
              <div style={{ marginTop: spacing.xxl }}>
                <ShareToolbar title={`${t('electionPollsKicker')}: ${wahlName}`} url={shareUrl} />
              </div>
            </>
          )}

          <SourceNote quelle={data.quelle} />
        </div>
      )}
    </div>
  )
}

/** Eine Umfrage als Zeile mit farbigem Anteilsband statt Tabellenzelle. */
function PollRowItem({
  row,
  parteien,
  lang,
  colors,
  dateLabel,
}: {
  row: PollRow
  parteien: string[]
  lang: string
  colors: Record<string, string>
  dateLabel: string
}) {
  const { c } = useTheme()
  const sortiert = parteien
    .map((p) => ({ p, v: row[p] }))
    .filter((x): x is { p: string; v: number } => typeof x.v === 'number')
    .sort((a, b) => (a.p === OTHER ? 1 : b.p === OTHER ? -1 : b.v - a.v))
  const summe = sortiert.reduce((a, x) => a + x.v, 0) || 100

  return (
    <div style={{ padding: `${spacing.md}px 0`, borderBottom: `1px solid ${c.border}` }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: spacing.sm,
          fontFamily: fonts.mono,
          fontSize: fontSize.xs,
          color: c.muted,
          marginBottom: spacing.sm,
        }}
      >
        <span style={{ color: c.inkSoft, fontWeight: 600 }}>{row.institut}</span>
        <span>
          {dateLabel}
          {row.befragte ? ` · n=${row.befragte}` : ''}
        </span>
      </div>

      {/* Gestapeltes Band: zeigt die Kraefteverhaeltnisse auf einen Blick */}
      <div
        style={{
          display: 'flex',
          height: 10,
          borderRadius: radius.sm,
          overflow: 'hidden',
          marginBottom: spacing.sm,
        }}
      >
        {sortiert.map((x) => (
          <div
            key={x.p}
            title={`${PARTY_LABELS[x.p]?.[lang as 'de' | 'en'] ?? x.p}: ${x.v} %`}
            style={{
              width: `${(x.v / summe) * 100}%`,
              background: colors[x.p] ?? colors.other,
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${spacing.xs}px ${spacing.md}px` }}>
        {sortiert.map((x) => (
          <span
            key={x.p}
            style={{ fontFamily: fonts.mono, fontSize: fontSize.sm, color: c.inkSoft }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: radius.xs,
                marginRight: 5,
                background: colors[x.p] ?? colors.other,
              }}
            />
            {PARTY_LABELS[x.p]?.[lang as 'de' | 'en'] ?? x.p}{' '}
            <strong style={{ color: c.ink }}>{x.v}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}
