import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataCard, useTheme } from '../../design-system'
import { breakpoints, fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import {
  ChangeDeltaHistogram,
  ChangeGainsLossesBarCharts,
  ChangeStateAverageBars,
} from './ChangeAnalysisCharts'
import { ChangeMap } from './ChangeMap'
import type { KreiseMapBuild } from './mapGeometry'
import { MAIN_PARTIES, PARTY_LABELS, STATE_NAMES } from './partyColors'
import { RankingTable } from './RankingTable'
import {
  SCATTER_AXIS_OPTIONS,
  ScatterPlot,
  scatterAxisLabel,
  type ScatterAxisKey,
} from './ScatterPlot'
import {
  changeToDisplayPp,
  resolveKreisDisplayName,
  toDisplayPercent,
} from './normalizeWahlen'
import type {
  ChangeRow,
  ElectionType,
  MapRow,
  RankingRow,
  ScatterRow,
} from './types'

type AnalysisTab = 'scatter' | 'ranking' | 'change'

type AdvancedAnalysisProps = {
  electionType: ElectionType
  year: number
  years: number[]
  mapBuild: KreiseMapBuild | null
  winnersByAgs: Map<string, MapRow>
  /** Kreisnamen aus GeoJSON (AGS → Name) */
  kreisNameByAgs: Map<string, string>
  onSelectRegion: (ags: string) => void
}

function normalizeChangeRow(r: ChangeRow): ChangeRow {
  return {
    ...r,
    change: changeToDisplayPp(r.change),
    value_from: toDisplayPercent(r.value_from),
    value_to: toDisplayPercent(r.value_to),
  }
}

function formatGainPp(n: number, lang: 'de' | 'en'): string {
  const s = n.toFixed(1).replace('.', lang === 'de' ? ',' : '.')
  return `+${s} Pp`
}

function formatLossPp(n: number, lang: 'de' | 'en'): string {
  const s = Math.abs(n).toFixed(1).replace('.', lang === 'de' ? ',' : '.')
  return `${lang === 'de' ? '−' : '-'}${s} Pp`
}

function selectStyle(c: {
  cardBg: string
  border: string
  text: string
}): React.CSSProperties {
  return {
    minHeight: 44,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    background: c.cardBg,
    color: c.text,
    fontFamily: fonts.body,
    fontSize: '0.9rem',
    cursor: 'pointer',
    flex: '1 1 140px',
    maxWidth: '100%',
  }
}

function normAgs(ags: string): string {
  return ags.replace(/\s/g, '')
}

const BUNDESLAND_PREFIXES = (Object.keys(STATE_NAMES) as string[]).sort()

function useNarrow() {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoints.mobile : false,
  )
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < breakpoints.mobile)
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return narrow
}

