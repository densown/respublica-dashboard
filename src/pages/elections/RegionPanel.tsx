import { useEffect, useMemo, useState } from 'react'
import {
  LoadingSpinner,
  useTheme,
} from '../../design-system'
import { breakpoints, fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import { PartyBarChart, type PartyBarRow } from './PartyBarChart'
import { TimeSeriesChart, TIMESERIES_PARTIES, type TsRow } from './TimeSeriesChart'
import { MAIN_PARTIES } from './partyColors'
import { toDisplayPercent } from './normalizeWahlen'
import type { ElectionType, RegionElectionRow, RegionResponse } from './types'

/** Sieben große Parteien – immer für Balken + Rest-Summe */
const BAR_PARTIES_KERN = [...MAIN_PARTIES] as const

/** Kleinstparteien: nur Balken wenn > 2 %; Anteil zählt trotzdem zur Summe vor „Sonstige“ */
const BAR_PARTIES_KLEIN = ['freie_waehler', 'npd', 'piraten'] as const

const BAR_PARTIES_FUER_REST = [
  ...BAR_PARTIES_KERN,
  ...BAR_PARTIES_KLEIN,
] as const

const MIN_BAR_PCT_KERN = 0.05
const MIN_BAR_PCT_KLEIN = 2

const PANEL_TYPES: ElectionType[] = [
  'federal',
  'state',
  'municipal',
  'european',
]

function rawShare(row: RegionElectionRow, key: string): number {
  const n = Number(row[key])
  return Number.isFinite(n) ? n : 0
}

function rowToBarData(row: RegionElectionRow | undefined): PartyBarRow[] {
  if (!row) return []

  let sumRaw = 0
  for (const k of BAR_PARTIES_FUER_REST) {
    sumRaw += rawShare(row, k)
  }
  const restRaw = Math.max(0, Math.min(1, 1 - sumRaw))
  const otherDisp = toDisplayPercent(restRaw)

  const out: PartyBarRow[] = []
  for (const k of BAR_PARTIES_KERN) {
    const v = toDisplayPercent(rawShare(row, k))
    if (v > MIN_BAR_PCT_KERN) out.push({ party: k, value: v })
  }
  for (const k of BAR_PARTIES_KLEIN) {
    const v = toDisplayPercent(rawShare(row, k))
    if (v > MIN_BAR_PCT_KLEIN) out.push({ party: k, value: v })
  }
  if (otherDisp > MIN_BAR_PCT_KERN) {
    out.push({ party: 'other', value: otherDisp })
  }

  return out
}

function useIsNarrow() {
  const [n, setN] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoints.mobile : false,
  )
  useEffect(() => {
    const on = () => setN(window.innerWidth < breakpoints.mobile)
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return n
}

export type RegionPanelProps = {
  ags: string | null
  /** Kreisnamen aus GeoJSON (AGS → Name), z. B. wenn API `ags_name` null liefert */
  agsNameMap: Record<string, string>
  mapYear: number
  mapTyp: ElectionType
  compareAgs: string | null
  comparePicking: boolean
  onClose: () => void
  onStartCompare: () => void
  onClearCompare: () => void
}

export function RegionPanel({
  ags,
  agsNameMap,
  mapYear,
  mapTyp,
  compareAgs,
  comparePicking,
  onClose,
  onStartCompare,
  onClearCompare,
}: RegionPanelProps) {
  const { c, t, lang } = useTheme()
  const narrow = useIsNarrow()
  const [panelTyp, setPanelTyp] = useState<ElectionType>(mapTyp)

  useEffect(() => {
    setPanelTyp(mapTyp)
  }, [mapTyp, ags])

  const ep = ags ? `/api/wahlen/region/${encodeURIComponent(ags)}` : ''
  const { data, loading, error } = useApi<RegionResponse>(ep)

  const ep2 =
    compareAgs && compareAgs !== ags
      ? `/api/wahlen/region/${encodeURIComponent(compareAgs)}`
      : ''
  const { data: data2 } = useApi<RegionResponse>(ep2)

  const barElection = useMemo(() => {
    const list = data?.elections.filter((e) => e.typ === panelTyp) ?? []
    const hit = list.find((e) => e.year === mapYear)
    if (hit) return hit
    return [...list].sort((a, b) => b.year - a.year)[0]
  }, [data, panelTyp, mapYear])

  const barData = useMemo(() => rowToBarData(barElection), [barElection])

  const tsRows: TsRow[] = useMemo(() => {
    const e1 = data?.elections.filter((e) => e.typ === panelTyp) ?? []
    const byY = new Map(e1.map((e) => [e.year, e]))
    const e2 = data2?.elections.filter((e) => e.typ === panelTyp) ?? []
    const byY2 = new Map(e2.map((e) => [e.year, e]))
    const years = new Set([...byY.keys(), ...byY2.keys()])
    return [...years]
      .sort((a, b) => a - b)
      .map((year) => {
        const row: TsRow = { year }
        const a = byY.get(year)
        const b = byY2.get(year)
        for (const p of TIMESERIES_PARTIES) {
          row[p] =
            a?.[p] !== undefined
              ? toDisplayPercent(Number(a[p]))
              : undefined
          if (compareAgs && b && b[p] !== undefined)
            row[`${p}_cmp`] = toDisplayPercent(Number(b[p]))
        }
        return row
      })
  }, [data, data2, panelTyp, compareAgs])

  const compareLabel =
    data2?.ags_name ??
    (compareAgs ? agsNameMap[compareAgs] : undefined) ??
    compareAgs ??
    undefined

  if (!ags) return null

  return (
    <>
      <button
        type="button"
        aria-label={t('electionsClose')}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 120,
          background: c.overlay,
          border: 'none',
          cursor: 'pointer',
        }}
      />
      <aside
        style={{
          position: 'fixed',
          zIndex: 130,
          ...(narrow
            ? {
                left: 0,
                right: 0,
                bottom: 0,
                maxHeight: '88vh',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }
            : {
                top: 0,
                right: 0,
                bottom: 0,
                width: 400,
                maxWidth: '100vw',
              }),
          background: c.cardBg,
          borderLeft: narrow ? 'none' : `1px solid ${c.border}`,
          borderTop: narrow ? `1px solid ${c.border}` : 'none',
          boxShadow: narrow ? '0 -8px 32px rgba(0,0,0,0.12)' : c.shadow,
          overflowY: 'auto',
          padding: spacing.xl,
          paddingTop: narrow ? spacing.xl : spacing.xl,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <div>
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
              {loading
                ? '…'
                : (data?.ags_name ?? agsNameMap[ags] ?? ags)}
            </h2>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: '0.85rem',
                color: c.muted,
                marginTop: 6,
              }}
            >
              {data?.state_name ?? ''} · AGS {data?.ags ?? ags}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              minWidth: 44,
              minHeight: 44,
              borderRadius: 8,
              border: `1px solid ${c.border}`,
              background: c.inputBg,
              color: c.ink,
              fontSize: '1.25rem',
              lineHeight: 1,
              cursor: 'pointer',
            }}
            aria-label={t('electionsClose')}
          >
            ×
          </button>
        </div>

        {comparePicking && (
          <div
            style={{
              padding: spacing.md,
              marginBottom: spacing.lg,
              borderRadius: 8,
              background: c.bgAlt,
              border: `1px solid ${c.border}`,
              fontFamily: fonts.body,
              fontSize: '0.85rem',
              color: c.inkSoft,
            }}
          >
            {t('electionsPickSecond')}
          </div>
        )}

        {error && (
          <p style={{ color: c.no, fontFamily: fonts.body }}>{t('dataLoadError')}</p>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xl }}>
            <LoadingSpinner />
          </div>
        )}

        {!loading && data && (
          <>
            <div
              role="tablist"
              aria-label={t('electionType')}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: spacing.lg,
              }}
            >
              {PANEL_TYPES.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  role="tab"
                  aria-selected={panelTyp === tp}
                  onClick={() => setPanelTyp(tp)}
                  style={{
                    minHeight: 44,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: `1px solid ${panelTyp === tp ? c.red : c.border}`,
                    background: panelTyp === tp ? c.bgHover : c.inputBg,
                    color: c.ink,
                    fontFamily: fonts.body,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {tp === 'federal' && t('federal')}
                  {tp === 'state' && t('state')}
                  {tp === 'municipal' && t('municipal')}
                  {tp === 'european' && t('european')}
                </button>
              ))}
            </div>

            {barElection ? (
              <PartyBarChart
                data={barData}
                year={barElection.year}
                lang={lang}
              />
            ) : (
              <p style={{ color: c.muted, fontFamily: fonts.body }}>{t('noData')}</p>
            )}

            <h3
              style={{
                fontFamily: fonts.display,
                fontSize: '1.05rem',
                marginTop: spacing.xl,
                marginBottom: spacing.md,
                color: c.ink,
              }}
            >
              {t('electionYear')}
            </h3>
            <TimeSeriesChart
              data={tsRows}
              parties={TIMESERIES_PARTIES}
              lang={lang}
              compareLabel={compareAgs ? compareLabel : undefined}
            />

            <div style={{ marginTop: spacing.xl, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!compareAgs ? (
                <button
                  type="button"
                  onClick={onStartCompare}
                  style={{
                    minHeight: 44,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: `1px solid ${c.border}`,
                    background: c.inputBg,
                    color: c.ink,
                    fontFamily: fonts.body,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  + {t('addRegion')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClearCompare}
                  style={{
                    minHeight: 44,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: `1px solid ${c.border}`,
                    background: c.bgAlt,
                    color: c.ink,
                    fontFamily: fonts.body,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  {t('electionsClearCompare')} ({compareLabel})
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}
