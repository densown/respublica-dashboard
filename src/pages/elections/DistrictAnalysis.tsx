import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LoadingSpinner, useTheme } from '../../design-system'
import { fonts, spacing, type ThemeColors } from '../../design-system/tokens'
import { interpolate, type I18nKey } from '../../design-system/i18n'
import { useApi } from '../../hooks/useApi'
import {
  filterKreiseSearchHits,
  KreisAutocomplete,
} from './KreisAutocomplete'
import { HistoricalTable } from './HistoricalTable'
import { PartyBarChart } from './PartyBarChart'
import {
  DISTRICT_CHART_PARTIES,
  PartyToggles,
} from './PartyToggles'
import { PercentileBar } from './PercentileBar'
import { regionRowToSingleResultBars } from './regionBarRows'
import {
  MAIN_PARTIES,
  PARTY_LABELS,
  partyColorsForTheme,
} from './partyColors'
import {
  resolveKreisDisplayName,
  toDisplayPercent,
} from './normalizeWahlen'
import type { MapRowFromApi } from './normalizeWahlen'
import type {
  ElectionType,
  KreiseGeoJson,
  RankingRow,
  RegionElectionRow,
  RegionResponse,
} from './types'

const ELECTION_TYPES: ElectionType[] = [
  'federal',
  'state',
  'municipal',
  'european',
  'mayoral',
]

const TYPE_COMPARE_ORDER: {
  typ: ElectionType
  strokeDasharray?: string
  strokeWidth: number
}[] = [
  { typ: 'federal', strokeWidth: 2.5 },
  { typ: 'state', strokeDasharray: '8 4', strokeWidth: 2 },
  { typ: 'municipal', strokeDasharray: '3 3', strokeWidth: 2 },
  { typ: 'european', strokeDasharray: '12 4 3 4', strokeWidth: 2 },
]

