import { useMemo, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  DataCard,
  LoadingSpinner,
  PageHeader,
  ProgressBar,
  StatWidget,
  useTheme,
} from '../design-system'
import type { BadgeVariant } from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'

const COALITION_YELLOW = '#CA8A04'

type GesetzeStats = {
  gesetze_count: number
  aenderungen_count: number
}

type GesetzRow = {
  id: number
  kuerzel: string
  datum: string
  zusammenfassung: string | null
  poll_id: number | null
}

type PollLatest = {
  poll_id: number
  poll_titel: string
  poll_datum: string
}

type EuRechtRow = {
  id: number
  celex: string
  titel_de: string
  titel_en: string
  typ: string
  datum: string
  zusammenfassung: string | null
  rechtsgebiet: string
  eurlex_url: string
}

type EuStats = {
  total: number
}

/** Bis /api/abstimmungen/count (echter DB-Stand laut Produktion). */
const ABSTIMMUNGEN_STAT_COUNT = 258

function euItemsFromResponse(data: unknown): EuRechtRow[] {
  if (data == null) return []
  if (Array.isArray(data)) return data as EuRechtRow[]
  if (typeof data === 'object' && 'items' in data) {
    const raw = (data as { items: unknown }).items
    return Array.isArray(raw) ? (raw as EuRechtRow[]) : []
  }
  return []
}

function typVariant(typ: string): BadgeVariant {
  if (typ === 'REG') return 'blue'
  if (typ === 'DIR') return 'amber'
  return 'muted'
}

