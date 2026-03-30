import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
} from 'react'
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Pagination,
  StatWidget,
  useTheme,
} from '../design-system'
import type { I18nKey } from '../design-system/i18n'
import { GesetzDetail } from '../components/gesetze/GesetzDetail'
import { UrteilCard } from '../components/gesetze/UrteilCard'
import type { Gesetz, GesetzeStats, Urteil } from '../components/gesetze/types'
import {
  URTEIL_RECHTSGEBIET_OPTIONS,
  buildUrteilListEndpoint,
  formatDisplayDate,
  parseIsoDate,
  rechtGebietFromKuerzel,
  type RechtGebietFilter,
} from '../components/gesetze/utils'
import { breakpoints, fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'

const transition = 'cubic-bezier(0.4, 0, 0.2, 1)'
const PAGE_SIZE = 20

const COURT_VALUES = [
  'BVerfG',
  'BGH',
  'BVerwG',
  'BAG',
  'BSG',
  'BFH',
  'BPatG',
] as const

type GesetzSort = 'new' | 'old' | 'az'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.innerWidth < breakpoints.mobile,
  )

  useEffect(() => {
    const onResize = () =>
      setIsMobile(window.innerWidth < breakpoints.mobile)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isMobile
}

function normalizeGesetzeList(raw: unknown): Gesetz[] {
  if (Array.isArray(raw)) return raw as Gesetz[]
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.gesetze)) return o.gesetze as Gesetz[]
    if (Array.isArray(o.data)) return o.data as Gesetz[]
    if (Array.isArray(o.items)) return o.items as Gesetz[]
  }
  return []
}

function normalizeUrteileList(raw: unknown): Urteil[] {
  if (Array.isArray(raw)) return raw as Urteil[]
  return []
}

function urteilReferencesGesetz(u: Urteil, kuerzel: string): boolean {
  const k = kuerzel.trim().toLowerCase()
  if (!k) return false
  const refs = u.gesetze
  if (!Array.isArray(refs)) return false
  return refs.some(
    (x) => typeof x === 'string' && x.trim().toLowerCase() === k,
  )
}

function sublineZusammenfassung(g: Gesetz): string {
  const z = (g.zusammenfassung ?? '').trim()
  if (!z) return ''
  return z.length > 80 ? `${z.slice(0, 80).trim()}…` : z
}

function parseDatumMs(s: string | null | undefined): number {
  if (!s) return 0
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : 0
}

const DOMAIN_OPTIONS: {
  value: RechtGebietFilter
  labelKey: I18nKey
}[] = [
  { value: 'zivil', labelKey: 'gesetzeBadgeZivil' },
  { value: 'straf', labelKey: 'gesetzeBadgeStraf' },
  { value: 'sozial', labelKey: 'gesetzeBadgeSozial' },
  { value: 'verfassung', labelKey: 'gesetzeBadgeVerfassung' },
  { value: 'steuer_arbeit', labelKey: 'gesetzeBadgeSteuerArbeit' },
  { value: 'bundes', labelKey: 'gesetzeBadgeBundes' },
]

function LegislationWelcome({
  stats,
  statsLoading,
  statsError,
}: {
  stats: GesetzeStats | null
  statsLoading: boolean
  statsError: string | null
}) {
  const { c, t } = useTheme()

  const lawsVal =
    statsLoading || statsError
      ? statsLoading
        ? '…'
        : '—'
      : stats?.gesetze_count ?? '—'
  const changesVal =
    statsLoading || statsError
      ? statsLoading
        ? '…'
        : '—'
      : stats?.aenderungen_count ?? '—'

  return (
    <div
      style={{
        padding: spacing.xl,
        paddingLeft: spacing.xl + spacing.sm,
        maxWidth: 560,
      }}
    >
      <h2
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: 'clamp(1.45rem, 2.8vw, 1.85rem)',
          color: c.ink,
          lineHeight: 1.15,
          marginBottom: spacing.md,
        }}
      >
        {t('legislationWelcomeTitle')}
      </h2>
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: '1.02rem',
          lineHeight: 1.65,
          color: c.muted,
          marginBottom: spacing.xl,
        }}
      >
        {t('legislationWelcomeBody')}
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
        }}
      >
        <StatWidget label={t('statLawsShort')} value={lawsVal} />
        <StatWidget label={t('statChangesShort')} value={changesVal} />
      </div>
    </div>
  )
}

