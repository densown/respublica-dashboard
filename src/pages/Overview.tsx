import { useCallback, useMemo, useState } from 'react'
import {
  Badge,
  DataCard,
  EmptyState,
  FilterToolbar,
  LoadingSpinner,
  PageHeader,
  Pagination,
  ProgressBar,
  StatWidget,
  VoteBar,
  useTheme,
} from '../design-system'
import { fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'

function countList(data: unknown): number | null {
  if (Array.isArray(data)) return data.length
  return null
}

function countEuStats(data: unknown): number | null {
  if (data == null || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  for (const k of ['total', 'count', 'anzahl']) {
    const v = o[k]
    if (typeof v === 'number') return v
  }
  return null
}

function statDisplay(
  loading: boolean,
  error: string | null,
  n: number | null,
): string | number {
  if (loading) return '...'
  if (error) return '—'
  if (n === null) return '—'
  return n
}

export default function Overview() {
  const { c, t } = useTheme()
  const [page, setPage] = useState(2)

  const { data: gesetze, loading: lg, error: eg } = useApi<unknown[]>('/api/gesetze')
  const { data: urteile, loading: lu, error: eu } = useApi<unknown[]>('/api/urteile')
  const { data: euStats, loading: le, error: ee } = useApi<unknown>('/api/eu-recht/stats')
  const { data: abstimmungen, loading: la, error: ea } = useApi<unknown[]>(
    '/api/abstimmungen',
  )

  const demoShareUrl =
    typeof window !== 'undefined' ? window.location.href : 'https://app.respublica.media'

  const filterDefs = useMemo(
    () => [
      {
        label: t('type'),
        options: [
          { value: 'all', label: t('filterAll') },
          { value: 'reg', label: t('regulation') },
          { value: 'dir', label: t('directive') },
          { value: 'dec', label: t('decision') },
        ],
      },
      {
        label: t('legalArea'),
        options: [
          { value: 'all', label: t('filterAll') },
          { value: 'energy', label: t('filterEnergy') },
          { value: 'trade', label: t('filterTrade') },
          { value: 'digital', label: t('filterDigital') },
          { value: 'migration', label: t('filterMigration') },
        ],
      },
    ],
    [t],
  )

  const coalitionSegments = useMemo(
    () => [
      { pct: 17, color: c.yes },
      { pct: 33, color: c.abstain },
      { pct: 50, color: c.absent },
    ],
    [c],
  )

  const onPageChange = useCallback((p: number) => setPage(p), [])

  return (
    <>
      <PageHeader title="Demokratie" subtitle={t('overview')} />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
          marginBottom: spacing.xl,
        }}
      >
        <StatWidget
          label={t('lawsTracked')}
          value={statDisplay(lg, eg, countList(gesetze))}
          sub={t('months12')}
          icon={<span aria-hidden>◇</span>}
        />
        <StatWidget
          label={t('rulings')}
          value={statDisplay(lu, eu, countList(urteile))}
          sub={t('courts')}
          icon={<span aria-hidden>◇</span>}
        />
        <StatWidget
          label={t('euActs')}
          value={statDisplay(le, ee, countEuStats(euStats))}
          sub="EUR-Lex"
          icon={<span aria-hidden>◇</span>}
        />
        <StatWidget
          label={t('votes')}
          value={statDisplay(la, ea, countList(abstimmungen))}
          sub={t('wp21')}
          icon={<span aria-hidden>◇</span>}
        />
      </div>

      <FilterToolbar filters={filterDefs} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xl,
        }}
      >
        <DataCard
          header={
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: spacing.md,
                justifyContent: 'space-between',
              }}
            >
              <h2
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
                }}
              >
                {t('votes')}: Beispielabstimmung
              </h2>
              <Badge text={t('accepted')} variant="yes" />
            </div>
          }
        >
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.88rem',
              color: c.muted,
              marginBottom: spacing.lg,
            }}
          >
            {t('aiDisclaimer')}
          </p>
          <VoteBar label="CDU/CSU" labelColor={c.ink} ja={45} nein={12} enthalten={3} abwesend={2} />
          <VoteBar label="SPD" labelColor={c.red} ja={38} nein={18} enthalten={4} abwesend={2} />
          <VoteBar label="Grüne" labelColor={c.yes} ja={41} nein={8} enthalten={6} abwesend={1} />
          <VoteBar label="AfD" labelColor={c.muted} ja={2} nein={48} enthalten={0} abwesend={6} />
        </DataCard>

        <DataCard>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing.md,
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Badge text={t('regulation')} variant="blue" />
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.75rem',
                color: c.muted,
              }}
            >
              CELEX 32021R0644
            </span>
          </div>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.95rem',
              marginBottom: spacing.md,
              lineHeight: 1.5,
            }}
          >
            Digital Markets Act (DMA), Auszug Demo. {t('aiDisclaimer')}
          </p>
          <a
            href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32021R0644"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.72rem',
              color: c.red,
              textDecoration: 'none',
            }}
          >
            {t('viewEurlex')} →
          </a>
        </DataCard>

        <section>
          <h3
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: '1.15rem',
              marginBottom: spacing.md,
            }}
          >
            {t('coalition')}
          </h3>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.85rem',
              color: c.muted,
              marginBottom: spacing.sm,
            }}
          >
            17% {t('fulfilled')} · 33% {t('inProgress')} · 50% {t('pending')}
          </p>
          <ProgressBar segments={coalitionSegments} />
        </section>

        <Pagination current={page} total={5} onChange={onPageChange} />

        <details
          style={{
            marginTop: spacing.xl,
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            padding: spacing.md,
            background: c.bgAlt,
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: '1rem',
              color: c.ink,
            }}
          >
            {t('componentShowcase')}
          </summary>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: spacing.lg,
              marginTop: spacing.lg,
            }}
          >
            <div
              style={{
                border: `1px dashed ${c.border}`,
                borderRadius: 8,
              }}
            >
              <LoadingSpinner />
            </div>
            <div
              style={{
                border: `1px dashed ${c.border}`,
                borderRadius: 8,
              }}
            >
              <EmptyState
                text={t('emptyStateDemo')}
                action={{
                  label: t('copyLink'),
                  onClick: () => {
                    void navigator.clipboard.writeText(demoShareUrl)
                  },
                }}
              />
            </div>
          </div>
        </details>
      </div>
    </>
  )
}
