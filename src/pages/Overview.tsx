import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  DataCard,
  LoadingSpinner,
  PageHeader,
  StatWidget,
  useTheme,
} from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'

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

function trunc(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, Math.max(0, max - 3))}...`
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
  const recentPolls = Array.isArray(latestPolls) ? latestPolls.slice(0, 3) : []
  const recentGesetze = Array.isArray(gesetzeRows) ? gesetzeRows.slice(0, 3) : []
  const euItems = useMemo(() => euItemsFromResponse(euListRaw), [euListRaw])

  const FEATURES = [
    {
      title: t('featureElectionsTitle'),
      description: t('featureElectionsDesc'),
      href: '/wahlen',
      icon: '🗳️',
      tag: t('tagGermany'),
    },
    {
      title: t('featureBundestagTitle'),
      description: t('featureBundestagDesc'),
      href: '/bundestag',
      icon: '🏛️',
      tag: t('tagGermany'),
    },
    {
      title: t('featureLegislationTitle'),
      description: t('featureLegislationDesc'),
      href: '/gesetzgebung',
      icon: '§',
      tag: t('tagGermany'),
    },
    {
      title: t('featureCoalitionTitle'),
      description: t('featureCoalitionDesc'),
      href: '/koalitionsvertrag',
      icon: '✓',
      tag: t('tagGermany'),
    },
    {
      title: t('featureLobbyTitle'),
      description: t('featureLobbyDesc'),
      href: '/lobbyregister',
      icon: '🏢',
      tag: t('tagGermany'),
    },
    {
      title: t('featureWorldMapTitle'),
      description: t('featureWorldMapDesc'),
      href: '/weltkarte',
      icon: '🌍',
      tag: t('tagWorld'),
    },
    {
      title: t('featureEuLawTitle'),
      description: t('featureEuLawDesc'),
      href: '/eu-recht',
      icon: '⚖️',
      tag: t('tagEurope'),
    },
    {
      title: t('featureEuParliamentTitle'),
      description: t('featureEuParliamentDesc'),
      href: '/eu-parlament',
      icon: '🇪🇺',
      tag: t('tagEurope'),
    },
  ] as const

  const tagVariant = (tag: string) => {
    if (tag === t('tagGermany')) return 'no' as const
    if (tag === t('tagEurope')) return 'blue' as const
    return 'yes' as const
  }

  const viewAllLink = (path: string, label: string) => (
    <button
      type="button"
      onClick={() => navigate(path)}
      style={{
        fontFamily: fonts.mono,
        fontSize: '0.75rem',
        color: c.red,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        minHeight: 44,
      }}
    >
      {label} →
    </button>
  )

  return (
    <>
      <PageHeader title={t('overviewHeroTitle')} subtitle={t('dashboardSubtitle')} />

      {/* Hero: stat cards */}
      <section style={{ marginBottom: spacing.xxl }}>
        <p
          style={{
            margin: `0 0 ${spacing.lg}px 0`,
            fontFamily: fonts.body,
            fontSize: '0.95rem',
            lineHeight: 1.55,
            color: c.inkSoft,
            maxWidth: 900,
          }}
        >
          {t('overviewIntro')}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
            gap: spacing.md,
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
      </section>

      {/* Feature grid */}
      <section style={{ marginBottom: spacing.xxl }}>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: '1.15rem',
            fontWeight: 700,
            color: c.ink,
            margin: `0 0 ${spacing.md}px 0`,
          }}
        >
          {t('overviewFeaturesTitle')}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: spacing.md,
          }}
        >
          {FEATURES.map((f, idx) => {
            const isLastOrphan = FEATURES.length % 3 === 1 && idx === FEATURES.length - 1
            return (
              <div
                key={f.href}
                style={
                  isLastOrphan
                    ? {
                        gridColumn: '1 / -1',
                        justifySelf: 'center',
                        width: '100%',
                        maxWidth: 360,
                      }
                    : undefined
                }
              >
                <DataCard onClick={() => navigate(f.href)}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md }}>
                      <Badge text={f.tag} variant={tagVariant(f.tag)} />
                      <span
                        aria-hidden
                        style={{
                          fontFamily: fonts.body,
                          fontSize: '1.25rem',
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                      >
                        {f.icon}
                      </span>
                    </div>

                    <div>
                      <h3
                        style={{
                          fontFamily: fonts.body,
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: c.ink,
                          margin: 0,
                          lineHeight: 1.25,
                        }}
                      >
                        {f.title}
                      </h3>
                      <p
                        style={{
                          fontFamily: fonts.body,
                          fontSize: '0.9rem',
                          color: c.inkSoft,
                          margin: `${spacing.sm}px 0 0`,
                          lineHeight: 1.45,
                        }}
                      >
                        {f.description}
                      </p>
                    </div>
                  </div>
                </DataCard>
              </div>
            )
          })}
        </div>
      </section>

      {/* Live preview */}
      <section style={{ marginBottom: spacing.xxl }}>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: '1.15rem',
            fontWeight: 700,
            color: c.ink,
            margin: `0 0 ${spacing.md}px 0`,
          }}
        >
          {t('overviewLiveTitle')}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: spacing.md,
            alignItems: 'start',
          }}
        >
          <DataCard
            header={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                <span style={{ fontFamily: fonts.mono, fontSize: '0.75rem', color: c.muted }}>
                  {t('recentVotes')}
                </span>
              </div>
            }
          >
            {pollsLoading ? (
              <LoadingSpinner />
            ) : pollsError ? (
              <p style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted, margin: 0 }}>
                {t('dataLoadError')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {recentPolls.map((poll) => (
                  <button
                    key={poll.poll_id}
                    type="button"
                    onClick={() => navigate(`/bundestag/${poll.poll_id}`)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: spacing.md,
                      alignItems: 'flex-start',
                      fontFamily: fonts.body,
                      textAlign: 'left',
                      background: 'none',
                      border: `1px solid ${c.border}`,
                      borderRadius: 8,
                      padding: spacing.md,
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: c.ink, lineHeight: 1.3 }}>
                      {poll.poll_titel}
                    </span>
                    <span style={{ fontFamily: fonts.mono, fontSize: '0.7rem', color: c.muted, flexShrink: 0 }}>
                      {fmtDate(poll.poll_datum, lang)}
                    </span>
                  </button>
                ))}
                {viewAllLink('/bundestag', t('overviewViewAll'))}
              </div>
            )}
          </DataCard>

          <DataCard
            header={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                <span style={{ fontFamily: fonts.mono, fontSize: '0.75rem', color: c.muted }}>
                  {t('overviewLiveLawsTitle')}
                </span>
              </div>
            }
          >
            {gesetzeLoading ? (
              <LoadingSpinner />
            ) : gesetzeError ? (
              <p style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted, margin: 0 }}>
                {t('dataLoadError')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {recentGesetze.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => navigate(`/gesetze/${row.id}`)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: spacing.md,
                      alignItems: 'flex-start',
                      fontFamily: fonts.body,
                      textAlign: 'left',
                      background: 'none',
                      border: `1px solid ${c.border}`,
                      borderRadius: 8,
                      padding: spacing.md,
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: c.ink, lineHeight: 1.3 }}>
                      {trunc(row.kuerzel, 60)}
                    </span>
                    <span style={{ fontFamily: fonts.mono, fontSize: '0.7rem', color: c.muted, flexShrink: 0 }}>
                      {fmtDate(row.datum, lang)}
                    </span>
                  </button>
                ))}
                {viewAllLink('/gesetze', t('overviewViewAll'))}
              </div>
            )}
          </DataCard>

          <DataCard
            header={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                <span style={{ fontFamily: fonts.mono, fontSize: '0.75rem', color: c.muted }}>
                  {t('overviewLiveEuActsTitle')}
                </span>
              </div>
            }
          >
            {euListLoading ? (
              <LoadingSpinner />
            ) : euListError ? (
              <p style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted, margin: 0 }}>
                {t('dataLoadError')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {euItems.map((item) => {
                  const title =
                    lang === 'de' ? item.titel_de || item.titel_en : item.titel_en || item.titel_de
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/eu-recht/${item.id}`)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: spacing.md,
                        alignItems: 'flex-start',
                        fontFamily: fonts.body,
                        textAlign: 'left',
                        background: 'none',
                        border: `1px solid ${c.border}`,
                        borderRadius: 8,
                        padding: spacing.md,
                        cursor: 'pointer',
                        minHeight: 44,
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: c.ink, lineHeight: 1.3 }}>
                        {title}
                      </span>
                      <span style={{ fontFamily: fonts.mono, fontSize: '0.7rem', color: c.muted, flexShrink: 0 }}>
                        {fmtDate(item.datum, lang)}
                      </span>
                    </button>
                  )
                })}
                {viewAllLink('/eu-recht', t('overviewViewAll'))}
              </div>
            )}
          </DataCard>
        </div>
      </section>
    </>
  )
}
