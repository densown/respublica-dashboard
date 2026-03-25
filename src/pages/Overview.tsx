import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { PageHeader } from '../components/PageHeader';
import { StatWidget } from '../components/StatWidget';
import { SectionHeader } from '../components/SectionHeader';
import { DataCard } from '../components/DataCard';
import { Badge } from '../components/Badge';
import { ViewAllLink } from '../components/ViewAllLink';
import { ProgressBar } from '../components/ProgressBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { CSSProperties } from 'react';

interface GesetzeStats {
  gesetze_count: number;
  aenderungen_count: number;
}

interface EuStats {
  total: number;
}

interface Abstimmung {
  poll_id: number;
  poll_titel: string;
  poll_datum: string;
}

interface Gesetz {
  id: number;
  kuerzel?: string;
  zusammenfassung?: string;
  datum?: string;
  ki_generated?: boolean;
  poll_id?: number;
}

interface EuRechtsakt {
  id: number;
  titel: string;
  zusammenfassung?: string;
  typ?: string;
  rechtsgebiet?: string;
  datum?: string;
  celex?: string;
  eurlex_url?: string;
}

interface EuResponse {
  items: EuRechtsakt[];
}

const s: Record<string, CSSProperties> = {
  page: {
    maxWidth: 820,
    margin: '0 auto',
    padding: '40px 20px',
  },
  section: {
    marginBottom: 32,
  },
  statGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxWidth: 780,
  },
  voteRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteTitel: {
    fontFamily: "'Source Serif 4', 'Georgia', serif",
    fontSize: '0.92rem',
    fontWeight: 600,
    flex: 1,
    marginRight: 12,
  },
  dateMono: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.7rem',
    color: '#777',
    whiteSpace: 'nowrap',
  },
  gesetzHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  gesetzText: {
    fontFamily: "'Source Serif 4', 'Georgia', serif",
    fontSize: '0.85rem',
    lineHeight: 1.5,
    margin: 0,
  },
  aiHint: {
    fontSize: '0.6rem',
    fontStyle: 'italic',
    color: '#666',
    marginTop: 4,
  },
  euTitle: {
    fontFamily: "'Source Serif 4', 'Georgia', serif",
    fontSize: '0.92rem',
    fontWeight: 600,
    lineHeight: 1.4,
    margin: '6px 0',
  },
  euSummary: {
    fontSize: '0.85rem',
    color: '#aaa',
    lineHeight: 1.5,
    margin: '4px 0',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  euFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  celexLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.65rem',
    color: '#777',
  },
  eurLexLink: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.7rem',
    color: '#c0392b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'none',
  },
  koalitionSummary: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.75rem',
    color: '#999',
    marginTop: 10,
  },
  errorText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.8rem',
    color: '#777',
    padding: '16px 0',
  },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

function getEuTypBadgeVariant(typ?: string): 'blue' | 'amber' | 'muted' {
  if (!typ) return 'muted';
  const upper = typ.toUpperCase();
  if (upper.includes('REG') || upper === 'REGULATION') return 'blue';
  if (upper.includes('DIR') || upper === 'DIRECTIVE') return 'amber';
  return 'muted';
}

function getEuTypLabel(typ?: string): string {
  if (!typ) return 'OTHER';
  const upper = typ.toUpperCase();
  if (upper.includes('REG') || upper === 'REGULATION') return 'REG';
  if (upper.includes('DIR') || upper === 'DIRECTIVE') return 'DIR';
  if (upper.includes('DEC') || upper === 'DECISION') return 'DEC';
  return typ.toUpperCase();
}