export default function Legislation() {
  const { id: idParam } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { c, t, lang } = useTheme()
  const isMobile = useIsMobile()

  const mainTab =
    searchParams.get('tab') === 'urteile' ? 'urteile' : 'gesetze'

  const idTrimmed = idParam?.trim() ?? ''
  const showWelcome = mainTab === 'gesetze' && idTrimmed === ''

  const [mobileTab, setMobileTab] = useState<'list' | 'detail'>('list')
  const [gesetzSearch, setGesetzSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState<
    'all' | RechtGebietFilter
  >('all')
  const [gesetzSort, setGesetzSort] = useState<GesetzSort>('new')
  const [gesetzPage, setGesetzPage] = useState(1)
  const [hoveredListId, setHoveredListId] = useState<number | null>(null)

  const [urteilSearch, setUrteilSearch] = useState('')
  const [urteilCourt, setUrteilCourt] = useState<string>('all')
  const [urteilRg, setUrteilRg] = useState<string>('all')
  const [urteilTime, setUrteilTime] = useState<
    '30d' | '3m' | '1y' | 'all'
  >('all')
  const [urteilSortNewest, setUrteilSortNewest] = useState(true)
  const [urteilPage, setUrteilPage] = useState(1)

  const activeNumericId = useMemo(() => {
    if (idTrimmed === '') return NaN
    const n = Number.parseInt(idTrimmed, 10)
    return Number.isFinite(n) ? n : NaN
  }, [idTrimmed])
  const hasValidId = Number.isFinite(activeNumericId)

  const detailEndpoint =
    mainTab === 'gesetze' && idTrimmed !== ''
      ? `/api/gesetze/${encodeURIComponent(idTrimmed)}`
      : ''

  const { data: rawList, loading: loadingList, error: errList } =
    useApi<unknown>('/api/gesetze')
  const list = useMemo(
    () => normalizeGesetzeList(rawList),
    [rawList],
  )

  const {
    data: detail,
    loading: loadingDetail,
    error: errDetail,
  } = useApi<Gesetz>(detailEndpoint)

  const { data: stats, loading: statsLoading, error: statsError } =
    useApi<GesetzeStats>('/api/gesetze/stats')

  const urteilEndpoint = useMemo(
    () =>
      mainTab === 'urteile'
        ? buildUrteilListEndpoint(urteilCourt, urteilRg)
        : '/api/urteile',
    [mainTab, urteilCourt, urteilRg],
  )

  const {
    data: rawUrteile,
    loading: loadingUrteile,
    error: errUrteile,
  } = useApi<unknown>(urteilEndpoint)

  const urteileBase = useMemo(
    () => normalizeUrteileList(rawUrteile),
    [rawUrteile],
  )

  useEffect(() => {
    if (!isMobile) return
    if (mainTab === 'gesetze' && idTrimmed !== '') {
      setMobileTab('detail')
    } else {
      setMobileTab('list')
    }
  }, [isMobile, mainTab, idTrimmed])

  const setTabUrteile = useCallback(() => {
    navigate({ pathname: '/gesetze', search: '?tab=urteile' })
  }, [navigate])

  const onPickGesetz = useCallback(
    (id: number) => {
      navigate(`/gesetze/${id}`)
      if (isMobile) setMobileTab('detail')
    },
    [navigate, isMobile],
  )

  const onGesetzBadgeFromUrteil = useCallback(
    (kuerzel: string) => {
      setGesetzSearch(kuerzel.trim())
      navigate('/gesetze')
      setGesetzPage(1)
    },
    [navigate],
  )

  const filteredGesetze = useMemo(() => {
    let rows = list.slice()
    if (domainFilter !== 'all') {
      rows = rows.filter(
        (g) => rechtGebietFromKuerzel(g.kuerzel) === domainFilter,
      )
    }
    const q = gesetzSearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter((g) => {
        const ku = (g.kuerzel ?? '').toLowerCase()
        const zu = (g.zusammenfassung ?? '').toLowerCase()
        return ku.includes(q) || zu.includes(q)
      })
    }
    const sorted = [...rows]
    if (gesetzSort === 'new') {
      sorted.sort(
        (a, b) => parseDatumMs(b.datum) - parseDatumMs(a.datum),
      )
    } else if (gesetzSort === 'old') {
      sorted.sort(
        (a, b) => parseDatumMs(a.datum) - parseDatumMs(b.datum),
      )
    } else {
      sorted.sort((a, b) =>
        (a.kuerzel ?? '').localeCompare(b.kuerzel ?? '', 'de', {
          sensitivity: 'base',
        }),
      )
    }
    return sorted
  }, [list, domainFilter, gesetzSearch, gesetzSort])

  useEffect(() => {
    setGesetzPage(1)
  }, [domainFilter, gesetzSearch, gesetzSort])

  const gesetzTotalPages = Math.max(
    1,
    Math.ceil(filteredGesetze.length / PAGE_SIZE),
  )
  const gesetzPageClamped = Math.min(gesetzPage, gesetzTotalPages)
  const gesetzSlice = useMemo(() => {
    const start = (gesetzPageClamped - 1) * PAGE_SIZE
    return filteredGesetze.slice(start, start + PAGE_SIZE)
  }, [filteredGesetze, gesetzPageClamped])

  const listEntry = useMemo(() => {
    if (!hasValidId) return null
    return list.find((g) => g.id === activeNumericId) ?? null
  }, [list, hasValidId, activeNumericId])

  const gesetzMerged = useMemo((): Gesetz | null => {
    if (!hasValidId) return null
    if (detail != null && detail.id === activeNumericId) {
      return { ...(listEntry ?? {}), ...detail } as Gesetz
    }
    return listEntry
  }, [detail, listEntry, hasValidId, activeNumericId])

  const linkedUrteile = useMemo(() => {
    const ku = gesetzMerged?.kuerzel?.trim() ?? ''
    if (!ku) return []
    return urteileBase.filter((u) => urteilReferencesGesetz(u, ku))
  }, [gesetzMerged, urteileBase])

  const listReady = !loadingList && !errList
  const showNotFound = hasValidId && listReady && listEntry == null

  const showDetailSpinner =
    hasValidId &&
    (loadingList || (Boolean(errList) && loadingDetail && detail == null))

  const errorForDetail =
    showNotFound || gesetzMerged != null
      ? null
      : detailEndpoint && errDetail
        ? errDetail
        : null

  const filteredUrteile = useMemo(() => {
    let rows = urteileBase.slice()
    const q = urteilSearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter((u) => {
        const az = (u.aktenzeichen ?? '').toLowerCase()
        const zu = (u.zusammenfassung ?? '').toLowerCase()
        const ls = (u.leitsatz ?? '').toLowerCase()
        return (
          az.includes(q) || zu.includes(q) || ls.includes(q)
        )
      })
    }
    if (urteilTime !== 'all') {
      const now = new Date()
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      )
      const days =
        urteilTime === '30d' ? 30 : urteilTime === '3m' ? 90 : 365
      const threshold = new Date(
        todayStart.getTime() - days * 24 * 60 * 60 * 1000,
      )
      rows = rows.filter((u) => {
        const dt = parseIsoDate(u.datum ?? null)
        if (!dt) return false
        const ds = new Date(
          dt.getFullYear(),
          dt.getMonth(),
          dt.getDate(),
        )
        return ds.getTime() >= threshold.getTime()
      })
    }
    rows.sort((a, b) => {
      const ta = parseDatumMs(a.datum ?? null)
      const tb = parseDatumMs(b.datum ?? null)
      return urteilSortNewest ? tb - ta : ta - tb
    })
    return rows
  }, [
    urteileBase,
    urteilSearch,
    urteilTime,
    urteilSortNewest,
  ])

  useEffect(() => {
    setUrteilPage(1)
  }, [
    urteilSearch,
    urteilCourt,
    urteilRg,
    urteilTime,
    urteilSortNewest,
    mainTab,
  ])

  const urteilTotalPages = Math.max(
    1,
    Math.ceil(filteredUrteile.length / PAGE_SIZE),
  )
  const urteilPageClamped = Math.min(urteilPage, urteilTotalPages)
  const urteilSlice = useMemo(() => {
    const start = (urteilPageClamped - 1) * PAGE_SIZE
    return filteredUrteile.slice(start, start + PAGE_SIZE)
  }, [filteredUrteile, urteilPageClamped])

  const inputStyle = useMemo(
    () => ({
      flex: 1,
      minWidth: 0,
      boxSizing: 'border-box' as const,
      padding: `${spacing.md}px ${spacing.lg}px`,
      border: `1px solid ${c.inputBorder}`,
      borderRadius: 6,
      background: c.inputBg,
      color: c.ink,
      fontFamily: fonts.body,
      fontSize: '0.9rem',
      outline: 'none' as const,
      transition: `border-color 0.2s ${transition}, box-shadow 0.2s ${transition}`,
    }),
    [c],
  )

  const legislationSelectArrow = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="${c.muted}" stroke-width="1.5" stroke-linecap="round"/></svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  }, [c.muted])

  const selectStyle = useMemo(
    () => ({
      boxSizing: 'border-box' as const,
      padding: `${spacing.sm}px ${spacing.xl}px ${spacing.sm}px ${spacing.md}px`,
      borderRadius: 6,
      outline: 'none' as const,
      borderStyle: 'solid' as const,
      borderWidth: '1px',
      borderColor: c.border,
      WebkitAppearance: 'none' as const,
      MozAppearance: 'none' as const,
      appearance: 'none' as const,
      backgroundImage: legislationSelectArrow,
      backgroundColor: c.cardBg,
      backgroundRepeat: 'no-repeat' as const,
      backgroundPosition: 'right 10px center',
      color: c.ink,
      fontFamily: fonts.body,
      fontSize: '0.78rem',
      cursor: 'pointer' as const,
      minWidth: 120,
    }),
    [c, legislationSelectArrow],
  )

  const selectFocusHandlers = useMemo(
    () => ({
      onFocus: (e: FocusEvent<HTMLSelectElement>) => {
        e.target.style.borderColor = c.red
        e.target.style.borderStyle = 'solid'
      },
      onBlur: (e: FocusEvent<HTMLSelectElement>) => {
        e.target.style.borderColor = c.border
        e.target.style.borderStyle = 'solid'
      },
    }),
    [c.red, c.border],
  )

  const urteilSortBtnBase = useMemo(
    () => ({
      padding: `${spacing.sm}px ${spacing.md}px`,
      borderRadius: 6,
      outline: 'none' as const,
      borderStyle: 'solid' as const,
      borderWidth: '1px',
      borderColor: c.border,
      backgroundColor: c.cardBg,
      color: c.ink,
      fontFamily: fonts.mono,
      fontSize: '0.78rem',
      cursor: 'pointer' as const,
      minWidth: 44,
    }),
    [c],
  )

  const tabBtn = (tab: 'gesetze' | 'urteile', label: string) => {
    const active = mainTab === tab
    return (
      <button
        key={tab}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() =>
          tab === 'gesetze' ? navigate('/gesetze') : setTabUrteile()
        }
        style={{
          padding: `${spacing.md}px ${spacing.lg}px`,
          borderRadius: 6,
          border: `1px solid ${active ? c.red : c.border}`,
          background: active ? c.bgHover : c.bgAlt,
          color: active ? c.red : c.muted,
          fontFamily: fonts.mono,
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          cursor: 'pointer',
          transition: `border-color 0.2s ${transition}, background 0.2s ${transition}, color 0.2s ${transition}`,
        }}
      >
        {label}
      </button>
    )
  }

  const listPanel = (
    <aside
      style={{
        flex: isMobile ? 'none' : '0 0 40%',
        width: isMobile ? '100%' : undefined,
        maxWidth: isMobile ? '100%' : '42%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        borderRight: isMobile ? 'none' : `1px solid ${c.border}`,
        borderBottom: isMobile ? `1px solid ${c.border}` : 'none',
        background: c.bgAlt,
      }}
    >
      <style>{`
        .gesetze-list-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${c.subtle} transparent;
        }
        .gesetze-list-scroll::-webkit-scrollbar { width: 6px; }
        .gesetze-list-scroll::-webkit-scrollbar-track { background: transparent; }
        .gesetze-list-scroll::-webkit-scrollbar-thumb {
          background: ${c.subtle};
          border-radius: 4px;
        }
      `}</style>
      <div style={{ padding: spacing.lg, flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              flex: '1 1 160px',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.52rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: c.muted,
              }}
            >
              {t('gesetzeSearchAriaLabel')}
            </span>
            <input
              type="search"
              value={gesetzSearch}
              onChange={(e) => setGesetzSearch(e.target.value)}
              placeholder={t('gesetzeSearchPlaceholder')}
              aria-label={t('gesetzeSearchAriaLabel')}
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = c.red
                e.target.style.boxShadow = `0 0 0 2px ${c.red}33`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = c.inputBorder
                e.target.style.boxShadow = 'none'
              }}
            />
          </label>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.52rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: c.muted,
              }}
            >
              {t('gesetzeToolbarDomain')}
            </span>
            <select
              value={domainFilter}
              onChange={(e) =>
                setDomainFilter(e.target.value as typeof domainFilter)
              }
              aria-label={t('gesetzeToolbarDomain')}
              style={selectStyle}
              {...selectFocusHandlers}
            >
              <option value="all">{t('filterAll')}</option>
              {DOMAIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.52rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: c.muted,
              }}
            >
              {t('gesetzeSortLabel')}
            </span>
            <select
              value={gesetzSort}
              onChange={(e) =>
                setGesetzSort(e.target.value as GesetzSort)
              }
              style={selectStyle}
              {...selectFocusHandlers}
            >
              <option value="new">{t('gesetzeSortNewest')}</option>
              <option value="old">{t('gesetzeSortOldest')}</option>
              <option value="az">{t('gesetzeSortAlphabetical')}</option>
            </select>
          </label>
        </div>
      </div>
      {errList ? (
        <p
          style={{
            padding: `0 ${spacing.lg}px`,
            color: c.no,
            fontFamily: fonts.body,
            fontSize: '0.88rem',
          }}
        >
          {t('dataLoadError')}
        </p>
      ) : null}
      {loadingList ? (
        <LoadingSpinner />
      ) : !list.length ? (
        <EmptyState text={t('gesetzeEmpty')} />
      ) : (
        <>
          <ul
            role="list"
            className="gesetze-list-scroll"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: `0 0 ${spacing.lg}px`,
              overflowY: 'auto',
              flex: 1,
              minHeight: isMobile ? 280 : 0,
              maxHeight: isMobile
                ? 'min(55vh, 420px)'
                : 'calc(100vh - 280px)',
            }}
          >
            {!filteredGesetze.length ? (
              <li
                style={{
                  padding: `0 ${spacing.lg}px`,
                  fontFamily: fonts.body,
                  color: c.muted,
                  fontSize: '0.9rem',
                }}
              >
                {t('gesetzeFilterEmpty')}
              </li>
            ) : (
              gesetzSlice.map((g) => {
                const active = hasValidId && g.id === activeNumericId
                const sub = sublineZusammenfassung(g)
                const d = g.datum ?? ''
                const hovered = hoveredListId === g.id
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => onPickGesetz(g.id)}
                      onMouseEnter={() => setHoveredListId(g.id)}
                      onMouseLeave={() => setHoveredListId(null)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: `${spacing.md}px ${spacing.lg}px`,
                        marginBottom: 2,
                        border: 'none',
                        borderLeft: active
                          ? `3px solid ${c.red}`
                          : '3px solid transparent',
                        background: hovered ? c.bgAlt : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'flex-start',
                        gap: spacing.sm,
                        transition: `background 0.15s ${transition}`,
                      }}
                    >
                      <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: fonts.mono,
                            fontWeight: 700,
                            fontSize: '0.98rem',
                            color: c.ink,
                          }}
                        >
                          {g.kuerzel ?? '—'}
                        </div>
                        {sub ? (
                          <div
                            style={{
                              fontFamily: fonts.body,
                              fontSize: '0.8rem',
                              color: c.muted,
                              lineHeight: 1.35,
                              marginTop: 2,
                            }}
                          >
                            {sub}
                          </div>
                        ) : null}
                      </div>
                      <div
                        style={{
                          marginLeft: 'auto',
                          flexShrink: 0,
                          textAlign: 'right',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: '0.58rem',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: c.subtle,
                            marginBottom: 2,
                          }}
                        >
                          {t('gesetzeLastChangeLabel')}
                        </div>
                        {d ? (
                          <time
                            dateTime={d}
                            style={{
                              fontFamily: fonts.mono,
                              fontSize: '0.72rem',
                              color: c.muted,
                              display: 'block',
                            }}
                          >
                            {formatDisplayDate(d, lang)}
                          </time>
                        ) : (
                          <span
                            style={{
                              fontFamily: fonts.mono,
                              fontSize: '0.72rem',
                              color: c.subtle,
                            }}
                          >
                            —
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          {filteredGesetze.length > 0 ? (
            <div style={{ padding: `0 ${spacing.lg}px ${spacing.lg}px` }}>
              <Pagination
                current={gesetzPageClamped}
                total={gesetzTotalPages}
                onChange={setGesetzPage}
              />
            </div>
          ) : null}
        </>
      )}
    </aside>
  )

  const detailPanel = (
    <section
      style={{
        flex: isMobile ? 'none' : '1 1 58%',
        minWidth: 0,
        background: c.bg,
        overflowY: 'auto',
        maxHeight: isMobile ? 'none' : 'calc(100vh - 220px)',
      }}
    >
      {showWelcome ? (
        <LegislationWelcome
          stats={stats}
          statsLoading={statsLoading}
          statsError={statsError}
        />
      ) : (
        <GesetzDetail
          notFound={showNotFound}
          gesetz={detailEndpoint ? gesetzMerged : null}
          loading={Boolean(detailEndpoint) && showDetailSpinner}
          error={errorForDetail}
          linkedUrteile={linkedUrteile}
        />
      )}
    </section>
  )

  const urteilePanel = (
    <div
      style={{
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        padding: `${spacing.lg}px ${spacing.xl}px ${spacing.xxl}px`,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
          alignItems: 'flex-end',
          marginBottom: spacing.xl,
        }}
      >
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flex: '2 1 200px',
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.52rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: c.muted,
            }}
          >
            {t('urteileSearchLabel')}
          </span>
          <input
            type="search"
            value={urteilSearch}
            onChange={(e) => setUrteilSearch(e.target.value)}
            placeholder={t('urteileSearchPlaceholder')}
            aria-label={t('urteileSearchPlaceholder')}
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = c.red
              e.target.style.boxShadow = `0 0 0 2px ${c.red}33`
            }}
            onBlur={(e) => {
              e.target.style.borderColor = c.inputBorder
              e.target.style.boxShadow = 'none'
            }}
          />
        </label>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flex: '1 1 120px',
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.52rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: c.muted,
            }}
          >
            {t('urteileCourtLabel')}
          </span>
          <select
            value={urteilCourt}
            onChange={(e) => setUrteilCourt(e.target.value)}
            aria-label={t('urteileCourtLabel')}
            style={selectStyle}
            {...selectFocusHandlers}
          >
            <option value="all">{t('filterAll')}</option>
            {COURT_VALUES.map((cv) => (
              <option key={cv} value={cv}>
                {cv}
              </option>
            ))}
          </select>
        </label>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flex: '1 1 140px',
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.52rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: c.muted,
            }}
          >
            {t('legalArea')}
          </span>
          <select
            value={urteilRg}
            onChange={(e) => setUrteilRg(e.target.value)}
            aria-label={t('legalArea')}
            style={selectStyle}
            {...selectFocusHandlers}
          >
            <option value="all">{t('filterAll')}</option>
            {URTEIL_RECHTSGEBIET_OPTIONS.map((rg) => (
              <option key={rg} value={rg}>
                {rg}
              </option>
            ))}
          </select>
        </label>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flex: '1 1 120px',
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.52rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: c.muted,
            }}
          >
            {t('urteileTimeLabel')}
          </span>
          <select
            value={urteilTime}
            onChange={(e) =>
              setUrteilTime(e.target.value as typeof urteilTime)
            }
            aria-label={t('urteileTimeLabel')}
            style={selectStyle}
            {...selectFocusHandlers}
          >
            <option value="30d">{t('urteileTime30d')}</option>
            <option value="3m">{t('urteileTime3m')}</option>
            <option value="1y">{t('urteileTime1y')}</option>
            <option value="all">{t('urteileTimeAll')}</option>
          </select>
        </label>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.52rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: c.muted,
            }}
          >
            {t('gesetzeSortLabel')}
          </span>
          <div style={{ display: 'flex', gap: spacing.xs }}>
            <button
              type="button"
              onClick={() => setUrteilSortNewest(true)}
              style={{
                ...urteilSortBtnBase,
                borderColor: urteilSortNewest ? c.red : c.border,
                color: urteilSortNewest ? c.red : c.ink,
              }}
              aria-pressed={urteilSortNewest}
              title={t('urteileSortNewest')}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => setUrteilSortNewest(false)}
              style={{
                ...urteilSortBtnBase,
                borderColor: !urteilSortNewest ? c.red : c.border,
                color: !urteilSortNewest ? c.red : c.ink,
              }}
              aria-pressed={!urteilSortNewest}
              title={t('urteileSortOldest')}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {errUrteile ? (
        <p
          style={{
            color: c.no,
            fontFamily: fonts.body,
            marginBottom: spacing.md,
          }}
        >
          {t('urteileLoadError')}
        </p>
      ) : null}

      {loadingUrteile ? (
        <LoadingSpinner />
      ) : !filteredUrteile.length ? (
        <EmptyState text={t('urteileEmpty')} />
      ) : (
        <>
          {urteilSlice.map((u) => (
            <div key={u.id} style={{ marginBottom: spacing.lg }}>
              <UrteilCard
                urteil={u}
                onGesetzBadgeClick={onGesetzBadgeFromUrteil}
              />
            </div>
          ))}
          <Pagination
            current={urteilPageClamped}
            total={urteilTotalPages}
            onChange={setUrteilPage}
          />
        </>
      )}
    </div>
  )

  const mobileListDetailTabs =
    isMobile && mainTab === 'gesetze' ? (
      <div
        style={{
          display: 'flex',
          gap: spacing.sm,
          marginBottom: spacing.md,
        }}
      >
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          style={{
            flex: 1,
            padding: `${spacing.md}px ${spacing.lg}px`,
            borderRadius: 6,
            border: `1px solid ${mobileTab === 'list' ? c.red : c.border}`,
            background: mobileTab === 'list' ? c.bgHover : c.cardBg,
            color: mobileTab === 'list' ? c.ink : c.muted,
            fontFamily: fonts.mono,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {t('gesetzeMobileTabList')}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('detail')}
          style={{
            flex: 1,
            padding: `${spacing.md}px ${spacing.lg}px`,
            borderRadius: 6,
            border: `1px solid ${mobileTab === 'detail' ? c.red : c.border}`,
            background: mobileTab === 'detail' ? c.bgHover : c.cardBg,
            color: mobileTab === 'detail' ? c.ink : c.muted,
            fontFamily: fonts.mono,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {t('gesetzeMobileTabDetail')}
        </button>
      </div>
    ) : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        color: c.ink,
      }}
    >
      <PageHeader
        title={t('legislation')}
        subtitle={t('legislationPageSubtitle')}
      />
      <nav
        role="tablist"
        aria-label={t('legislationTabsAria')}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.sm,
          padding: `0 ${spacing.xl}px ${spacing.md}px`,
          borderBottom: `1px solid ${c.border}`,
        }}
      >
        {tabBtn('gesetze', t('legislationTabChanges'))}
        {tabBtn('urteile', t('legislationTabCaseLaw'))}
      </nav>

      {mainTab === 'gesetze' ? (
        <>
          {mobileListDetailTabs}
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'stretch',
              flex: 1,
              minHeight: 0,
              gap: 0,
            }}
          >
            {isMobile ? (
              <>
                {mobileTab === 'list' ? listPanel : null}
                {mobileTab === 'detail' ? detailPanel : null}
              </>
            ) : (
              <>
                {listPanel}
                {detailPanel}
              </>
            )}
          </div>
        </>
      ) : (
        urteilePanel
      )}
    </div>
  )
}
