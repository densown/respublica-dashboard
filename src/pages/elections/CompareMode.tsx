import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
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
import { fonts, spacing } from '../../design-system/tokens'
import type { I18nKey } from '../../design-system/i18n'
import { useApi } from '../../hooks/useApi'
import { DifferenceTable } from './DifferenceTable'
import {
  filterKreiseSearchHits,
  KreisAutocomplete,
} from './KreisAutocomplete'
import { PartyBarChart } from './PartyBarChart'
import { DISTRICT_CHART_PARTIES } from './PartyToggles'
import {
  RADAR_COMPARE_KEYS,
  RadarCompare,
  radarSubjectLabel,
} from './RadarCompare'
import { MAIN_PARTIES, PARTY_LABELS } from './partyColors'
import { regionRowToSingleResultBars } from './regionBarRows'
import {
  resolveKreisDisplayName,
  toDisplayPercent,
} from './normalizeWahlen'
import type {
  ElectionType,
  KreiseGeoJson,
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

/** A: solid, B: dashed, C: dotted, D: dash-dot */
const REGION_LINE_STYLES: {
  strokeDasharray?: string
  strokeWidth: number
}[] = [
  { strokeWidth: 2.5 },
  { strokeDasharray: '8 5', strokeWidth: 2 },
  { strokeDasharray: '2 4', strokeWidth: 2 },
  { strokeDasharray: '10 3 2 3', strokeWidth: 2 },
]

const REGION_LINE_COLORS = ['#4E79A7', '#E15759', '#59A14F', '#EDC948'] as const

const RADAR_FILLS = [
  'rgba(78, 121, 167, 0.35)',
  'rgba(225, 87, 89, 0.35)',
  'rgba(89, 161, 79, 0.35)',
  'rgba(237, 201, 72, 0.35)',
] as const

function normAgs(a: string) {
  return a.replace(/\s/g, '')
}

function selectCss(
  c: { cardBg: string; border: string; text: string },
  narrow: boolean,
): CSSProperties {
  return {
    minHeight: 44,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    background: c.cardBg,
    color: c.text,
    fontFamily: fonts.body,
    fontSize: '0.9rem',
    width: '100%',
    maxWidth: narrow ? '100%' : 280,
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

function sectionTitle(text: string, c: { border: string; text: string }) {
  return (
    <h3
      style={{
        fontFamily: fonts.display,
        fontSize: '1.05rem',
        marginTop: spacing.xl,
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottom: `1px solid ${c.border}`,
        color: c.text,
      }}
    >
      {text}
    </h3>
  )
}

function findRow(
  elections: RegionElectionRow[] | undefined,
  typ: ElectionType,
  year: number,
): RegionElectionRow | undefined {
  return elections?.find((e) => e.typ === typ && e.year === year)
}

export type CompareModeProps = {
  compareRegions: string[]
  setCompareRegions: (next: string[]) => void
  kreisNameByAgs: Map<string, string>
  geojson: KreiseGeoJson | null
  narrow: boolean
  initialElectionType: ElectionType
  onBackToMap: () => void
}

export function CompareMode({
  compareRegions,
  setCompareRegions,
  kreisNameByAgs,
  geojson,
  narrow,
  initialElectionType,
  onBackToMap,
}: CompareModeProps) {
  const { c, t, lang } = useTheme()
  const sep = lang === 'de' ? ',' : '.'

  const a0 = compareRegions[0] ?? ''
  const a1 = compareRegions[1] ?? ''
  const a2 = compareRegions[2] ?? ''
  const a3 = compareRegions[3] ?? ''

  const e0 = a0 ? `/api/wahlen/region/${encodeURIComponent(normAgs(a0))}` : ''
  const e1 = a1 ? `/api/wahlen/region/${encodeURIComponent(normAgs(a1))}` : ''
  const e2 = a2 ? `/api/wahlen/region/${encodeURIComponent(normAgs(a2))}` : ''
  const e3 = a3 ? `/api/wahlen/region/${encodeURIComponent(normAgs(a3))}` : ''

  const { data: d0, loading: l0, error: err0 } = useApi<RegionResponse>(e0)
  const { data: d1, loading: l1, error: err1 } = useApi<RegionResponse>(e1)
  const { data: d2, loading: l2, error: err2 } = useApi<RegionResponse>(e2)
  const { data: d3, loading: l3, error: err3 } = useApi<RegionResponse>(e3)

  const [compareTyp, setCompareTyp] = useState<ElectionType>(initialElectionType)
  useEffect(() => {
    setCompareTyp(initialElectionType)
  }, [initialElectionType])

  const [compareParty, setCompareParty] = useState<string>('spd')

  const nationalAvgEp =
    compareTyp && compareParty
      ? `/api/wahlen/national-average?typ=${encodeURIComponent(compareTyp)}&party=${encodeURIComponent(compareParty)}`
      : ''
  const { data: nationalAvgRows } =
    useApi<{ year: number; value: number | null }[]>(nationalAvgEp)
  const [snapshotYear, setSnapshotYear] = useState<number>(() => new Date().getFullYear())
  const [addQuery, setAddQuery] = useState('')
  const addHits = useMemo(
    () => filterKreiseSearchHits(geojson, addQuery),
    [geojson, addQuery],
  )

  const datasets = useMemo(() => {
    const pairs: {
      ags: string
      data: RegionResponse | null
      loading: boolean
      error: string | null
    }[] = [
      { ags: a0, data: d0, loading: l0, error: err0 },
      { ags: a1, data: d1, loading: l1, error: err1 },
      { ags: a2, data: d2, loading: l2, error: err2 },
      { ags: a3, data: d3, loading: l3, error: err3 },
    ]
    return pairs.filter((p) => p.ags)
  }, [a0, a1, a2, a3, d0, d1, d2, d3, l0, l1, l2, l3, err0, err1, err2, err3])

  const anyLoading = datasets.some((d) => d.loading)
  const anyError = datasets.some((d) => d.error)

  const regionLabel = useCallback(
    (ags: string, res: RegionResponse | null) =>
      resolveKreisDisplayName(ags, kreisNameByAgs, res?.ags_name),
    [kreisNameByAgs],
  )

  const yearsForTyp = useMemo(() => {
    if (!datasets.length) return [] as number[]
    let inter: Set<number> | null = null
    for (const ds of datasets) {
      const ys = new Set<number>(
        (ds.data?.elections ?? [])
          .filter((e) => e.typ === compareTyp)
          .map((e) => e.year),
      )
      if (inter === null) {
        inter = new Set(ys)
      } else {
        inter = new Set(
          [...inter].filter((y: number) => ys.has(y)),
        )
      }
    }
    const list = inter ? [...inter].sort((a, b) => b - a) : []
    if (list.length) return list
    const uni = new Set<number>()
    for (const ds of datasets) {
      for (const e of ds.data?.elections ?? []) {
        if (e.typ === compareTyp) uni.add(e.year)
      }
    }
    return [...uni].sort((a, b) => b - a)
  }, [datasets, compareTyp])

  useEffect(() => {
    if (!yearsForTyp.length) return
    if (!yearsForTyp.includes(snapshotYear)) {
      setSnapshotYear(yearsForTyp[0]!)
    }
  }, [yearsForTyp, snapshotYear])

  const timeSeriesYears = useMemo(() => {
    const u = new Set<number>()
    for (const ds of datasets) {
      for (const e of ds.data?.elections ?? []) {
        if (e.typ === compareTyp) u.add(e.year)
      }
    }
    return [...u].sort((a, b) => a - b)
  }, [datasets, compareTyp])

  const lineChartData = useMemo(() => {
    const natMap = new Map<number, number>()
    if (nationalAvgRows?.length) {
      for (const r of nationalAvgRows) {
        if (r.value != null && Number.isFinite(Number(r.value))) {
          natMap.set(r.year, toDisplayPercent(Number(r.value)))
        }
      }
    }
    return timeSeriesYears.map((year) => {
      const row: Record<string, number | undefined> & { year: number } = {
        year,
      }
      datasets.forEach((ds, i) => {
        const hit = findRow(ds.data?.elections, compareTyp, year)
        const raw = hit?.[compareParty]
        row[`r${i}`] =
          raw !== undefined && raw !== null
            ? toDisplayPercent(Number(raw))
            : undefined
      })
      const nv = natMap.get(year)
      row.nationalAvg = nv
      return row
    })
  }, [
    timeSeriesYears,
    datasets,
    compareTyp,
    compareParty,
    nationalAvgRows,
  ])

  const maxYLine = useMemo(() => {
    let m = 5
    for (const row of lineChartData) {
      for (let i = 0; i < datasets.length; i++) {
        const v = row[`r${i}`]
        if (typeof v === 'number' && !Number.isNaN(v)) m = Math.max(m, v)
      }
      const nv = row.nationalAvg
      if (typeof nv === 'number' && !Number.isNaN(nv)) m = Math.max(m, nv)
    }
    return Math.min(55, Math.ceil(m / 5) * 5 + 5)
  }, [lineChartData, datasets.length])

  const barMax = useMemo(() => {
    let m = 10
    for (const ds of datasets) {
      const row = findRow(ds.data?.elections, compareTyp, snapshotYear)
      const bars = regionRowToSingleResultBars(row)
      for (const b of bars) m = Math.max(m, b.value)
    }
    return Math.min(60, Math.ceil(m / 5) * 5 + 5)
  }, [datasets, compareTyp, snapshotYear])

  const radarChartData = useMemo(() => {
    return RADAR_COMPARE_KEYS.map((key) => {
      const o: Record<string, string | number> = {
        subject: radarSubjectLabel(lang, key),
      }
      datasets.forEach((ds, i) => {
        const row = findRow(ds.data?.elections, compareTyp, snapshotYear)
        const raw = row?.[key]
        o[`r${i}`] =
          raw !== undefined && raw !== null
            ? toDisplayPercent(Number(raw))
            : 0
      })
      return o
    })
  }, [datasets, compareTyp, snapshotYear, lang])

  const radarDomainMax = useMemo(() => {
    let m = 10
    for (const row of radarChartData) {
      for (let i = 0; i < datasets.length; i++) {
        const v = row[`r${i}`]
        if (typeof v === 'number') m = Math.max(m, v)
      }
    }
    return Math.min(55, Math.ceil((m * 1.1) / 5) * 5 + 5)
  }, [radarChartData, datasets.length])

  const radarSeries = useMemo(() => {
    return datasets.map((ds, i) => ({
      dataKey: `r${i}`,
      name: regionLabel(ds.ags, ds.data),
      stroke: REGION_LINE_COLORS[i % REGION_LINE_COLORS.length]!,
      fill: RADAR_FILLS[i % RADAR_FILLS.length]!,
    }))
  }, [datasets, regionLabel])

  const diffMatrix = useMemo(() => {
    return MAIN_PARTIES.map((pk) =>
      datasets.map((ds) => {
        const row = findRow(ds.data?.elections, compareTyp, snapshotYear)
        const raw = row?.[pk]
        return raw !== undefined && raw !== null
          ? toDisplayPercent(Number(raw))
          : NaN
      }),
    )
  }, [datasets, compareTyp, snapshotYear])

  const diffRegionNames = useMemo(
    () => datasets.map((ds) => regionLabel(ds.ags, ds.data)),
    [datasets, regionLabel],
  )

  const addRegion = (ags: string) => {
    const k = normAgs(ags)
    if (!k || compareRegions.includes(k) || compareRegions.length >= 4) return
    setCompareRegions([...compareRegions, k])
    setAddQuery('')
  }

  const removeAt = (idx: number) => {
    setCompareRegions(compareRegions.filter((_, i) => i !== idx))
  }

  const ready = datasets.length >= 2 && datasets.every((d) => d.data)

  return (
    <div
      style={{
        marginTop: spacing.lg,
        paddingLeft: narrow ? 12 : 0,
        paddingRight: narrow ? 12 : 0,
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
      }}
    >
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
            background: c.cardBg,
            color: c.text,
            fontFamily: fonts.mono,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          {t('backToMap')}
        </button>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: '1.35rem',
            fontWeight: 700,
            color: c.text,
            margin: 0,
            flex: 1,
          }}
        >
          {t('compareTitle')}
        </h2>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: narrow ? 'column' : 'row',
          flexWrap: 'wrap',
          gap: spacing.md,
          marginBottom: spacing.xl,
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
            {t('partyLabel')}
          </span>
          <select
            value={compareParty}
            onChange={(e) => setCompareParty(e.target.value)}
            style={selectCss(c, narrow)}
          >
            {DISTRICT_CHART_PARTIES.map((p) => (
              <option key={p} value={p}>
                {PARTY_LABELS[p]?.[lang] ?? p}
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
            value={compareTyp}
            onChange={(e) => setCompareTyp(e.target.value as ElectionType)}
            style={selectCss(c, narrow)}
          >
            {ELECTION_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {typeLabelT(t, tp)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: spacing.lg }}>
        <span
          style={{
            display: 'block',
            fontFamily: fonts.body,
            fontSize: '0.8rem',
            color: c.muted,
            marginBottom: 8,
          }}
        >
          {t('electionsRegion')}
        </span>
        {compareRegions.map((ags, idx) => (
          <div
            key={`${ags}-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              marginBottom: spacing.sm,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: '0.85rem',
                color: c.text,
                minWidth: 24,
              }}
            >
              {String.fromCharCode(65 + idx)}.
            </span>
            <span style={{ fontFamily: fonts.body, flex: 1, color: c.text, minWidth: 0 }}>
              {regionLabel(
                ags,
                datasets.find((d) => normAgs(d.ags) === normAgs(ags))?.data ??
                  null,
              )}
              <span style={{ color: c.muted }}> · AGS {normAgs(ags)}</span>
            </span>
            <button
              type="button"
              onClick={() => removeAt(idx)}
              style={{
                minHeight: 36,
                padding: '0 12px',
                borderRadius: 8,
                border: `1px solid ${c.border}`,
                background: c.bgAlt,
                color: c.text,
                fontFamily: fonts.mono,
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              {t('removeRegion')}
            </button>
          </div>
        ))}
        {compareRegions.length < 4 ? (
          <div style={{ marginTop: spacing.md, maxWidth: narrow ? '100%' : 400 }}>
            <KreisAutocomplete
              label={t('addRegion')}
              placeholder={t('searchPlaceholder')}
              ariaLabel={t('searchPlaceholder')}
              narrow
              query={addQuery}
              onQueryChange={setAddQuery}
              results={addHits}
              onPick={addRegion}
            />
          </div>
        ) : null}
      </div>

      {compareRegions.length < 2 ? (
        <p
          style={{
            fontFamily: fonts.body,
            color: c.muted,
            marginTop: spacing.md,
          }}
        >
          {t('compareNeedTwoRegions')}
        </p>
      ) : null}

      {anyError ? (
        <p style={{ color: c.no, fontFamily: fonts.body }}>{t('dataLoadError')}</p>
      ) : null}

      {anyLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xl }}>
          <LoadingSpinner />
        </div>
      ) : null}

      {ready ? (
        <>
          {sectionTitle(t('compareSectionTimeSeries'), c)}
          <div
            style={{
              width: '100%',
              minHeight: narrow ? 250 : 300,
              overflow: 'hidden',
            }}
          >
            <ResponsiveContainer width="100%" height={narrow ? 250 : 360}>
              <LineChart
                data={lineChartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <XAxis
                  dataKey="year"
                  tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                />
                <YAxis
                  domain={[0, maxYLine]}
                  tickFormatter={(v) =>
                    `${Number(v).toFixed(0).replace('.', sep)}%`
                  }
                  tick={{ fill: c.muted, fontSize: 11, fontFamily: fonts.mono }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: c.text,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontFamily: fonts.body, fontSize: 12 }}
                  formatter={(v) => (
                    <span style={{ color: c.inkSoft }}>{v}</span>
                  )}
                />
                {datasets.map((ds, i) => {
                  const style = REGION_LINE_STYLES[i % REGION_LINE_STYLES.length]!
                  const color = REGION_LINE_COLORS[i % REGION_LINE_COLORS.length]!
                  return (
                    <Line
                      key={ds.ags}
                      type="monotone"
                      dataKey={`r${i}`}
                      name={regionLabel(ds.ags, ds.data)}
                      stroke={color}
                      strokeWidth={style.strokeWidth}
                      strokeDasharray={style.strokeDasharray}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )
                })}
                {nationalAvgRows?.some((r) => r.value != null) ? (
                  <Line
                    type="monotone"
                    dataKey="nationalAvg"
                    name={t('nationalAverage')}
                    stroke={c.muted}
                    strokeWidth={1.5}
                    strokeDasharray="2 4"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {sectionTitle(t('compareSectionBars'), c)}
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
              {t('electionYear')}
            </span>
            <select
              value={snapshotYear}
              onChange={(e) => setSnapshotYear(Number(e.target.value))}
              disabled={!yearsForTyp.length}
              style={selectCss(c, narrow)}
            >
              {yearsForTyp.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: narrow
                ? '1fr'
                : 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: spacing.lg,
              alignItems: 'start',
              width: '100%',
              maxWidth: '100%',
            }}
          >
            {datasets.map((ds) => {
              const row = findRow(ds.data?.elections, compareTyp, snapshotYear)
              const bars = regionRowToSingleResultBars(row)
              return (
                <PartyBarChart
                  key={ds.ags}
                  data={bars}
                  year={snapshotYear}
                  lang={lang}
                  valueMax={barMax}
                  regionCaption={regionLabel(ds.ags, ds.data)}
                />
              )
            })}
          </div>

          {sectionTitle(t('compareSectionRadar'), c)}
          <RadarCompare
            lang={lang}
            chartData={radarChartData}
            series={radarSeries}
            domainMax={radarDomainMax}
            narrow={narrow}
          />

          {sectionTitle(t('compareSectionDiff'), c)}
          <DifferenceTable
            lang={lang}
            t={t}
            partyKeys={MAIN_PARTIES}
            regionLabels={diffRegionNames}
            matrix={diffMatrix}
          />
        </>
      ) : null}
    </div>
  )
}
