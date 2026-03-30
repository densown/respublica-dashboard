import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
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
import { EuLawCard } from '../components/eulaw/EuLawCard'
import type {
  EuRechtDetail,
  EuRechtListResponse,
  EuRechtStats,
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

function countByTyp(stats: EuRechtStats | null, typ: string): number {
  if (!stats?.by_typ) return 0
  const row = stats.by_typ.find((x) => x.typ === typ)
  return row?.c ?? 0
}

export default function EuLaw() {
  const { c, t } = useTheme()
  const { id: routeId } = useParams()
  const isMobile = useIsMobile()

  const [typ, setTyp] = useState<TypFilter>('')
  const [rechtsgebiet, setRechtsgebiet] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortNewest, setSortNewest] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [typ, rechtsgebiet, debouncedSearch, sortNewest])

  const { data: stats, loading: statsLoading, error: statsError } =
    useApi<EuRechtStats>('/api/eu-recht/stats')

  const [pagingTotal, setPagingTotal] = useState(0)

  useEffect(() => {
    setPagingTotal(0)
  }, [typ, rechtsgebiet, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(pagingTotal / PAGE_SIZE))
  const pageSafe = Math.min(Math.max(1, page), totalPages)

  const offset = useMemo(() => {
    if (sortNewest) return (pageSafe - 1) * PAGE_SIZE
    return Math.max(0, (totalPages - pageSafe) * PAGE_SIZE)
  }, [sortNewest, pageSafe, totalPages])

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

  const {
    data: listData,
    loading: listLoading,
    error: listError,
  } = useApi<EuRechtListResponse>(listEndpoint)

  useEffect(() => {
    if (listData != null && typeof listData.total === 'number') {
      setPagingTotal(listData.total)
    }
  }, [listData])

  const routeIdNum = routeId ? Number.parseInt(routeId, 10) : NaN
  const inCurrentList =
    Number.isFinite(routeIdNum) &&
    Boolean(listData?.items?.some((i) => i.id === routeIdNum))

  const deepEndpoint =
    Number.isFinite(routeIdNum) && !listLoading && !inCurrentList
      ? `/api/eu-recht/${routeIdNum}`
      : ''
  const { data: deepItem, error: deepError } = useApi<EuRechtDetail>(deepEndpoint)

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe)
  }, [page, pageSafe])

  const items = useMemo(() => {
    const raw = listData?.items ?? []
    if (sortNewest) return raw
    return [...raw].reverse()
  }, [listData?.items, sortNewest])

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
      background: active ? c.red : c.bgAlt,
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

  const selectStyle = useMemo(
    () => ({
      width: '100%',
      minHeight: 44,
      padding: `${spacing.md}px ${spacing.xl}px ${spacing.md}px ${spacing.md}px`,
      border: `1px solid ${c.inputBorder}`,
      borderRadius: 6,
      background: c.inputBg,
      color: c.ink,
      fontFamily: fonts.body,
      fontSize: '0.88rem',
      appearance: 'none' as const,
      WebkitAppearance: 'none' as const,
      backgroundImage: selectArrowDataUrl,
      backgroundRepeat: 'no-repeat' as const,
      backgroundPosition: 'right 12px center',
      cursor: 'pointer',
    }),
    [c, selectArrowDataUrl],
  )

  const regCount = countByTyp(stats, 'REG')
  const dirCount = countByTyp(stats, 'DIR')
  const totalActs = stats?.total ?? 0

  const typChips: { value: TypFilter; labelKey: I18nKey }[] = [
    { value: '', labelKey: 'euLawChipAll' },
    { value: 'REG', labelKey: 'euLawChipReg' },
    { value: 'DIR', labelKey: 'euLawChipDir' },
    { value: 'DEC', labelKey: 'euLawChipDec' },
  ]

  const loading = listLoading
  const error = listError

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
      <PageHeader title={t('euLaw')} subtitle={t('euLawPageSubtitle')} />

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
            statsLoading && !stats ? '…' : statsError && !totalActs ? '—' : totalActs
          }
          sub={t('euLawStatActsSub')}
        />
        <StatWidget
          label={t('euLawStatRegLabel')}
          value={
            statsLoading && !stats ? '…' : statsError && !stats ? '—' : regCount
          }
        />
        <StatWidget
          label={t('euLawStatDirLabel')}
          value={
            statsLoading && !stats ? '…' : statsError && !stats ? '—' : dirCount
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
              border: `1px solid ${c.inputBorder}`,
              borderRadius: 6,
              background: c.inputBg,
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
              e.target.style.borderColor = c.inputBorder
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
    </div>
  )
}