function selectCss(c: {
  inputBg: string
  inputBorder: string
  ink: string
}): CSSProperties {
  return {
    minHeight: 44,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${c.inputBorder}`,
    background: c.inputBg,
    color: c.ink,
    fontFamily: fonts.body,
    fontSize: '0.9rem',
    width: '100%',
    maxWidth: 280,
    boxSizing: 'border-box',
  }
}

function typeLabelT(t: (k: I18nKey) => string, typ: ElectionType) {
  switch (typ) {
    case 'federal':
      return t('federal')
    case 'state':
      return t('state')
    case 'municipal':
      return t('municipal')
    case 'european':
      return t('european')
    case 'mayoral':
      return t('mayoral')
    default:
      return typ
  }
}

type TypeCompareSeriesDef = (typeof TYPE_COMPARE_ORDER)[number]

/** Eigene Legende unter dem Wahltyp-Vergleich (SVG-Muster statt Recharts-Legende). */
function ElectionTypeCompareLineLegend({
  entries,
  t,
  c,
}: {
  entries: TypeCompareSeriesDef[]
  t: (k: I18nKey) => string
  c: ThemeColors
}) {
  return (
    <div
      role="list"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: spacing.md,
        alignItems: 'center',
      }}
    >
      {entries.map(({ typ, strokeDasharray, strokeWidth }) => (
        <div
          key={typ}
          role="listitem"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width={30} height={10} aria-hidden style={{ flexShrink: 0 }}>
            <line
              x1={0}
              y1={5}
              x2={30}
              y2={5}
              stroke={c.ink}
              strokeWidth={strokeWidth}
              {...(strokeDasharray
                ? { strokeDasharray }
                : {})}
              strokeLinecap="round"
            />
          </svg>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.75rem',
              color: c.muted,
            }}
          >
            {typeLabelT(t, typ)}
          </span>
        </div>
      ))}
    </div>
  )
}

function normAgs(a: string) {
  return a.replace(/\s/g, '')
}

function rawShare(row: RegionElectionRow, key: string): number {
  const n = Number(row[key])
  return Number.isFinite(n) ? n : 0
}

function winnerPartyKey(row: RegionElectionRow): string {
  let best = ''
  let bestV = -1
  for (const p of MAIN_PARTIES) {
    const v = toDisplayPercent(rawShare(row, p))
    if (v > bestV) {
      bestV = v
      best = p
    }
  }
  return best
}

function defaultTopParties(
  latest: RegionElectionRow | undefined,
): string[] {
  if (!latest) return ['cdu_csu', 'spd', 'gruene', 'afd']
  const scored = [...DISTRICT_CHART_PARTIES]
    .map((p) => ({ p, v: toDisplayPercent(rawShare(latest, p)) }))
    .sort((a, b) => b.v - a.v)
  return scored.slice(0, 4).map((x) => x.p)
}

export type DistrictAnalysisProps = {
  ags: string
  kreisNameByAgs: Map<string, string>
  geojson: KreiseGeoJson | null
  mapElectionType: ElectionType
  mapYear: number
  narrow: boolean
  onBackToMap: () => void
  onSelectKreis: (ags: string) => void
  compareRegions: string[]
  setCompareRegions: Dispatch<SetStateAction<string[]>>
  onOpenCompare: () => void
  onStartCompare?: (ags: string) => void
}

function sectionTitle(text: string, c: { border: string; ink: string }) {
  return (
    <h3
      style={{
        fontFamily: fonts.display,
        fontSize: '1.05rem',
        marginTop: spacing.xl,
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottom: `1px solid ${c.border}`,
        color: c.ink,
      }}
    >
      {text}
    </h3>
  )
}

export function DistrictAnalysis({
  ags,
  kreisNameByAgs,
  geojson,
  mapElectionType,
  mapYear,
  narrow,
  onBackToMap,
  onSelectKreis,
  compareRegions,
  setCompareRegions,
  onOpenCompare,
  onStartCompare,
}: DistrictAnalysisProps) {
  const { c, t, lang, theme } = useTheme()
  const partyColors = partyColorsForTheme(theme === 'dark')

  const ep = `/api/wahlen/region/${encodeURIComponent(ags)}`
  const { data, loading, error } = useApi<RegionResponse>(ep)

  const [kreisSearch, setKreisSearch] = useState('')
  const kreisHits = useMemo(
    () => filterKreiseSearchHits(geojson, kreisSearch),
    [geojson, kreisSearch],
  )

  const [timelineTyp, setTimelineTyp] = useState<ElectionType>(mapElectionType)
  useEffect(() => {
    setTimelineTyp(mapElectionType)
  }, [mapElectionType, ags])

  const [activePartyKeys, setActivePartyKeys] = useState<string[]>([])

  const latestForTimeline = useMemo(() => {
    if (!data?.elections.length) return undefined
    const list = data.elections
      .filter((e) => e.typ === timelineTyp)
      .sort((a, b) => b.year - a.year)
    return list[0]
  }, [data, timelineTyp])

  const defaultParties = useMemo(
    () => defaultTopParties(latestForTimeline),
    [latestForTimeline],
  )

  useEffect(() => {
    setActivePartyKeys(defaultParties)
  }, [ags, timelineTyp, defaultParties])

  const [focusParty, setFocusParty] = useState<string>('spd')

  const [resultTyp, setResultTyp] = useState<ElectionType>(mapElectionType)
  const [resultYear, setResultYear] = useState(mapYear)

  useEffect(() => {
    setResultTyp(mapElectionType)
    setResultYear(mapYear)
  }, [mapElectionType, mapYear, ags])

  const yearsForResultTyp = useMemo(() => {
    if (!data?.elections.length) return [] as number[]
    const ys = new Set<number>()
    for (const e of data.elections) {
      if (e.typ === resultTyp) ys.add(e.year)
    }
    return [...ys].sort((a, b) => b - a)
  }, [data, resultTyp])

  useEffect(() => {
    if (!yearsForResultTyp.length) return
    if (!yearsForResultTyp.includes(resultYear)) {
      setResultYear(yearsForResultTyp[0]!)
    }
  }, [yearsForResultTyp, resultYear])

  const mapTurnoutEp =
    resultTyp && resultYear
      ? `/api/wahlen/map?typ=${encodeURIComponent(resultTyp)}&year=${resultYear}&metric=turnout`
      : ''
  const { data: mapTurnoutRows } = useApi<MapRowFromApi[]>(mapTurnoutEp)

  const nationalAvgTurnout = useMemo(() => {
    if (!mapTurnoutRows?.length) return 0
    let s = 0
    for (const r of mapTurnoutRows) {
      s += toDisplayPercent(r.turnout)
    }
    return s / mapTurnoutRows.length
  }, [mapTurnoutRows])

  const rankingEp =
    focusParty && resultTyp && resultYear
      ? `/api/wahlen/ranking?typ=${encodeURIComponent(resultTyp)}&year=${resultYear}&party=${encodeURIComponent(focusParty)}&limit=999&order=desc`
      : ''
  const { data: rankingRows, loading: rankingLoading } =
    useApi<RankingRow[]>(rankingEp)

  const percentileStats = useMemo(() => {
    if (!rankingRows?.length) return null
    const target = normAgs(ags)
    const values = rankingRows.map((r) => toDisplayPercent(r.value))
    const min = Math.min(...values)
    const max = Math.max(...values)
    const row = rankingRows.find((r) => normAgs(r.ags) === target)
    if (!row) return { min, max, value: null as number | null, rank: 0, total: rankingRows.length }
    return {
      min,
      max,
      value: toDisplayPercent(row.value),
      rank: row.rank,
      total: rankingRows.length,
    }
  }, [rankingRows, ags])

  const kreisDisplayName = useMemo(
    () =>
      data
        ? resolveKreisDisplayName(ags, kreisNameByAgs, data.ags_name)
        : resolveKreisDisplayName(ags, kreisNameByAgs),
    [data, ags, kreisNameByAgs],
  )

  const bundeslandLine = useMemo(() => {
    if (!geojson) return data?.state_name ?? ''
    const k = normAgs(ags)
    for (const f of geojson.features) {
      if (normAgs(f.properties.ags) === k) {
        return String(f.properties.state ?? '')
      }
    }
    return data?.state_name ?? ''
  }, [geojson, ags, data?.state_name])

  const partyTimelineData = useMemo(() => {
    if (!data?.elections.length) return []
    const rows = data.elections
      .filter((e) => e.typ === timelineTyp)
      .sort((a, b) => a.year - b.year)
    return rows.map((row) => {
      const o: Record<string, number | undefined> & { year: number } = {
        year: row.year,
      }
      for (const p of DISTRICT_CHART_PARTIES) {
        const raw = row[p]
        o[p] =
          raw !== undefined && raw !== null
            ? toDisplayPercent(Number(raw))
            : undefined
      }
      return o
    })
  }, [data, timelineTyp])

  const maxYTimeline = useMemo(() => {
    let m = 5
    for (const row of partyTimelineData) {
      for (const p of activePartyKeys) {
        const v = row[p]
        if (typeof v === 'number' && !Number.isNaN(v)) m = Math.max(m, v)
      }
    }
    return Math.min(55, Math.ceil(m / 5) * 5 + 5)
  }, [partyTimelineData, activePartyKeys])

  const togglePartyKey = useCallback(
    (p: string) => {
      setActivePartyKeys((prev) => {
        if (prev.includes(p)) {
          if (prev.length <= 1) return prev
          return prev.filter((x) => x !== p)
        }
        return [...prev, p]
      })
    },
    [],
  )

  const typeCompareData = useMemo(() => {
    if (!data?.elections.length || !focusParty) return []
    const years = new Set<number>()
    for (const e of data.elections) {
      if (TYPE_COMPARE_ORDER.some((x) => x.typ === e.typ)) years.add(e.year)
    }
    return [...years]
      .sort((a, b) => a - b)
      .map((year) => {
        const o: Record<string, number | undefined> & { year: number } = {
          year,
        }
        for (const { typ } of TYPE_COMPARE_ORDER) {
          const hit = data.elections.find(
            (e) => e.typ === typ && e.year === year,
          )
          const raw = hit?.[focusParty]
          o[`share_${typ}`] =
            raw !== undefined && raw !== null
              ? toDisplayPercent(Number(raw))
              : undefined
        }
        return o
      })
  }, [data, focusParty])

  const maxYTypeCompare = useMemo(() => {
    let m = 5
    for (const row of typeCompareData) {
      for (const { typ } of TYPE_COMPARE_ORDER) {
        const v = row[`share_${typ}`]
        if (typeof v === 'number' && !Number.isNaN(v)) m = Math.max(m, v)
      }
    }
    return Math.min(55, Math.ceil(m / 5) * 5 + 5)
  }, [typeCompareData])

  const typeCompareSeriesWithData = useMemo(
    () =>
      TYPE_COMPARE_ORDER.filter(({ typ }) => {
        const dataKey = `share_${typ}`
        return typeCompareData.some((row) => typeof row[dataKey] === 'number')
      }),
    [typeCompareData],
  )

  const singleRow = useMemo(() => {
    if (!data?.elections.length) return undefined
    const list = data.elections.filter((e) => e.typ === resultTyp)
    const hit = list.find((e) => e.year === resultYear)
    if (hit) return hit
    return [...list].sort((a, b) => b.year - a.year)[0]
  }, [data, resultYear, resultTyp])

  const singleBarData = useMemo(
    () => regionRowToSingleResultBars(singleRow),
    [singleRow],
  )

  const prevElectionDelta = useMemo(() => {
    if (!data?.elections.length || !singleRow) return null
    const sameTyp = data.elections
      .filter((e) => e.typ === singleRow.typ)
      .sort((a, b) => b.year - a.year)
    const idx = sameTyp.findIndex((e) => e.year === singleRow.year)
    if (idx < 0 || idx >= sameTyp.length - 1) return null
    const prev = sameTyp[idx + 1]!
    const win = winnerPartyKey(singleRow)
    const now = toDisplayPercent(rawShare(singleRow, win))
    const was = toDisplayPercent(rawShare(prev, win))
    return { party: win, delta: now - was }
  }, [data, singleRow])

  const sep = lang === 'de' ? ',' : '.'

  const typeLabelFn = useCallback(
    (typ: ElectionType) => typeLabelT(t, typ),
    [t],
  )

  const onPickKreis = (next: string) => {
    onSelectKreis(normAgs(next))
    setKreisSearch('')
  }

  const selectedKey = normAgs(ags)
  const inCompare = compareRegions.some((r) => normAgs(r) === selectedKey)
  const compareCount = compareRegions.length
  const atMaxCompareRegions = compareCount >= 4
  const addToCompareDisabled = inCompare || atMaxCompareRegions
  const addToCompareLabel = inCompare
    ? t('alreadyInCompare')
    : atMaxCompareRegions
      ? `${t('compareFull')} (4/4)`
      : `${t('addToCompare')} (${compareCount}/4)`

  const addToComparePrimaryStyle: CSSProperties = {
    background: c.red,
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 4,
    fontSize: '0.8rem',
    fontFamily: fonts.body,
    border: 'none',
    cursor: addToCompareDisabled ? 'not-allowed' : 'pointer',
    opacity: addToCompareDisabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
  }

  const onAddToCompare = () => {
    if (addToCompareDisabled) return
    const k = selectedKey
    if (compareRegions.some((r) => normAgs(r) === k)) return
    if (compareRegions.length >= 4) return
    setCompareRegions([...compareRegions, k])
  }

  return (
    <div style={{ marginTop: spacing.lg }}>
      <div
        style={{
          display: 'flex',
          flexDirection: narrow ? 'column' : 'row',
          flexWrap: 'wrap',
          alignItems: narrow ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <button
          type="button"
          onClick={onBackToMap}
          style={{
            minHeight: 44,
            padding: '0 16px',
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.inputBg,
            color: c.ink,
            fontFamily: fonts.mono,
            fontSize: '0.8rem',
            cursor: 'pointer',
            alignSelf: narrow ? 'stretch' : 'auto',
          }}
        >
          {t('backToMap')}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              fontFamily: fonts.display,
              fontSize: '1.35rem',
              fontWeight: 700,
              color: c.ink,
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {kreisDisplayName}
          </h2>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: '0.85rem',
              color: c.muted,
              marginTop: 6,
            }}
          >
            {bundeslandLine}
            {bundeslandLine ? ' · ' : ''}
            AGS {data?.ags ?? ags}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            alignSelf: narrow ? 'stretch' : 'auto',
          }}
        >
          <button
            type="button"
            onClick={onAddToCompare}
            disabled={addToCompareDisabled}
            style={addToComparePrimaryStyle}
          >
            {addToCompareLabel}
          </button>
          {onStartCompare ? (
            <button
              type="button"
              onClick={() => onStartCompare(selectedKey)}
              style={{
                minHeight: 44,
                padding: '0 18px',
                borderRadius: 8,
                border: `1px solid ${c.border}`,
                background: c.inputBg,
                color: c.ink,
                fontFamily: fonts.body,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              + {t('compare')}
            </button>
          ) : null}
          {compareCount >= 2 ? (
            <button
              type="button"
              onClick={onOpenCompare}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: fonts.body,
                fontSize: '0.8rem',
                color: c.red,
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              {t('openCompare')}
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: spacing.md }}>
        <KreisAutocomplete
          label={t('electionsDistrict')}
          placeholder={t('searchPlaceholder')}
          ariaLabel={t('searchPlaceholder')}
          narrow={narrow}
          query={kreisSearch}
          onQueryChange={setKreisSearch}
          results={kreisHits}
          onPick={onPickKreis}
        />
      </div>

      {error && (
        <p style={{ color: c.no, fontFamily: fonts.body, marginTop: spacing.md }}>
          {t('dataLoadError')}
        </p>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xl }}>
          <LoadingSpinner />
        </div>
      )}

      {!loading && data && (
        <>
          {sectionTitle(t('partyTimeline'), c)}
          <div style={{ marginBottom: spacing.sm }}>
            <span
              style={{
                display: 'block',
                fontFamily: fonts.body,
                fontSize: '0.8rem',
                color: c.muted,
                marginBottom: 8,
              }}
            >
              {t('partiesLabel')}
            </span>
            <PartyToggles
              lang={lang}
              activeKeys={activePartyKeys}
              onChange={setActivePartyKeys}
            />
          </div>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: spacing.md,
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: '0.8rem',
                color: c.muted,
              }}
            >
              {t('electionType')}
            </span>
            <select
              value={timelineTyp}
              onChange={(e) => setTimelineTyp(e.target.value as ElectionType)}
              style={selectCss(c)}
            >
              {ELECTION_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {typeLabelT(t, tp)}
                </option>
              ))}
            </select>
          </label>
          <div style={{ width: '100%', minHeight: 320, marginTop: spacing.md }}>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart
                data={partyTimelineData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <XAxis
                  dataKey="year"
                  tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                />
                <YAxis
                  domain={[0, maxYTimeline]}
                  tickFormatter={(v) =>
                    `${Number(v).toFixed(0).replace('.', sep)}%`
                  }
                  tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: c.cardBg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: c.ink,
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const keys = activePartyKeys
                    return (
                      <div
                        style={{
                          background: c.cardBg,
                          border: `1px solid ${c.border}`,
                          borderRadius: 8,
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ marginBottom: 6, color: c.muted }}>{label}</div>
                        {keys.map((p) => {
                          const item = payload.find(
                            (x) => String(x.dataKey ?? '') === p,
                          )
                          const v = item?.value
                          const num = typeof v === 'number' ? v : Number(v)
                          const pct = Number.isFinite(num)
                            ? `${num.toFixed(1).replace('.', sep)} %`
                            : '—'
                          return (
                            <div key={p} style={{ color: c.inkSoft }}>
                              {PARTY_LABELS[p]?.[lang] ?? p}: {pct}
                            </div>
                          )
                        })}
                      </div>
                    )
                  }}
                />
                <Legend
                  wrapperStyle={{ fontFamily: fonts.body, fontSize: 12 }}
                  onClick={(e: unknown) => {
                    const d = (e as { dataKey?: unknown }).dataKey
                    if (typeof d === 'string' && d) togglePartyKey(d)
                  }}
                />
                {DISTRICT_CHART_PARTIES.map((p) => {
                  const color = partyColors[p] ?? partyColors.other
                  const label = PARTY_LABELS[p]?.[lang] ?? p
                  return (
                    <Line
                      key={p}
                      type="monotone"
                      dataKey={p}
                      name={label}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      hide={!activePartyKeys.includes(p)}
                      isAnimationActive={false}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {sectionTitle(t('electionTypeCompare'), c)}
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: spacing.md,
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: '0.8rem',
                color: c.muted,
              }}
            >
              {t('partyLabel')}
            </span>
            <select
              value={focusParty}
              onChange={(e) => setFocusParty(e.target.value)}
              style={selectCss(c)}
            >
              {DISTRICT_CHART_PARTIES.map((p) => (
                <option key={p} value={p}>
                  {PARTY_LABELS[p]?.[lang] ?? p}
                </option>
              ))}
            </select>
          </label>
          <div>
            <div style={{ width: '100%', minHeight: 280 }}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={typeCompareData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <XAxis
                    dataKey="year"
                    tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                  />
                  <YAxis
                    domain={[0, maxYTypeCompare]}
                    tickFormatter={(v) =>
                      `${Number(v).toFixed(0).replace('.', sep)}%`
                    }
                    tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: c.cardBg,
                      border: `1px solid ${c.border}`,
                      borderRadius: 8,
                      fontFamily: fonts.mono,
                      fontSize: 12,
                    }}
                  />
                  {TYPE_COMPARE_ORDER.map(({ typ, strokeDasharray, strokeWidth }) => {
                    const dataKey = `share_${typ}`
                    const has = typeCompareData.some(
                      (row) => typeof row[dataKey] === 'number',
                    )
                    if (!has) return null
                    return (
                      <Line
                        key={typ}
                        type="monotone"
                        dataKey={dataKey}
                        name={typeLabelT(t, typ)}
                        stroke={c.inkSoft}
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDasharray}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {typeCompareSeriesWithData.length > 0 ? (
              <ElectionTypeCompareLineLegend
                entries={typeCompareSeriesWithData}
                t={t}
                c={c}
              />
            ) : null}
          </div>

          {sectionTitle(t('singleResult'), c)}
          <div
            style={{
              display: 'flex',
              flexDirection: narrow ? 'column' : 'row',
              flexWrap: 'wrap',
              gap: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: '0.8rem',
                  color: c.muted,
                }}
              >
                {t('electionYear')}
              </span>
              <select
                value={resultYear}
                onChange={(e) => setResultYear(Number(e.target.value))}
                disabled={!yearsForResultTyp.length}
                style={selectCss(c)}
              >
                {yearsForResultTyp.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: '0.8rem',
                  color: c.muted,
                }}
              >
                {t('electionType')}
              </span>
              <select
                value={resultTyp}
                onChange={(e) => setResultTyp(e.target.value as ElectionType)}
                style={selectCss(c)}
              >
                {ELECTION_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {typeLabelT(t, tp)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: narrow ? '1fr' : '1fr 1fr',
              gap: spacing.xl,
              alignItems: 'start',
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: '0.9rem',
                color: c.ink,
                lineHeight: 1.6,
              }}
            >
              {singleRow ? (
                <>
                  <div>
                    <strong>{t('turnout')}:</strong>{' '}
                    {toDisplayPercent(Number(singleRow.turnout))
                      .toFixed(1)
                      .replace('.', sep)}{' '}
                    %
                    {nationalAvgTurnout > 0 ? (
                      <span style={{ color: c.muted }}>
                        {' '}
                        (
                        {interpolate(t('vsAverage'), {
                          avg: nationalAvgTurnout
                            .toFixed(1)
                            .replace('.', sep),
                        })}
                        )
                      </span>
                    ) : null}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>{t('winningParty')}:</strong>{' '}
                    {PARTY_LABELS[winnerPartyKey(singleRow)]?.[lang] ??
                      winnerPartyKey(singleRow)}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <strong>{t('previousElection')}:</strong>{' '}
                    {prevElectionDelta ? (
                      <span
                        style={{
                          color:
                            prevElectionDelta.delta >= 0 ? c.yes : c.no,
                        }}
                      >
                        {prevElectionDelta.delta >= 0 ? '+' : ''}
                        {prevElectionDelta.delta
                          .toFixed(1)
                          .replace('.', sep)}{' '}
                        Pp (
                        {
                          PARTY_LABELS[prevElectionDelta.party]?.[lang] ??
                            prevElectionDelta.party
                        }
                        )
                      </span>
                    ) : (
                      '—'
                    )}
                  </div>
                </>
              ) : (
                <span style={{ color: c.muted }}>{t('noData')}</span>
              )}
            </div>
            <div>
              {singleRow ? (
                <PartyBarChart
                  data={singleBarData}
                  year={singleRow.year}
                  lang={lang}
                />
              ) : null}
            </div>
          </div>

          {sectionTitle(t('positionInCountry'), c)}
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: spacing.md,
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: '0.8rem',
                color: c.muted,
              }}
            >
              {t('partyLabel')}
            </span>
            <select
              value={focusParty}
              onChange={(e) => setFocusParty(e.target.value)}
              style={selectCss(c)}
            >
              {DISTRICT_CHART_PARTIES.map((p) => (
                <option key={p} value={p}>
                  {PARTY_LABELS[p]?.[lang] ?? p}
                </option>
              ))}
            </select>
          </label>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.82rem',
              color: c.muted,
              marginBottom: spacing.sm,
            }}
          >
            {typeLabelT(t, resultTyp)} {resultYear}
          </p>
          {rankingLoading ? (
            <LoadingSpinner />
          ) : percentileStats && percentileStats.value != null ? (
            <PercentileBar
              lang={lang}
              t={t}
              min={percentileStats.min}
              max={percentileStats.max}
              value={percentileStats.value}
              rank={percentileStats.rank}
              total={percentileStats.total}
              accentColor={partyColors[focusParty]}
            />
          ) : (
            <p style={{ color: c.muted, fontFamily: fonts.body }}>{t('noData')}</p>
          )}

          {sectionTitle(t('historicalTable'), c)}
          <HistoricalTable
            lang={lang}
            t={t}
            rows={[...(data.elections ?? [])].sort((a, b) => b.year - a.year)}
            typeLabel={typeLabelFn}
          />
        </>
      )}
    </div>
  )
}
