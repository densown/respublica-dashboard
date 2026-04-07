import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { EmptyState, useTheme } from '../../design-system'
import type { Lang } from '../../design-system/ThemeContext'
import { fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import {
  hasWorldBankRegionOnAnyRow,
  isRealCountry,
} from '../../utils/worldFilters'
import { IndicatorSelector } from './IndicatorSelector'
import { iso3ToFlagIso2 } from './worldIso3ToIso2'
import { worldIndicatorShortLabel } from './worldIndicatorShortNames'
import type {
  WorldCategoryApi,
  WorldGeoJson,
  WorldRankingRow,
} from './worldTypes'
import { formatWorldValue } from './worldValueFormat'

type WorldRankingModeProps = {
  narrow: boolean
  geojson: WorldGeoJson | null
  categories: WorldCategoryApi[] | null
  categoryId: string
  setCategoryId: (id: string) => void
  indicatorCode: string
  setIndicatorCode: (code: string) => void
  year: number
  setYear: (y: number) => void
  statsYears: { min: number; max: number } | null
  /** u. a. DEU hervorheben */
  highlightIso3: string
}

function selectCss(c: {
  cardBg: string
  border: string
  text: string
}): CSSProperties {
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
    maxWidth: '100%',
    boxSizing: 'border-box',
  }
}