function trunc(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, Math.max(0, max - 3))}...`
}

function fmtDate(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function statValue(loading: boolean, error: string | null, n: number | null): string | number {
  if (loading) return '...'
  if (error) return '-'
  if (n === null) return '-'
  return n
}

export default function Overview() {
  const { c, t, lang } = useTheme()
  const navigate = useNavigate()

  const { data: gesetzeStats, loading: gStatsLoading, error: gStatsError } =
    useApi<GesetzeStats>('/api/gesetze/stats')
  const { data: urteile, loading: urtLoading, error: urtError } = useApi<unknown[]>(
    '/api/urteile',
  )
  const { data: euStats, loading: euStLoading, error: euStError } =
    useApi<EuStats>('/api/eu-recht/stats')
  const { data: latestPolls, loading: pollsLoading, error: pollsError } =
    useApi<PollLatest[]>('/api/abstimmungen/latest?limit=5')
  const { data: gesetzeRows, loading: gesetzeLoading, error: gesetzeError } =
    useApi<GesetzRow[]>('/api/gesetze')
  const { data: euListRaw, loading: euListLoading, error: euListError } =
    useApi<unknown>('/api/eu-recht?limit=3')

  const urteileCount = Array.isArray(urteile) ? urteile.length : null
  const recentPolls = Array.isArray(latestPolls) ? latestPolls : []
  const recentGesetze = Array.isArray(gesetzeRows) ? gesetzeRows.slice(0, 3) : []
  const euItems = useMemo(() => euItemsFromResponse(euListRaw), [euListRaw])

  const coalitionSegments = useMemo(
    () => [
      { pct: 17, color: c.yes },
      { pct: 33, color: COALITION_YELLOW },
      { pct: 50, color: c.absent },
    ],
    [c.yes, c.absent],
  )

  const section = (title: string) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: '1.15rem',
          fontWeight: 700,
          color: c.ink,
          margin: 0,
          flexShrink: 0,
        }}
      >
        {title}
      </h2>
      <div style={{ flex: 1, height: 1, background: c.border, minWidth: 24 }} />
    </div>
  )

  const viewAllBtn = (path: string, label: string) => (
    <button
      type="button"
      onClick={() => navigate(path)}
      style={{
        marginTop: 12,
        fontFamily: fonts.mono,
        fontSize: '0.75rem',
        color: c.red,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {label} →
    </button>
  )

  const listWrap: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxWidth: 780,
  }

  return (
    <>
      <PageHeader title="Demokratie" subtitle={t('dashboardSubtitle')} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: spacing.md,
          marginBottom: spacing.xxl,
        }}
      >
        <StatWidget
          label={t('lawsTracked')}
          value={statValue(
            gStatsLoading,
            gStatsError,
            gesetzeStats != null ? gesetzeStats.gesetze_count : null,
          )}
          sub={
            gStatsLoading
              ? '...'
              : gStatsError
                ? '-'
                : gesetzeStats != null
                  ? `${gesetzeStats.aenderungen_count} ${t('changesRecorded')}`
                  : '-'
          }
          icon={<span aria-hidden>◇</span>}
        />
        <StatWidget
          label={t('rulings')}
          value={statValue(urtLoading, urtError, urteileCount)}
          sub={t('courts')}
          icon={<span aria-hidden>◇</span>}
        />
        <StatWidget
          label={t('euActs')}
          value={statValue(euStLoading, euStError, euStats?.total ?? null)}
          sub={t('months12')}
          icon={<span aria-hidden>◇</span>}
        />
        <StatWidget
          label={t('votes')}
          value={ABSTIMMUNGEN_STAT_COUNT}
          sub={t('wp21')}
          icon={<span aria-hidden>◇</span>}
        />
      </div>

      <section style={{ marginBottom: spacing.xxl }}>
        {section(t('recentVotes'))}
        {pollsLoading ? (
          <LoadingSpinner />
        ) : pollsError ? (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.85rem',
              color: c.muted,
              margin: 0,
            }}
          >
            {t('dataLoadError')}
          </p>
        ) : (
          <>
            <div style={listWrap}>
              {recentPolls.map((poll) => (
                <DataCard
                  key={poll.poll_id}
                  onClick={() => navigate(`/bundestag/${poll.poll_id}`)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: spacing.md,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fonts.body,
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: c.ink,
                        lineHeight: 1.35,
                      }}
                    >
                      {poll.poll_titel}
                    </span>
                    <span
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: '0.7rem',
                        color: c.muted,
                        flexShrink: 0,
                      }}
                    >
                      {fmtDate(poll.poll_datum, lang)}
                    </span>
                  </div>
                </DataCard>
              ))}
            </div>
            {viewAllBtn('/bundestag', t('viewAllVotes'))}
          </>
        )}
      </section>

      <section style={{ marginBottom: spacing.xxl }}>
        {section(t('recentChanges'))}
        {gesetzeLoading ? (
          <LoadingSpinner />
        ) : gesetzeError ? (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.85rem',
              color: c.muted,
              margin: 0,
            }}
          >
            {t('dataLoadError')}
          </p>
        ) : (
          <>
            <div style={listWrap}>
              {recentGesetze.map((row) => (
                <DataCard key={row.id} onClick={() => navigate(`/gesetze/${row.id}`)}>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: spacing.sm,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }}>
                      <Badge text={row.kuerzel} variant="default" />
                      {row.poll_id != null && row.poll_id !== 0 ? (
                        <Badge text={t('hasVoteData')} variant="yes" />
                      ) : null}
                    </div>
                    <span
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: '0.7rem',
                        color: c.muted,
                      }}
                    >
                      {fmtDate(row.datum, lang)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: '0.85rem',
                      color: c.ink,
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {row.zusammenfassung?.trim()
                      ? row.zusammenfassung
                      : t('summaryPending')}
                  </p>
                  <p
                    style={{
                      marginTop: spacing.sm,
                      fontFamily: fonts.body,
                      fontSize: '0.6rem',
                      fontStyle: 'italic',
                      color: c.subtle,
                      marginBottom: 0,
                    }}
                  >
                    {t('aiHint')}
                  </p>
                </DataCard>
              ))}
            </div>
            {viewAllBtn('/gesetze', t('viewAllLaws'))}
          </>
        )}
      </section>

      <section style={{ marginBottom: spacing.xxl }}>
        {section(t('euLaw'))}
        {euListLoading ? (
          <LoadingSpinner />
        ) : euListError ? (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.85rem',
              color: c.muted,
              margin: 0,
            }}
          >
            {t('dataLoadError')}
          </p>
        ) : (
          <>
            <div style={listWrap}>
              {euItems.map((item) => {
                const title =
                  lang === 'de' ? item.titel_de || item.titel_en : item.titel_en || item.titel_de
                const summary = item.zusammenfassung?.trim() ?? ''
                return (
                  <DataCard
                    key={item.id}
                    onClick={() => navigate(`/eu-recht/${item.id}`)}
                    header={
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: spacing.sm,
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                          <Badge text={item.typ} variant={typVariant(item.typ)} />
                          <Badge text={item.rechtsgebiet} variant="default" />
                        </div>
                        <span
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: '0.7rem',
                            color: c.muted,
                          }}
                        >
                          {fmtDate(item.datum, lang)}
                        </span>
                      </div>
                    }
                    footer={
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: spacing.md,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: '0.65rem',
                            color: c.muted,
                          }}
                        >
                          {item.celex}
                        </span>
                        <a
                          href={item.eurlex_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: '0.75rem',
                            color: c.red,
                            textDecoration: 'none',
                          }}
                        >
                          {t('viewEurlex')} →
                        </a>
                      </div>
                    }
                  >
                    <p
                      style={{
                        fontFamily: fonts.body,
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: c.ink,
                        lineHeight: 1.35,
                        margin: 0,
                      }}
                    >
                      {trunc(title, 150)}
                    </p>
                    {summary ? (
                      <p
                        style={{
                          marginTop: spacing.sm,
                          fontFamily: fonts.body,
                          fontSize: '0.85rem',
                          color: c.inkSoft,
                          lineHeight: 1.45,
                          marginBottom: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical' as const,
                          overflow: 'hidden',
                        }}
                      >
                        {summary}
                      </p>
                    ) : null}
                  </DataCard>
                )
              })}
            </div>
            {viewAllBtn('/eu-recht', t('viewAllEu'))}
          </>
        )}
      </section>

      <section style={{ marginBottom: spacing.xxl }}>
        {section(t('coalition'))}
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: '0.85rem',
            color: c.muted,
            marginBottom: spacing.sm,
          }}
        >
          {t('coalitionTrackerBlurb')}
        </p>
        <ProgressBar segments={coalitionSegments} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.sm,
            marginTop: spacing.md,
          }}
        >
          {[
            { color: c.yes, label: t('fulfilled') },
            { color: COALITION_YELLOW, label: t('inProgress') },
            { color: c.absent, label: t('pending') },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                fontFamily: fonts.body,
                fontSize: '0.8rem',
                color: c.inkSoft,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: row.color,
                  flexShrink: 0,
                }}
                aria-hidden
              />
              {row.label}
            </div>
          ))}
        </div>
        {viewAllBtn('/koalition', t('viewTracker'))}
      </section>
    </>
  )
}