export function AdvancedAnalysis({
  electionType,
  year,
  years,
  mapBuild,
  winnersByAgs,
  kreisNameByAgs,
  onSelectRegion,
}: AdvancedAnalysisProps) {
  const { c, t, lang } = useTheme()
  const narrow = useNarrow()
  const [tab, setTab] = useState<AnalysisTab>('scatter')
  const [scatterSeen, setScatterSeen] = useState(false)
  const [rankingSeen, setRankingSeen] = useState(false)
  const [changeSeen, setChangeSeen] = useState(false)

  useEffect(() => {
    if (tab === 'scatter') setScatterSeen(true)
    if (tab === 'ranking') setRankingSeen(true)
    if (tab === 'change') setChangeSeen(true)
  }, [tab])

  const [xKey, setXKey] = useState<ScatterAxisKey>('turnout')
  const [yKey, setYKey] = useState<ScatterAxisKey>('afd')
  const [colorMode, setColorMode] = useState<'state' | 'winner'>('state')
  const [scatterRegionFilter, setScatterRegionFilter] = useState<string>('')

  const [rankParty, setRankParty] = useState<string>('afd')
  const [rankOrder, setRankOrder] = useState<'desc' | 'asc'>('desc')

  const sortedYears = useMemo(() => [...years].sort((a, b) => b - a), [years])
  const [changeFrom, setChangeFrom] = useState<number | null>(null)
  const [changeTo, setChangeTo] = useState<number | null>(null)
  const [changeParty, setChangeParty] = useState<string>('spd')
  const [changeMapFocusAgs, setChangeMapFocusAgs] = useState<string | null>(null)
  const [changeStateFilter, setChangeStateFilter] = useState<string>('')
  const [changeSearchQuery, setChangeSearchQuery] = useState('')
  const [showChangeSearchDropdown, setShowChangeSearchDropdown] = useState(false)
  const changeSearchWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sortedYears.length >= 2) {
      setChangeTo((v) => v ?? sortedYears[0]!)
      setChangeFrom((v) => v ?? sortedYears[1]!)
    }
  }, [sortedYears])

  const scatterEp =
    scatterSeen && electionType && year
      ? `/api/wahlen/scatter?typ=${encodeURIComponent(electionType)}&year=${year}&x=${encodeURIComponent(xKey)}&y=${encodeURIComponent(yKey)}`
      : ''
  const { data: scatterData, loading: scatterLoading, error: scatterErr } =
    useApi<ScatterRow[]>(scatterEp)

  const scatterRowsForPlot = useMemo(() => {
    if (!scatterData?.length) return [] as ScatterRow[]
    const p = scatterRegionFilter
    if (!p) return scatterData
    return scatterData.filter((d) => normAgs(d.ags).startsWith(p))
  }, [scatterData, scatterRegionFilter])

  const rankingEp =
    rankingSeen && electionType && year && rankParty
      ? `/api/wahlen/ranking?typ=${encodeURIComponent(electionType)}&year=${year}&party=${encodeURIComponent(rankParty)}&limit=20&order=${rankOrder}`
      : ''
  const { data: rankingData, loading: rankLoading, error: rankErr } =
    useApi<RankingRow[]>(rankingEp)

  const changeEp =
    changeSeen &&
    electionType &&
    changeFrom != null &&
    changeTo != null &&
    changeParty
      ? `/api/wahlen/change?typ=${encodeURIComponent(electionType)}&from=${changeFrom}&to=${changeTo}&party=${encodeURIComponent(changeParty)}`
      : ''
  const { data: changeData, loading: changeLoading, error: changeErr } =
    useApi<ChangeRow[]>(changeEp)

  const normalizedChangeData = useMemo(
    () => (changeData ? changeData.map(normalizeChangeRow) : null),
    [changeData],
  )

  useEffect(() => {
    if (!import.meta.env.DEV || !changeData?.length) return
    const sample = changeData.slice(0, 5).map((r) => ({
      ags: r.ags,
      change_raw: r.change,
      value_from_raw: r.value_from,
      value_to_raw: r.value_to,
    }))
    console.log('[wahlen] change API first 5 (raw)', sample)
  }, [changeData])

  const changeByAgs = useMemo(() => {
    const m = new Map<string, ChangeRow>()
    if (!normalizedChangeData) return m
    for (const r of normalizedChangeData) m.set(r.ags.replace(/\s/g, ''), r)
    return m
  }, [normalizedChangeData])

  const maxAbsChange = useMemo(() => {
    if (!normalizedChangeData?.length) return 1
    return Math.max(1, ...normalizedChangeData.map((r) => Math.abs(r.change)))
  }, [normalizedChangeData])

  const topGainsFiltered = useMemo(() => {
    if (!normalizedChangeData) return []
    let pool = normalizedChangeData.filter((r) => r.change > 0)
    if (changeStateFilter) {
      pool = pool.filter((r) => normAgs(r.ags).startsWith(changeStateFilter))
    }
    return [...pool].sort((a, b) => b.change - a.change).slice(0, 10)
  }, [normalizedChangeData, changeStateFilter])

  const topLossesFiltered = useMemo(() => {
    if (!normalizedChangeData) return []
    let pool = normalizedChangeData.filter((r) => r.change < 0)
    if (changeStateFilter) {
      pool = pool.filter((r) => normAgs(r.ags).startsWith(changeStateFilter))
    }
    return [...pool].sort((a, b) => a.change - b.change).slice(0, 10)
  }, [normalizedChangeData, changeStateFilter])

  const changeSearchHits = useMemo(() => {
    const q = changeSearchQuery.trim().toLowerCase()
    if (q.length < 2) return [] as { ags: string; name: string }[]
    const hits: { ags: string; name: string }[] = []
    for (const [ags, name] of kreisNameByAgs) {
      if (String(name).toLowerCase().includes(q)) hits.push({ ags, name: String(name) })
    }
    hits.sort((a, b) => a.name.localeCompare(b.name, lang))
    return hits.slice(0, 8)
  }, [kreisNameByAgs, changeSearchQuery, lang])

  useEffect(() => {
    setChangeMapFocusAgs(null)
  }, [changeFrom, changeTo, changeParty])

  useEffect(() => {
    const tq = changeSearchQuery.trim()
    if (tq.length < 2) {
      setShowChangeSearchDropdown(false)
      return
    }
    setShowChangeSearchDropdown(changeSearchHits.length > 0)
  }, [changeSearchQuery, changeSearchHits])

  useEffect(() => {
    if (!showChangeSearchDropdown) return
    const onDocMouseDown = (e: MouseEvent) => {
      const root = changeSearchWrapRef.current
      if (root && !root.contains(e.target as Node)) setShowChangeSearchDropdown(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [showChangeSearchDropdown])

  const onPickChangeSearchKreis = useCallback(
    (ags: string) => {
      setChangeMapFocusAgs(normAgs(ags))
      setChangeSearchQuery('')
      setShowChangeSearchDropdown(false)
      onSelectRegion(ags)
    },
    [onSelectRegion],
  )

  const kreisLabel = useCallback(
    (ags: string, apiName?: string | null) =>
      resolveKreisDisplayName(ags, kreisNameByAgs, apiName),
    [kreisNameByAgs],
  )

  const tabBtn = (id: AnalysisTab, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      style={{
        minHeight: 44,
        padding: '0 16px',
        borderRadius: 8,
        border: `1px solid ${tab === id ? c.red : c.border}`,
        background: tab === id ? c.bgHover : c.inputBg,
        color: c.text,
        fontFamily: fonts.body,
        fontSize: '0.9rem',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  return (
    <section style={{ marginTop: spacing.xxl }}>
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: '1.5rem',
          color: c.text,
          marginBottom: spacing.lg,
        }}
      >
        {t('advancedAnalysis')}
      </h2>

      <div
        style={{
          overflowX: narrow ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
          marginBottom: spacing.xl,
          width: '100%',
          maxWidth: '100%',
        }}
      >
        <div
          role="tablist"
          style={{
            display: 'flex',
            flexWrap: narrow ? 'nowrap' : 'wrap',
            gap: 10,
            minWidth: narrow ? 'min-content' : undefined,
          }}
        >
          {tabBtn('scatter', t('scatter'))}
          {tabBtn('ranking', t('ranking'))}
          {tabBtn('change', t('change'))}
        </div>
      </div>

      {tab === 'scatter' && (
        <DataCard>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing.md,
              marginBottom: spacing.lg,
              alignItems: 'center',
            }}
          >
            <label style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted }}>
              {t('electionsAxisX')}
              <select
                value={xKey}
                onChange={(e) => setXKey(e.target.value as ScatterAxisKey)}
                style={{ ...selectStyle(c), display: 'block', marginTop: 6, width: '100%' }}
              >
                {SCATTER_AXIS_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {scatterAxisLabel(k, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted }}>
              {t('electionsAxisY')}
              <select
                value={yKey}
                onChange={(e) => setYKey(e.target.value as ScatterAxisKey)}
                style={{ ...selectStyle(c), display: 'block', marginTop: 6, width: '100%' }}
              >
                {SCATTER_AXIS_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {scatterAxisLabel(k, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted }}>
              {t('electionsColorBy')}
              <select
                value={colorMode}
                onChange={(e) =>
                  setColorMode(e.target.value as 'state' | 'winner')
                }
                style={{ ...selectStyle(c), display: 'block', marginTop: 6, width: '100%' }}
              >
                <option value="state">{t('electionsByState')}</option>
                <option value="winner">{t('electionsByWinner')}</option>
              </select>
            </label>
            <label style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted }}>
              {t('electionsRegion')}
              <select
                value={scatterRegionFilter}
                onChange={(e) => setScatterRegionFilter(e.target.value)}
                style={{ ...selectStyle(c), display: 'block', marginTop: 6, width: '100%' }}
              >
                <option value="">{t('electionsAllStates')}</option>
                {BUNDESLAND_PREFIXES.map((code) => (
                  <option key={code} value={code}>
                    {STATE_NAMES[code]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {scatterErr && (
            <p style={{ color: c.red, fontFamily: fonts.body }}>{t('dataLoadError')}</p>
          )}
          {scatterLoading && (
            <p style={{ color: c.muted, fontFamily: fonts.body }}>{t('loading')}</p>
          )}
          {!scatterLoading && scatterData && (
            <ScatterPlot
              rows={scatterRowsForPlot}
              xKey={xKey}
              yKey={yKey}
              colorMode={colorMode}
              winnersByAgs={winnersByAgs}
              lang={lang}
              onPointClick={onSelectRegion}
              stateLegendEmphasisPrefix={scatterRegionFilter || null}
            />
          )}
        </DataCard>
      )}

      {tab === 'ranking' && (
        <DataCard>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing.md,
              marginBottom: spacing.lg,
              alignItems: 'flex-end',
            }}
          >
            <label style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted }}>
              {t('metric')}
              <select
                value={rankParty}
                onChange={(e) => setRankParty(e.target.value)}
                style={{ ...selectStyle(c), display: 'block', marginTop: 6 }}
              >
                {MAIN_PARTIES.map((p) => (
                  <option key={p} value={p}>
                    {PARTY_LABELS[p]?.[lang] ?? p}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setRankOrder('desc')}
                style={{
                  minHeight: 44,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: `1px solid ${rankOrder === 'desc' ? c.red : c.border}`,
                  background: rankOrder === 'desc' ? c.bgHover : c.inputBg,
                  color: c.ink,
                  fontFamily: fonts.body,
                  cursor: 'pointer',
                }}
              >
                {t('top20')}
              </button>
              <button
                type="button"
                onClick={() => setRankOrder('asc')}
                style={{
                  minHeight: 44,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: `1px solid ${rankOrder === 'asc' ? c.red : c.border}`,
                  background: rankOrder === 'asc' ? c.bgHover : c.inputBg,
                  color: c.ink,
                  fontFamily: fonts.body,
                  cursor: 'pointer',
                }}
              >
                {t('bottom20')}
              </button>
            </div>
          </div>
          {rankErr && (
            <p style={{ color: c.red, fontFamily: fonts.body }}>{t('dataLoadError')}</p>
          )}
          {rankLoading && (
            <p style={{ color: c.muted, fontFamily: fonts.body }}>{t('loading')}</p>
          )}
          {!rankLoading && rankingData && (
            <RankingTable
              rows={rankingData}
              kreisNameByAgs={kreisNameByAgs}
              onRowClick={onSelectRegion}
            />
          )}
        </DataCard>
      )}

      {tab === 'change' && (
        <DataCard>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
            <label style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted }}>
              {t('changeFrom')}
              <select
                value={changeFrom ?? ''}
                onChange={(e) => setChangeFrom(Number(e.target.value))}
                style={{ ...selectStyle(c), display: 'block', marginTop: 6 }}
              >
                {sortedYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted }}>
              {t('changeTo')}
              <select
                value={changeTo ?? ''}
                onChange={(e) => setChangeTo(Number(e.target.value))}
                style={{ ...selectStyle(c), display: 'block', marginTop: 6 }}
              >
                {sortedYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontFamily: fonts.body, fontSize: '0.85rem', color: c.muted }}>
              {t('metric')}
              <select
                value={changeParty}
                onChange={(e) => setChangeParty(e.target.value)}
                style={{ ...selectStyle(c), display: 'block', marginTop: 6 }}
              >
                {MAIN_PARTIES.map((p) => (
                  <option key={p} value={p}>
                    {PARTY_LABELS[p]?.[lang] ?? p}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {changeErr && (
            <p style={{ color: c.red, fontFamily: fonts.body }}>{t('dataLoadError')}</p>
          )}
          {changeLoading && (
            <p style={{ color: c.muted, fontFamily: fonts.body }}>{t('loading')}</p>
          )}
          {!changeLoading && changeData && (
            <>
            <div
              style={{
                display: 'flex',
                flexDirection: narrow ? 'column' : 'row',
                gap: spacing.xl,
                alignItems: narrow ? 'stretch' : 'flex-start',
              }}
            >
              <div style={{ flex: narrow ? 'none' : '1 1 0', minWidth: 0, width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: spacing.md,
                    marginBottom: spacing.md,
                    alignItems: 'flex-end',
                  }}
                >
                  <div
                    ref={changeSearchWrapRef}
                    style={{
                      flex: narrow ? '1 1 100%' : '1 1 220px',
                      minWidth: narrow ? undefined : 200,
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontFamily: fonts.body,
                        fontSize: '0.85rem',
                        color: c.muted,
                        marginBottom: 6,
                      }}
                    >
                      {t('electionsDistrict')}
                    </span>
                    <input
                      type="search"
                      value={changeSearchQuery}
                      onChange={(e) => setChangeSearchQuery(e.target.value)}
                      onFocus={() => {
                        const tq = changeSearchQuery.trim()
                        if (tq.length >= 2 && changeSearchHits.length > 0) {
                          setShowChangeSearchDropdown(true)
                        }
                      }}
                      placeholder={t('searchPlaceholder')}
                      aria-label={t('searchPlaceholder')}
                      autoComplete="off"
                      style={{
                        ...selectStyle(c),
                        display: 'block',
                        width: '100%',
                        boxSizing: 'border-box',
                        marginTop: 0,
                      }}
                    />
                    {showChangeSearchDropdown && changeSearchHits.length > 0 && (
                      <div
                        role="listbox"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: 4,
                          zIndex: 20,
                          background: c.surface,
                          border: `1px solid ${c.border}`,
                          boxShadow: c.shadow,
                          borderRadius: 8,
                          maxHeight: 300,
                          overflowY: 'auto',
                        }}
                      >
                        {changeSearchHits.map((hit, i) => (
                          <button
                            key={hit.ags}
                            type="button"
                            role="option"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onPickChangeSearchKreis(hit.ags)}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '8px 12px',
                              border: 'none',
                              borderBottom:
                                i < changeSearchHits.length - 1
                                  ? `1px solid ${c.border}`
                                  : 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontFamily: fonts.body,
                              fontSize: '0.9rem',
                              color: c.ink,
                              boxSizing: 'border-box',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = c.bgHover
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            {hit.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <label
                    style={{
                      fontFamily: fonts.body,
                      fontSize: '0.85rem',
                      color: c.muted,
                      flex: narrow ? '1 1 100%' : '0 1 200px',
                    }}
                  >
                    {t('electionsBundesland')}
                    <select
                      value={changeStateFilter}
                      onChange={(e) => setChangeStateFilter(e.target.value)}
                      style={{
                        ...selectStyle(c),
                        display: 'block',
                        marginTop: 6,
                        width: '100%',
                      }}
                    >
                      <option value="">{t('electionsAllStates')}</option>
                      {BUNDESLAND_PREFIXES.map((code) => (
                        <option key={code} value={code}>
                          {STATE_NAMES[code]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <ChangeMap
                  mapBuild={mapBuild}
                  changeByAgs={changeByAgs}
                  maxAbs={maxAbsChange}
                  kreisNameByAgs={kreisNameByAgs}
                  selectedAgs={changeMapFocusAgs}
                  filterStatePrefix={changeStateFilter || null}
                  onSelectAgs={(ags) => {
                    setChangeMapFocusAgs(normAgs(ags))
                    onSelectRegion(ags)
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: '0.85rem',
                  flex: narrow ? 'none' : '0 0 220px',
                  minWidth: narrow ? undefined : 200,
                }}
              >
                <div style={{ fontWeight: 600, color: c.ink, marginBottom: 8 }}>
                  {t('topGains')}
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, color: c.inkSoft }}>
                  {topGainsFiltered.map((r) => (
                    <li key={r.ags} style={{ marginBottom: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setChangeMapFocusAgs(normAgs(r.ags))
                          onSelectRegion(r.ags)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: '#2E7D32',
                          textAlign: 'left',
                          font: 'inherit',
                        }}
                      >
                        {kreisLabel(r.ags, r.name)}{' '}
                        <span style={{ fontFamily: fonts.mono }}>
                          {formatGainPp(r.change, lang)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
                <div
                  style={{
                    fontWeight: 600,
                    color: c.ink,
                    marginTop: spacing.lg,
                    marginBottom: 8,
                  }}
                >
                  {t('topLosses')}
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, color: c.inkSoft }}>
                  {topLossesFiltered.map((r) => (
                    <li key={r.ags} style={{ marginBottom: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setChangeMapFocusAgs(normAgs(r.ags))
                          onSelectRegion(r.ags)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: '#C62828',
                          textAlign: 'left',
                          font: 'inherit',
                        }}
                      >
                        {kreisLabel(r.ags, r.name)}{' '}
                        <span style={{ fontFamily: fonts.mono }}>
                          {formatLossPp(r.change, lang)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            {normalizedChangeData && normalizedChangeData.length > 0 && (
              <>
                <ChangeGainsLossesBarCharts
                  gains={topGainsFiltered}
                  losses={topLossesFiltered}
                  kreisLabel={kreisLabel}
                  onSelectAgs={(ags) => {
                    setChangeMapFocusAgs(normAgs(ags))
                    onSelectRegion(ags)
                  }}
                  narrow={narrow}
                />
                <ChangeDeltaHistogram rows={normalizedChangeData} narrow={narrow} />
                <ChangeStateAverageBars rows={normalizedChangeData} narrow={narrow} />
              </>
            )}
            </>
          )}
        </DataCard>
      )}
    </section>
  )
}