export function WorldRankingMode({
  narrow,
  geojson,
  categories,
  categoryId,
  setCategoryId,
  indicatorCode,
  setIndicatorCode,
  year,
  setYear,
  statsYears,
  highlightIso3,
}: WorldRankingModeProps) {
  const { c, t, lang } = useTheme()
  const L = lang as Lang

  const rankEp =
    indicatorCode && year
      ? `/api/world/ranking?indicator=${encodeURIComponent(indicatorCode)}&year=${String(year)}&limit=5000&order=desc`
      : ''
  const { data: rankingRaw, loading, error } = useApi<WorldRankingRow[]>(rankEp)

  const rankingRows = useMemo(() => {
    const raw = rankingRaw ?? []
    const regionAware = hasWorldBankRegionOnAnyRow(raw)
    const list = regionAware ? raw.filter(isRealCountry) : raw
    return list.map((r, i) => ({ ...r, rank: i + 1 }))
  }, [rankingRaw])

  const [query, setQuery] = useState('')

  const yearOpts = useMemo(() => {
    const yr = statsYears
    if (!yr) return [] as number[]
    const out: number[] = []
    for (let y = yr.max; y >= yr.min; y--) out.push(y)
    return out
  }, [statsYears])

  const unitMeta = useMemo(() => {
    if (!categories) return null
    for (const cat of categories) {
      const hit = cat.indicators.find((i) => i.code === indicatorCode)
      if (hit) return hit.unit
    }
    return null
  }, [categories, indicatorCode])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = rankingRows
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.country_name?.toLowerCase().includes(q) ||
        r.country_code.toLowerCase().includes(q),
    )
  }, [rankingRows, query])

  const maxV = useMemo(() => {
    if (!filtered.length) return 1
    return Math.max(...filtered.map((r) => r.value))
  }, [filtered])

  const labelSpan = (text: string): ReactNode => (
    <span
      style={{
        display: 'block',
        fontFamily: fonts.body,
        fontSize: '0.8rem',
        color: c.muted,
        marginBottom: 6,
      }}
    >
      {text}
    </span>
  )

  const exportCsv = useCallback(() => {
    if (!filtered.length) return
    const sep = ';'
    const lines = [['rank', 'country_code', 'country_name', 'value'].join(sep)]
    for (const r of filtered) {
      lines.push(
        [
          String(r.rank),
          r.country_code,
          `"${(r.country_name || r.country_code).replace(/"/g, '""')}"`,
          String(r.value),
        ].join(sep),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const slug = worldIndicatorShortLabel(indicatorCode, L).replace(/[^\w\-]+/g, '_')
    a.download = `world_ranking_${slug}_${year}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [filtered, indicatorCode, L, year])

  const hi = highlightIso3.trim().toUpperCase()

  return (
    <div style={{ marginTop: spacing.lg }}>
      <h2
        style={{
          fontFamily: fonts.body,
          fontSize: 'clamp(1.1rem, 3.5vw, 1.4rem)',
          fontWeight: 700,
          color: c.text,
          margin: `0 0 ${spacing.lg}`,
        }}
      >
        {t('worldRankingTitle')}
      </h2>

      <div style={{ marginBottom: spacing.lg }}>
        <IndicatorSelector
          categories={categories}
          categoryId={categoryId}
          indicatorCode={indicatorCode}
          onCategoryId={setCategoryId}
          onIndicatorCode={setIndicatorCode}
          lang={L}
          disabled={!categories?.length}
          narrow={narrow}
          selectCss={() => selectCss(c)}
          labelSpan={labelSpan}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
          marginBottom: spacing.lg,
          alignItems: 'flex-end',
        }}
      >
        <label style={{ flex: '0 1 160px', minWidth: 120 }}>
          {labelSpan(t('worldYear'))}
          <select
            value={year}
            disabled={!yearOpts.length}
            onChange={(e) => setYear(Number(e.target.value))}
            style={selectCss(c)}
          >
            {yearOpts.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: '1 1 220px', minWidth: 0 }}>
          {labelSpan(t('worldRankingFilter'))}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('worldRankingFilter')}
            style={{
              ...selectCss(c),
              minHeight: 44,
            }}
          />
        </label>
        <button
          type="button"
          onClick={exportCsv}
          style={{
            fontFamily: fonts.mono,
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            border: `1px solid ${c.border}`,
            background: c.cardBg,
            color: c.text,
            padding: `${spacing.sm} ${spacing.md}`,
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {t('exportCsv')}
        </button>
      </div>

      {error && (
        <p style={{ color: c.red, fontFamily: fonts.body }}>{t('dataLoadError')}</p>
      )}
      {loading && !rankingRaw && (
        <p style={{ color: c.muted }}>{t('loading')}</p>
      )}
      {!loading && rankingRows.length === 0 && (
        <EmptyState text={t('worldNoValue')} />
      )}

      {filtered.length > 0 && (
        <div
          style={{
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            overflow: 'hidden',
            background: c.cardBg,
          }}
        >
          {filtered.map((r) => {
          const top10 = r.rank <= 10
          const isHi = r.country_code.toUpperCase() === hi
          const flag = iso3ToFlagIso2(r.country_code, geojson)
          const pct = maxV > 0 ? Math.round((r.value / maxV) * 100) : 0
          return (
            <div
              key={`${r.country_code}-${r.rank}`}
              style={{
                display: 'grid',
                gridTemplateColumns: narrow
                  ? '36px 28px 1fr'
                  : '44px 36px minmax(0, 1fr) 120px 1fr',
                gap: narrow ? spacing.sm : spacing.md,
                alignItems: 'center',
                padding: `${spacing.sm} ${spacing.md}`,
                borderBottom: `1px solid ${c.border}`,
                background: top10
                  ? `${c.red}0d`
                  : isHi
                    ? `${c.yes}14`
                    : undefined,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: '0.82rem',
                  fontWeight: top10 ? 700 : 400,
                  color: c.text,
                }}
              >
                {r.rank}
              </div>
              <div>
                {flag ? (
                  <img
                    src={`https://flagcdn.com/w40/${flag}.png`}
                    width={28}
                    height={20}
                    alt=""
                    style={{
                      borderRadius: 3,
                      border: `1px solid ${c.border}`,
                      display: 'block',
                    }}
                  />
                ) : (
                  <span style={{ color: c.muted }}>—</span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '0.9rem',
                    color: c.text,
                    fontWeight: isHi ? 700 : 400,
                  }}
                >
                  {r.country_name || r.country_code}
                  {isHi && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontFamily: fonts.mono,
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        color: c.red,
                      }}
                    >
                      {t('worldRankingYou')}
                    </span>
                  )}
                </div>
                {!narrow && (
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: '0.72rem',
                      color: c.muted,
                    }}
                  >
                    {r.country_code}
                  </div>
                )}
              </div>
              {!narrow && (
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: '0.88rem',
                    textAlign: 'right',
                    color: c.text,
                  }}
                >
                  {formatWorldValue(r.value, unitMeta, indicatorCode, L)}
                </div>
              )}
              <div
                style={{
                  gridColumn: narrow ? '1 / -1' : undefined,
                  height: 8,
                  borderRadius: 4,
                  background: c.bg,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: top10 ? c.red : c.inkSoft,
                    borderRadius: 4,
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              {narrow && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    fontFamily: fonts.mono,
                    fontSize: '0.85rem',
                    color: c.text,
                  }}
                >
                  {formatWorldValue(r.value, unitMeta, indicatorCode, L)}
                </div>
              )}
            </div>
          )
        })}
        </div>
      )}
    </div>
  )
}