export default function Overview() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const gesetzeStats = useApi<GesetzeStats>('/api/gesetze/stats');
  const urteile = useApi<unknown[]>('/api/urteile');
  const euStats = useApi<EuStats>('/api/eu-recht/stats');
  const abstimmungenCount = useApi<Abstimmung[]>('/api/abstimmungen/latest?limit=100');
  const abstimmungenLatest = useApi<Abstimmung[]>('/api/abstimmungen/latest?limit=5');
  const gesetze = useApi<Gesetz[]>('/api/gesetze');
  const euRecht = useApi<EuResponse>('/api/eu-recht?limit=3');

  const statValue = (loading: boolean, error: string | null, val: string | number | undefined) => {
    if (loading) return '...';
    if (error || val === undefined || val === null) return '-';
    return String(val);
  };

  const recentGesetze = gesetze.data?.slice(0, 3) ?? [];
  const euItems = euRecht.data?.items ?? [];

  return (
    <div style={s.page}>
      {/* Section 1: Page Header */}
      <PageHeader
        title={t('dashboardTitle')}
        subtitle={t('dashboardSubtitle')}
      />

      {/* Section 2: Stat Widgets */}
      <div style={s.section}>
        <div style={s.statGrid}>
          <StatWidget
            label={t('gesetze')}
            value={statValue(gesetzeStats.loading, gesetzeStats.error, gesetzeStats.data?.gesetze_count)}
            subText={
              gesetzeStats.data
                ? `${gesetzeStats.data.aenderungen_count} ${t('changesRecorded')}`
                : ''
            }
          />
          <StatWidget
            label={t('urteile')}
            value={statValue(urteile.loading, urteile.error, urteile.data?.length)}
            subText={t('federalCourts')}
          />
          <StatWidget
            label={t('euRechtsakte')}
            value={statValue(euStats.loading, euStats.error, euStats.data?.total)}
            subText={t('last12Months')}
          />
          <StatWidget
            label={t('abstimmungen')}
            value={statValue(abstimmungenCount.loading, abstimmungenCount.error, abstimmungenCount.data?.length)}
            subText={t('legislativePeriod')}
          />
        </div>
      </div>

      {/* Section 3: Recent Votes */}
      <div style={s.section}>
        <SectionHeader title={t('recentVotes')} />
        {abstimmungenLatest.loading ? (
          <LoadingSpinner />
        ) : abstimmungenLatest.error ? (
          <p style={s.errorText}>{t('loadError')}</p>
        ) : (
          <div style={s.cardList}>
            {(abstimmungenLatest.data ?? []).map((vote) => (
              <DataCard
                key={vote.poll_id}
                onClick={() => navigate(`/bundestag/${vote.poll_id}`)}
              >
                <div style={s.voteRow}>
                  <span style={s.voteTitel}>{vote.poll_titel}</span>
                  <span style={s.dateMono}>{formatDate(vote.poll_datum)}</span>
                </div>
              </DataCard>
            ))}
          </div>
        )}
        <ViewAllLink label={t('viewAllVotes')} to="/bundestag" />
      </div>

      {/* Section 4: Recent Legislative Changes */}
      <div style={s.section}>
        <SectionHeader title={t('recentChanges')} />
        {gesetze.loading ? (
          <LoadingSpinner />
        ) : gesetze.error ? (
          <p style={s.errorText}>{t('loadError')}</p>
        ) : (
          <div style={s.cardList}>
            {recentGesetze.map((g) => (
              <DataCard key={g.id} onClick={() => navigate(`/gesetze/${g.id}`)}>
                <div style={s.gesetzHeader}>
                  <div style={s.badgeRow}>
                    {g.kuerzel && <Badge text={g.kuerzel} />}
                    {g.poll_id && <Badge text={t('hasVoteData')} variant="green" />}
                  </div>
                  <span style={s.dateMono}>{formatDate(g.datum)}</span>
                </div>
                <p style={s.gesetzText}>
                  {g.zusammenfassung || t('summaryPending')}
                </p>
                {g.ki_generated && (
                  <div style={s.aiHint}>{t('aiDisclaimer')}</div>
                )}
              </DataCard>
            ))}
          </div>
        )}
        <ViewAllLink label={t('viewAllLaws')} to="/gesetze" />
      </div>

      {/* Section 5: EU Law */}
      <div style={s.section}>
        <SectionHeader title={t('euLaw')} />
        {euRecht.loading ? (
          <LoadingSpinner />
        ) : euRecht.error ? (
          <p style={s.errorText}>{t('loadError')}</p>
        ) : (
          <div style={s.cardList}>
            {euItems.map((eu) => (
              <DataCard key={eu.id} onClick={() => navigate(`/eu-recht/${eu.id}`)}>
                <div style={s.gesetzHeader}>
                  <div style={s.badgeRow}>
                    <Badge text={getEuTypLabel(eu.typ)} variant={getEuTypBadgeVariant(eu.typ)} />
                    {eu.rechtsgebiet && <Badge text={eu.rechtsgebiet} variant="dark" />}
                  </div>
                  <span style={s.dateMono}>{formatDate(eu.datum)}</span>
                </div>
                <div style={s.euTitle}>
                  {truncate(eu.titel || '', 150)}
                </div>
                {eu.zusammenfassung && (
                  <div style={s.euSummary}>{eu.zusammenfassung}</div>
                )}
                <div style={s.euFooter}>
                  <span style={s.celexLabel}>{eu.celex || ''}</span>
                  {eu.eurlex_url && (
                    <a
                      href={eu.eurlex_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={s.eurLexLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('viewOnEurLex')} →
                    </a>
                  )}
                </div>
              </DataCard>
            ))}
          </div>
        )}
        <ViewAllLink label={t('viewAllEu')} to="/eu-recht" />
      </div>

      {/* Section 6: Coalition Agreement */}
      <div style={s.section}>
        <SectionHeader title={t('coalitionAgreement')} />
        <ProgressBar
          segments={[
            { percent: 17, color: '#27ae60', label: `1 ${t('fulfilled')}` },
            { percent: 33, color: '#f0c040', label: `2 ${t('inProgress')}` },
            { percent: 50, color: '#555', label: `17 ${t('pending')}` },
          ]}
        />
        <div style={s.koalitionSummary}>
          20 {t('promises')}, 1 {t('fulfilled')}, 2 {t('inProgress')}
        </div>
        <ViewAllLink label={t('viewTracker')} to="/koalition" />
      </div>
    </div>
  );
}
