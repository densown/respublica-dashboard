import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
} from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Pagination,
  StatWidget,
  useTheme,
} from '../design-system'
import type { I18nKey } from '../design-system/i18n'
import { interpolate } from '../design-system/i18n'
import { EuCourtCard } from '../components/eulaw/EuCourtCard'
import { EuLawCard } from '../components/eulaw/EuLawCard'
import type {
  EuRechtDetail,
  EuRechtListResponse,
  EuRechtStats,
  EuUrteilDetail,
  EuUrteilListResponse,
  EuUrteilStats,
} from '../components/eulaw/types'
import { breakpoints, fonts, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'

const PAGE_SIZE = 20
const transition = 'cubic-bezier(0.4, 0, 0.2, 1)'

const LEGAL_AREA_KEYS: { value: string; key: I18nKey }[] = [
  { value: 'Handel', key: 'euLawRgHandel' },
  { value: 'Energie', key: 'euLawRgEnergie' },
  { value: 'Gesundheit', key: 'euLawRgGesundheit' },
  { value: 'Umwelt', key: 'euLawRgUmwelt' },
  { value: 'Finanzen', key: 'euLawRgFinanzen' },
  { value: 'Verkehr', key: 'euLawRgVerkehr' },
  { value: 'Landwirtschaft', key: 'euLawRgLandwirtschaft' },
  { value: 'Digitales', key: 'euLawRgDigitales' },
  { value: 'Migration', key: 'euLawRgMigration' },
  { value: 'Justiz', key: 'euLawRgJustiz' },
  { value: 'Sonstiges', key: 'euLawRgSonstiges' },
]

type TypFilter = '' | 'REG' | 'DIR' | 'DEC'
type GerichtFilter = '' | 'EuGH' | 'EuG'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.innerWidth < breakpoints.mobile,
  )
  useEffect(() => {
    const onResize = () =>
      setIsMobile(window.innerWidth < breakpoints.mobile)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

function buildEuListUrl(opts: {
  typ: TypFilter
  rechtsgebiet: string
  search: string
  limit: number
  offset: number
}): string {
  const q = new URLSearchParams()
  q.set('limit', String(opts.limit))
  q.set('offset', String(opts.offset))
  if (opts.typ) q.set('typ', opts.typ)
  if (opts.rechtsgebiet.trim()) q.set('rechtsgebiet', opts.rechtsgebiet.trim())
  if (opts.search.trim()) q.set('search', opts.search.trim())
  return `/api/eu-recht?${q.toString()}`
}

function buildEuUrteilListUrl(opts: {
  gericht: GerichtFilter
  rechtsgebiet: string
  search: string
  limit: number
  offset: number
}): string {
  const q = new URLSearchParams()
  q.set('limit', String(opts.limit))
  q.set('offset', String(opts.offset))
  if (opts.gericht) q.set('gericht', opts.gericht)
  if (opts.rechtsgebiet.trim()) q.set('rechtsgebiet', opts.rechtsgebiet.trim())
  if (opts.search.trim()) q.set('search', opts.search.trim())
  return `/api/eu-urteile?${q.toString()}`
}

function countByTyp(stats: EuRechtStats | null, typ: string): number {
  if (!stats?.by_typ) return 0
  const row = stats.by_typ.find((x) => x.typ === typ)
  return row?.c ?? 0
}

function countByGericht(stats: EuUrteilStats | null, g: string): number {
  if (!stats?.by_gericht) return 0
  const row = stats.by_gericht.find((x) => x.gericht === g)
  return row?.c ?? 0
}

export default function EuLaw() {
  const { c, t } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id: routeId } = useParams()
  const isMobile = useIsMobile()

  const mainTab =
    searchParams.get('tab') === 'case-law' ? 'case-law' : 'acts'

  const [typ, setTyp] = useState<TypFilter>('')
  const [rechtsgebiet, setRechtsgebiet] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortNewest, setSortNewest] = useState(true)
  const [page, setPage] = useState(1)

  const [courtGericht, setCourtGericht] = useState<GerichtFilter>('')
  const [courtRg, setCourtRg] = useState('')
  const [courtSearchInput, setCourtSearchInput] = useState('')
  const [courtDebouncedSearch, setCourtDebouncedSearch] = useState('')
  const [courtSortNewest, setCourtSortNewest] = useState(true)
  const [courtPage, setCourtPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCourtDebouncedSearch(courtSearchInput.trim())
    }, 350)
    return () => window.clearTimeout(timer)
  }, [courtSearchInput])

  useEffect(() => {
    setPage(1)
  }, [typ, rechtsgebiet, debouncedSearch, sortNewest])

  useEffect(() => {
    setCourtPage(1)
  }, [courtGericht, courtRg, courtDebouncedSearch, courtSortNewest])

  const actsStatsEndpoint = mainTab === 'acts' ? '/api/eu-recht/stats' : ''
  const { data: stats, loading: statsLoading, error: statsError } =
    useApi<EuRechtStats>(actsStatsEndpoint)

  const courtStatsEndpoint =
    mainTab === 'case-law' ? '/api/eu-urteile/stats' : ''
  const {
    data: courtStats,
    loading: courtStatsLoading,
    error: courtStatsError,
  } = useApi<EuUrteilStats>(courtStatsEndpoint)

  const [pagingTotal, setPagingTotal] = useState(0)
  const [courtPagingTotal, setCourtPagingTotal] = useState(0)

  useEffect(() => {
    setPagingTotal(0)
  }, [typ, rechtsgebiet, debouncedSearch])

  useEffect(() => {
    setCourtPagingTotal(0)
  }, [courtGericht, courtRg, courtDebouncedSearch])

  const totalPages = Math.max(1, Math.ceil(pagingTotal / PAGE_SIZE))
  const pageSafe = Math.min(Math.max(1, page), totalPages)

  const courtTotalPages = Math.max(
    1,
    Math.ceil(courtPagingTotal / PAGE_SIZE),
  )
  const courtPageSafe = Math.min(
    Math.max(1, courtPage),
    courtTotalPages,
  )

  const offset = useMemo(() => {
    if (sortNewest) return (pageSafe - 1) * PAGE_SIZE
    return Math.max(0, (totalPages - pageSafe) * PAGE_SIZE)
  }, [sortNewest, pageSafe, totalPages])

  const courtOffset = useMemo(() => {
    if (courtSortNewest) return (courtPageSafe - 1) * PAGE_SIZE
    return Math.max(0, (courtTotalPages - courtPageSafe) * PAGE_SIZE)
  }, [courtSortNewest, courtPageSafe, courtTotalPages])

  const listEndpoint = useMemo(
    () =>
      buildEuListUrl({
        typ,
        rechtsgebiet,
        search: debouncedSearch,
        limit: PAGE_SIZE,
        offset,
      }),
    [typ, rechtsgebiet, debouncedSearch, offset],
  )

  const courtListEndpoint = useMemo(
    () =>
      buildEuUrteilListUrl({
        gericht: courtGericht,
        rechtsgebiet: courtRg,
        search: courtDebouncedSearch,
        limit: PAGE_SIZE,
        offset: courtOffset,
      }),
    [courtGericht, courtRg, courtDebouncedSearch, courtOffset],
  )

  const actsListEndpoint = mainTab === 'acts' ? listEndpoint : ''
  const {
    data: listData,
    loading: listLoading,
    error: listError,
  } = useApi<EuRechtListResponse>(actsListEndpoint)

  const courtListApiEndpoint =
    mainTab === 'case-law' ? courtListEndpoint : ''
  const {
    data: courtListData,
    loading: courtListLoading,
    error: courtListError,
  } = useApi<EuUrteilListResponse>(courtListApiEndpoint)

  useEffect(() => {
    if (listData != null && typeof listData.total === 'number') {
      setPagingTotal(listData.total)
    }
  }, [listData])

  useEffect(() => {
    if (courtListData != null && typeof courtListData.total === 'number') {
      setCourtPagingTotal(courtListData.total)
    }
  }, [courtListData])

  const routeIdNum = routeId ? Number.parseInt(routeId, 10) : NaN
  const inCurrentList =
    Number.isFinite(routeIdNum) &&
    Boolean(listData?.items?.some((i) => i.id === routeIdNum))

  const deepEndpoint =
    mainTab === 'acts' &&
    Number.isFinite(routeIdNum) &&
    !listLoading &&
    !inCurrentList
      ? `/api/eu-recht/${routeIdNum}`
      : ''
  const { data: deepItem, error: deepError } =
    useApi<EuRechtDetail>(deepEndpoint)

  const courtParam = searchParams.get('court')
  const courtIdNum = courtParam ? Number.parseInt(courtParam, 10) : NaN
  const inCurrentCourtList =
    Number.isFinite(courtIdNum) &&
    Boolean(courtListData?.items?.some((i) => i.id === courtIdNum))

  const courtDeepEndpoint =
    mainTab === 'case-law' &&
    Number.isFinite(courtIdNum) &&
    !courtListLoading &&
    !inCurrentCourtList
      ? `/api/eu-urteile/${courtIdNum}`
      : ''
  const { data: courtDeepItem, error: courtDeepError } =
    useApi<EuUrteilDetail>(courtDeepEndpoint)

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe)
  }, [page, pageSafe])

  useEffect(() => {
    if (courtPage !== courtPageSafe) setCourtPage(courtPageSafe)
  }, [courtPage, courtPageSafe])

  const items = useMemo(() => {
    const raw = listData?.items ?? []
    if (sortNewest) return raw
    return [...raw].reverse()
  }, [listData?.items, sortNewest])

  const courtItems = useMemo(() => {
    const raw = courtListData?.items ?? []
    if (courtSortNewest) return raw
    return [...raw].reverse()
  }, [courtListData?.items, courtSortNewest])

  const selectArrowDataUrl = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="${c.muted}" stroke-width="1.5" stroke-linecap="round"/></svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  }, [c.muted])

  const chipBase = useCallback(
    (active: boolean) => ({
      flex: '0 0 auto',
      minHeight: 44,
      padding: `0 ${spacing.lg}px`,
      borderRadius: 999,
      border: `1px solid ${active ? c.red : c.border}`,
      background: active ? c.red : c.cardBg,
      color: active ? '#FFFFFF' : c.muted,
      fontFamily: fonts.body,
      fontSize: '0.85rem',
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
      transition: `background 0.2s ${transition}, color 0.2s ${transition}, border-color 0.2s ${transition}`,
    }),
    [c],
  )

  const selectFocusProps = useMemo(
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

  const selectStyle = useMemo(
    () => ({
      width: '100%',
      minHeight: 44,
      padding: `${spacing.md}px ${spacing.xl}px ${spacing.md}px ${spacing.md}px`,
      borderRadius: 6,
      outline: 'none' as const,
      borderStyle: 'solid' as const,
      borderWidth: '1px',
      borderColor: c.border,
      WebkitAppearance: 'none' as const,
      MozAppearance: 'none' as const,
      appearance: 'none' as const,
      backgroundImage: selectArrowDataUrl,
      backgroundColor: c.cardBg,
      backgroundRepeat: 'no-repeat' as const,
      backgroundPosition: 'right 12px center',
      color: c.ink,
      fontFamily: fonts.body,
      fontSize: '0.88rem',
      cursor: 'pointer' as const,
    }),
    [c, selectArrowDataUrl],
  )

  const regCount = countByTyp(stats, 'REG')
  const dirCount = countByTyp(stats, 'DIR')
  const totalActs = stats?.total ?? 0

  const eughCount = countByGericht(courtStats, 'EuGH')
  const eugCount = countByGericht(courtStats, 'EuG')
  const totalCourt = courtStats?.total ?? 0

  const typChips: { value: TypFilter; labelKey: I18nKey }[] = [
    { value: '', labelKey: 'euLawChipAll' },
    { value: 'REG', labelKey: 'euLawChipReg' },
    { value: 'DIR', labelKey: 'euLawChipDir' },
    { value: 'DEC', labelKey: 'euLawChipDec' },
  ]

  const courtGerichtChips: { value: GerichtFilter; labelKey: I18nKey }[] = [
    { value: '', labelKey: 'euLawCourtChipAll' },
    { value: 'EuGH', labelKey: 'euLawCourtChipEuGH' },
    { value: 'EuG', labelKey: 'euLawCourtChipEuG' },
  ]

  const goActsTab = useCallback(() => {
    if (routeId) navigate(`/eu-recht/${routeId}`)
    else navigate('/eu-recht')
  }, [navigate, routeId])

  const goCourtTab = useCallback(() => {
    navigate({ pathname: '/eu-recht', search: '?tab=case-law' })
  }, [navigate])

  const tabBtn = (tab: 'acts' | 'case-law', label: string) => {
    const active = mainTab === tab
    return (
      <button
        key={tab}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => (tab === 'acts' ? goActsTab() : goCourtTab())}
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

  const courtRgOptions = useMemo(() => {
    const rows = courtStats?.by_rechtsgebiet ?? []
    return rows
      .map((r) => r.rechtsgebiet)
      .filter((x): x is string => Boolean(x?.trim()))
  }, [courtStats?.by_rechtsgebiet])

  const loading = listLoading
  const error = listError
  const courtLoading = courtListLoading
  const courtError = courtListError

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        padding: `${spacing.lg}px ${spacing.xl}px ${spacing.xxl}px`,
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <PageHeader
        title={t('euLaw')}
        subtitle={
          mainTab === 'acts'
            ? t('euLawPageSubtitle')
            : t('euLawCaseLawPageSubtitle')
        }
      />

      <nav
        role="tablist"
        aria-label={t('euLawTabsAria')}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.lg,
          paddingBottom: spacing.md,
          borderBottom: `1px solid ${c.border}`,
        }}
      >
        {tabBtn('acts', t('euLawTabActs'))}
        {tabBtn('case-law', t('euLawTabCaseLaw'))}
      </nav>

      {mainTab === 'acts' ? (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              flexWrap: 'wrap',
              gap: spacing.md,
              marginBottom: spacing.xl,
            }}
          >
            <StatWidget
              label={t('euLawStatTotalKicker')}
              value={
                statsLoading && !stats
                  ? '…'
                  : statsError && !totalActs
                    ? '—'
                    : totalActs
              }
              sub={t('euLawStatActsSub')}
            />
            <StatWidget
              label={t('euLawStatRegLabel')}
              value={
                statsLoading && !stats
                  ? '…'
                  : statsError && !stats
                    ? '—'
                    : regCount
              }
            />
            <StatWidget
              label={t('euLawStatDirLabel')}
              value={
                statsLoading && !stats
                  ? '…'
                  : statsError && !stats
                    ? '—'
                    : dirCount
              }
            />
          </div>

          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.92rem',
              lineHeight: 1.65,
              color: c.muted,
              marginBottom: spacing.xl,
              maxWidth: 720,
            }}
          >
            {t('euLawWelcomeBlurb')}
          </p>

          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 6,
              background: c.bg,
              paddingTop: spacing.md,
              paddingBottom: spacing.md,
              marginBottom: spacing.lg,
              marginLeft: `-${spacing.xl}px`,
              marginRight: `-${spacing.xl}px`,
              paddingLeft: spacing.xl,
              paddingRight: spacing.xl,
              borderBottom: `1px solid ${c.border}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: 'wrap',
                gap: spacing.md,
                alignItems: 'stretch',
              }}
            >
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('euLawSearchPlaceholder')}
                aria-label={t('euLawSearchPlaceholder')}
                style={{
                  width: '100%',
                  flex: isMobile ? 'none' : '2 1 200px',
                  minWidth: 0,
                  minHeight: 44,
                  padding: `${spacing.md}px ${spacing.lg}px`,
                  border: `1px solid ${c.border}`,
                  borderRadius: 6,
                  background: c.cardBg,
                  color: c.ink,
                  fontFamily: fonts.body,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = `0 0 0 2px ${c.red}`
                  e.target.style.borderColor = c.red
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none'
                  e.target.style.borderColor = c.border
                }}
              />

              <div
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  marginLeft: isMobile ? -4 : 0,
                  marginRight: isMobile ? -4 : 0,
                  paddingBottom: spacing.xs,
                }}
              >
                <div
                  role="group"
                  aria-label={t('type')}
                  style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    gap: spacing.sm,
                    padding: `4px ${isMobile ? 4 : 0}px`,
                  }}
                >
                  {typChips.map((ch) => (
                    <button
                      key={ch.value || 'all'}
                      type="button"
                      onClick={() => setTyp(ch.value)}
                      style={chipBase(typ === ch.value)}
                    >
                      {t(ch.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.xs,
                  flex: isMobile ? 'none' : '1 1 160px',
                  minWidth: isMobile ? undefined : 160,
                  width: isMobile ? '100%' : undefined,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: c.muted,
                  }}
                >
                  {t('euLawAreaLabel')}
                </span>
                <select
                  value={rechtsgebiet}
                  onChange={(e) => setRechtsgebiet(e.target.value)}
                  aria-label={t('euLawAreaLabel')}
                  style={selectStyle}
                  {...selectFocusProps}
                >
                  <option value="">{t('euLawAreaAll')}</option>
                  {LEGAL_AREA_KEYS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {t(a.key)}
                    </option>
                  ))}
                </select>
              </label>

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.xs,
                  flex: isMobile ? 'none' : '1 1 140px',
                  minWidth: isMobile ? undefined : 140,
                  width: isMobile ? '100%' : undefined,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: c.muted,
                  }}
                >
                  {t('euLawSortLabel')}
                </span>
                <select
                  value={sortNewest ? 'new' : 'old'}
                  onChange={(e) => setSortNewest(e.target.value === 'new')}
                  aria-label={t('euLawSortLabel')}
                  style={selectStyle}
                  {...selectFocusProps}
                >
                  <option value="new">{t('euLawSortNewest')}</option>
                  <option value="old">{t('euLawSortOldest')}</option>
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <p
              style={{
                color: c.no,
                fontFamily: fonts.body,
                marginBottom: spacing.md,
              }}
            >
              {t('euLawLoadError')}
            </p>
          ) : null}

          {deepError && deepEndpoint ? (
            <p
              style={{
                color: c.muted,
                fontFamily: fonts.body,
                fontSize: '0.88rem',
                marginBottom: spacing.md,
              }}
            >
              {t('euLawLoadError')}
            </p>
          ) : null}

          {loading ? (
            <LoadingSpinner />
          ) : !items.length && !deepItem ? (
            <EmptyState text={t('euLawEmpty')} />
          ) : (
            <>
              {deepItem && !inCurrentList ? (
                <div style={{ marginBottom: spacing.lg }}>
                  <EuLawCard item={deepItem} startExpanded />
                </div>
              ) : null}
              {items.map((item) => (
                <div key={item.id} style={{ marginBottom: spacing.lg }}>
                  <EuLawCard
                    item={item}
                    startExpanded={
                      Number.isFinite(routeIdNum) && item.id === routeIdNum
                    }
                  />
                </div>
              ))}
              <p
                style={{
                  fontFamily: fonts.mono,
                  fontSize: '0.72rem',
                  color: c.muted,
                  marginBottom: spacing.md,
                }}
              >
                {interpolate(t('euLawPaginationMeta'), {
                  page: pageSafe,
                  pages: totalPages,
                  total: pagingTotal,
                })}
              </p>
              <Pagination
                current={pageSafe}
                total={totalPages}
                onChange={setPage}
              />
            </>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              flexWrap: 'wrap',
              gap: spacing.md,
              marginBottom: spacing.xl,
            }}
          >
            <StatWidget
              label={t('euLawCourtStatTotal')}
              value={
                courtStatsLoading && !courtStats
                  ? '…'
                  : courtStatsError && !totalCourt
                    ? '—'
                    : totalCourt
              }
            />
            <StatWidget
              label={t('euLawCourtStatEuGH')}
              value={
                courtStatsLoading && !courtStats
                  ? '…'
                  : courtStatsError && !courtStats
                    ? '—'
                    : eughCount
              }
            />
            <StatWidget
              label={t('euLawCourtStatEuG')}
              value={
                courtStatsLoading && !courtStats
                  ? '…'
                  : courtStatsError && !courtStats
                    ? '—'
                    : eugCount
              }
            />
          </div>

          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.92rem',
              lineHeight: 1.65,
              color: c.muted,
              marginBottom: spacing.xl,
              maxWidth: 720,
            }}
          >
            {t('euLawCourtWelcomeBlurb')}
          </p>

          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 6,
              background: c.bg,
              paddingTop: spacing.md,
              paddingBottom: spacing.md,
              marginBottom: spacing.lg,
              marginLeft: `-${spacing.xl}px`,
              marginRight: `-${spacing.xl}px`,
              paddingLeft: spacing.xl,
              paddingRight: spacing.xl,
              borderBottom: `1px solid ${c.border}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: 'wrap',
                gap: spacing.md,
                alignItems: 'stretch',
              }}
            >
              <input
                type="search"
                value={courtSearchInput}
                onChange={(e) => setCourtSearchInput(e.target.value)}
                placeholder={t('euLawCourtSearchPlaceholder')}
                aria-label={t('euLawCourtSearchPlaceholder')}
                style={{
                  width: '100%',
                  flex: isMobile ? 'none' : '2 1 200px',
                  minWidth: 0,
                  minHeight: 44,
                  padding: `${spacing.md}px ${spacing.lg}px`,
                  border: `1px solid ${c.border}`,
                  borderRadius: 6,
                  background: c.cardBg,
                  color: c.ink,
                  fontFamily: fonts.body,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = `0 0 0 2px ${c.red}`
                  e.target.style.borderColor = c.red
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none'
                  e.target.style.borderColor = c.border
                }}
              />

              <div
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  marginLeft: isMobile ? -4 : 0,
                  marginRight: isMobile ? -4 : 0,
                  paddingBottom: spacing.xs,
                }}
              >
                <div
                  role="group"
                  aria-label={t('urteileCourtLabel')}
                  style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    gap: spacing.sm,
                    padding: `4px ${isMobile ? 4 : 0}px`,
                  }}
                >
                  {courtGerichtChips.map((ch) => (
                    <button
                      key={ch.value || 'all'}
                      type="button"
                      onClick={() => setCourtGericht(ch.value)}
                      style={chipBase(courtGericht === ch.value)}
                    >
                      {t(ch.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.xs,
                  flex: isMobile ? 'none' : '1 1 180px',
                  minWidth: isMobile ? undefined : 160,
                  width: isMobile ? '100%' : undefined,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: c.muted,
                  }}
                >
                  {t('euLawAreaLabel')}
                </span>
                <select
                  value={courtRg}
                  onChange={(e) => setCourtRg(e.target.value)}
                  aria-label={t('euLawAreaLabel')}
                  style={selectStyle}
                  {...selectFocusProps}
                >
                  <option value="">{t('euLawAreaAll')}</option>
                  {courtRgOptions.map((rg) => (
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
                  gap: spacing.xs,
                  flex: isMobile ? 'none' : '1 1 140px',
                  minWidth: isMobile ? undefined : 140,
                  width: isMobile ? '100%' : undefined,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: c.muted,
                  }}
                >
                  {t('euLawSortLabel')}
                </span>
                <select
                  value={courtSortNewest ? 'new' : 'old'}
                  onChange={(e) =>
                    setCourtSortNewest(e.target.value === 'new')
                  }
                  aria-label={t('euLawSortLabel')}
                  style={selectStyle}
                  {...selectFocusProps}
                >
                  <option value="new">{t('euLawSortNewest')}</option>
                  <option value="old">{t('euLawSortOldest')}</option>
                </select>
              </label>
            </div>
          </div>

          {courtError ? (
            <p
              style={{
                color: c.no,
                fontFamily: fonts.body,
                marginBottom: spacing.md,
              }}
            >
              {t('euLawCourtLoadError')}
            </p>
          ) : null}

          {courtDeepError && courtDeepEndpoint ? (
            <p
              style={{
                color: c.muted,
                fontFamily: fonts.body,
                fontSize: '0.88rem',
                marginBottom: spacing.md,
              }}
            >
              {t('euLawCourtLoadError')}
            </p>
          ) : null}

          {courtLoading ? (
            <LoadingSpinner />
          ) : !courtItems.length && !courtDeepItem ? (
            <EmptyState text={t('euLawCourtEmpty')} />
          ) : (
            <>
              {courtDeepItem && !inCurrentCourtList ? (
                <div style={{ marginBottom: spacing.lg }}>
                  <EuCourtCard
                    item={courtDeepItem}
                    startExpanded
                  />
                </div>
              ) : null}
              {courtItems.map((item) => (
                <div key={item.id} style={{ marginBottom: spacing.lg }}>
                  <EuCourtCard
                    item={item}
                    startExpanded={
                      Number.isFinite(courtIdNum) && item.id === courtIdNum
                    }
                  />
                </div>
              ))}
              <p
                style={{
                  fontFamily: fonts.mono,
                  fontSize: '0.72rem',
                  color: c.muted,
                  marginBottom: spacing.md,
                }}
              >
                {interpolate(t('euLawPaginationMeta'), {
                  page: courtPageSafe,
                  pages: courtTotalPages,
                  total: courtPagingTotal,
                })}
              </p>
              <Pagination
                current={courtPageSafe}
                total={courtTotalPages}
                onChange={setCourtPage}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
