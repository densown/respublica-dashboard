import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DataCard,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatTile,
  useTheme,
} from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { ElectionsSubNav } from './elections/ElectionsSubNav'
import { PollTrendChart } from './elections/PollTrendChart'
import { SourceNote } from './elections/SourceNote'
import { PARTY_LABELS, partyColorsForTheme } from './elections/partyColors'
import type {
  PollRow,
  PollsResponse,
  WahlterminListResponse,
} from './elections/pollTypes'

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const target = new Date(`${iso}T00:00:00`).getTime()
  if (Number.isNaN(target)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today.getTime()) / 86_400_000)
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/** Staerkste Partei einer Umfragezeile. */
function leader(row: PollRow, parties: string[]): { partei: string; wert: number } | null {
  let best: { partei: string; wert: number } | null = null
  for (const p of parties) {
    const v = row[p]
    if (typeof v === 'number' && (!best || v > best.wert)) best = { partei: p, wert: v }
  }
  return best
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
        // Institut-Filter gilt immer nur fuer die gewaehlte Wahl
        if (key === 'wahl') next.delete('institut')
        return next
      },
      { replace: false },
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

  const umfragen = data?.umfragen ?? []
  const parteien = data?.parteien ?? []
  const neueste = umfragen.length ? umfragen[umfragen.length - 1] : null
  const spitze = neueste ? leader(neueste, parteien) : null
  const tage = daysUntil(data?.wahl.datum ?? null)

  // Titel der Seite an die gewaehlte Wahl koppeln
  useEffect(() => {
    const name = data?.wahl ? (lang === 'de' ? data.wahl.name_de : data.wahl.name_en) : null
    if (name) document.title = `${t('electionPollsTitle')} — ${name}`
  }, [data, lang, t])

  const letzteZehn = useMemo(() => [...umfragen].reverse().slice(0, 10), [umfragen])

  return (
    <div>
      <PageHeader
        title={t('electionPollsTitle')}
        subtitle={t('electionPollsSubtitle')}
      />
      <ElectionsSubNav />

      {/* --- Wahl-Auswahl --- */}
      <div
        style={{
          display: 'flex',
          gap: spacing.sm,
          flexWrap: 'wrap',
          marginBottom: spacing.lg,
        }}
      >
        {wahlen.map((w) => {
          const active = w.slug === wahlSlug
          return (
            <button
              key={w.slug}
              type="button"
              onClick={() => setParam('wahl', w.slug)}
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.75rem',
                letterSpacing: '0.03em',
                padding: '12px 14px',
                minHeight: 44,
                cursor: 'pointer',
                borderRadius: 6,
                border: `1px solid ${active ? c.red : c.border}`,
                background: active ? c.red : c.bg,
                color: active ? '#FFFFFF' : c.inkSoft,
                fontWeight: active ? 700 : 400,
              }}
            >
              {lang === 'de' ? w.name_de : w.name_en}
              <span style={{ opacity: 0.7 }}> · {w.umfragen}</span>
            </button>
          )
        })}
      </div>

      {(loading || listeLoading) && <LoadingSpinner />}
      {error && <EmptyState text={t('electionPollsError')} />}

      {!loading && !error && data && (
        <>
          {/* --- Kennzahlen --- */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: narrow
                ? 'repeat(2, minmax(0,1fr))'
                : 'repeat(4, minmax(0,1fr))',
              gap: spacing.sm,
              marginBottom: spacing.lg,
            }}
          >
            <StatTile
              label={t('electionPollsElectionDay')}
              value={formatDate(data.wahl.datum, lang)}
              sub={
                tage != null && tage >= 0
                  ? t('electionPollsDaysLeft').replace('{days}', String(tage))
                  : undefined
              }
            />
            <StatTile label={t('electionPollsCount')} value={umfragen.length} />
            <StatTile
              label={t('electionPollsLatest')}
              value={formatDate(neueste?.veroeffentlicht ?? null, lang)}
              sub={neueste?.institut}
            />
            <StatTile
              label={t('electionPollsLeading')}
              value={
                spitze ? (PARTY_LABELS[spitze.partei]?.[lang] ?? spitze.partei) : '—'
              }
              sub={
                spitze
                  ? `${spitze.wert.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`
                  : undefined
              }
            />
          </div>

          {/* --- Zeitreihe --- */}
          <DataCard
            header={
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontSize: '1.1rem',
                  color: c.ink,
                  margin: 0,
                }}
              >
                {t('electionPollsTrend')}
              </h2>
            }
          >
            {umfragen.length < 2 ? (
              <EmptyState text={t('electionPollsNoData')} />
            ) : (
              <>
                <PollTrendChart
                  data={umfragen}
                  parties={parteien}
                  lang={lang}
                  wahlDatum={data.wahl.datum}
                  height={narrow ? 300 : 380}
                />
                <p
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.7rem',
                    color: c.muted,
                    margin: 0,
                    marginTop: spacing.sm,
                  }}
                >
                  {t('electionPollsThresholdHint')}
                </p>
              </>
            )}
          </DataCard>

          {/* --- Institut-Filter --- */}
          {(data.institute?.length ?? 0) > 1 && (
            <div
              style={{
                display: 'flex',
                gap: spacing.xs,
                flexWrap: 'wrap',
                marginTop: spacing.lg,
              }}
            >
              {['', ...data.institute].map((inst) => {
                const active = inst === institut
                return (
                  <button
                    key={inst || 'all'}
                    type="button"
                    onClick={() => setParam('institut', inst || null)}
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: '0.72rem',
                      padding: '11px 12px',
                      minHeight: 44,
                      cursor: 'pointer',
                      borderRadius: 6,
                      border: `1px solid ${active ? c.red : c.border}`,
                      background: 'transparent',
                      color: active ? c.red : c.muted,
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {inst || t('electionPollsAllInstitutes')}
                  </button>
                )
              })}
            </div>
          )}

          {/* --- Letzte Umfragen: Tabelle, auf Mobile Card-Liste --- */}
          <div style={{ marginTop: spacing.lg }}>
            <h2
              style={{
                fontFamily: fonts.display,
                fontSize: '1.1rem',
                color: c.ink,
                marginBottom: spacing.sm,
              }}
            >
              {t('electionPollsRecent')}
            </h2>

            {narrow ? (
              <div style={{ display: 'grid', gap: spacing.sm }}>
                {letzteZehn.map((row) => (
                  <DataCard key={row.dawum_survey_id}>
                    <div
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: '0.72rem',
                        color: c.muted,
                        marginBottom: spacing.xs,
                      }}
                    >
                      {formatDate(row.veroeffentlicht, lang)} · {row.institut}
                      {row.befragte ? ` · n=${row.befragte}` : ''}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                      {parteien.map((p) => {
                        const v = row[p]
                        if (typeof v !== 'number') return null
                        return (
                          <span
                            key={p}
                            style={{
                              fontFamily: fonts.mono,
                              fontSize: '0.78rem',
                              color: c.ink,
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                marginRight: 4,
                                background: partyColors[p] ?? partyColors.other,
                              }}
                            />
                            {PARTY_LABELS[p]?.[lang] ?? p} {v}
                          </span>
                        )
                      })}
                    </div>
                  </DataCard>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: fonts.mono,
                    fontSize: '0.8rem',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                      <th style={{ textAlign: 'left', padding: spacing.sm, color: c.muted }}>
                        {t('electionPollsPublished')}
                      </th>
                      <th style={{ textAlign: 'left', padding: spacing.sm, color: c.muted }}>
                        {t('electionPollsInstitute')}
                      </th>
                      {parteien.map((p) => (
                        <th
                          key={p}
                          style={{ textAlign: 'right', padding: spacing.sm, color: c.muted }}
                        >
                          {PARTY_LABELS[p]?.[lang] ?? p}
                        </th>
                      ))}
                      <th style={{ textAlign: 'right', padding: spacing.sm, color: c.muted }}>
                        n
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {letzteZehn.map((row) => (
                      <tr
                        key={row.dawum_survey_id}
                        style={{ borderBottom: `1px solid ${c.border}` }}
                      >
                        <td style={{ padding: spacing.sm, color: c.inkSoft }}>
                          {formatDate(row.veroeffentlicht, lang)}
                        </td>
                        <td style={{ padding: spacing.sm, color: c.inkSoft }}>
                          {row.institut}
                        </td>
                        {parteien.map((p) => {
                          const v = row[p]
                          return (
                            <td
                              key={p}
                              style={{
                                padding: spacing.sm,
                                textAlign: 'right',
                                color: c.ink,
                              }}
                            >
                              {typeof v === 'number' ? v : '—'}
                            </td>
                          )
                        })}
                        <td
                          style={{
                            padding: spacing.sm,
                            textAlign: 'right',
                            color: c.muted,
                          }}
                        >
                          {row.befragte ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <SourceNote quelle={data.quelle} />
        </>
      )}
    </div>
  )
}
