import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { DataCard, useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import type { Lang } from '../../design-system/ThemeContext'
import { useDebouncedValue } from '../elections/useDebouncedValue'
import { CountryAutocomplete } from './CountryAutocomplete'
import { IndicatorSelector } from './IndicatorSelector'
import { WorldMapLegend } from './WorldMapLegend'
import { WorldGlMap } from './WorldGlMap'
import type {
  WorldCategoryApi,
  WorldGeoJson,
  WorldMapRow,
  WorldStats,
} from './worldTypes'
import {
  formatWorldIndicatorValue,
  shortenWorldUnit,
} from './worldValueFormat'

type WorldMapModeProps = {
  narrow: boolean
  geojson: WorldGeoJson | null
  categories: WorldCategoryApi[] | null
  categoryId: string
  setCategoryId: (id: string) => void
  indicatorCode: string
  setIndicatorCode: (code: string) => void
  year: number
  setYear: (y: number) => void
  stats: WorldStats | null
  selectedIso: string | null
  onSelectCountry: (iso3: string) => void
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

function categoryAndUnitForIndicator(
  categories: WorldCategoryApi[] | null,
  code: string,
): { category: string; unit: string | null } {
  if (!categories) return { category: 'economy', unit: null }
  for (const cat of categories) {
    const hit = cat.indicators.find((i) => i.code === code)
    if (hit) return { category: cat.id, unit: hit.unit }
  }
  return { category: 'economy', unit: null }
}

export function WorldMapMode({
  narrow,
  geojson,
  categories,
  categoryId,
  setCategoryId,
  indicatorCode,
  setIndicatorCode,
  year,
  setYear,
  stats,
  selectedIso,
  onSelectCountry,
}: WorldMapModeProps) {
  const { c, t, lang } = useTheme()

  const debInd = useDebouncedValue(indicatorCode, 280)
  const debYear = useDebouncedValue(year, 280)

  const yrRange = stats?.years_range
  const [mapFallbackSteps, setMapFallbackSteps] = useState(0)

  useEffect(() => {
    setMapFallbackSteps(0)
  }, [debInd, debYear])

  const mapQueryYear = useMemo(() => {
    if (!yrRange) return debYear
    return Math.max(yrRange.min, debYear - mapFallbackSteps)
  }, [debYear, mapFallbackSteps, yrRange])

  const mapEp = debInd
    ? `/api/world/map?indicator=${encodeURIComponent(debInd)}&year=${String(mapQueryYear)}`
    : ''
  const { data: mapRows, loading: mapLoading, error: mapError } =
    useApi<WorldMapRow[]>(mapEp)

  const mapHasNumericData = useMemo(
    () =>
      (mapRows ?? []).some(
        (r) => r.value != null && !Number.isNaN(r.value as number),
      ),
    [mapRows],
  )

  useEffect(() => {
    if (!debInd) return
    if (mapLoading) return
    if (mapError) return
    if (!yrRange) return
    if (mapHasNumericData) return
    if (mapFallbackSteps >= 5) return
    const curQy = Math.max(yrRange.min, debYear - mapFallbackSteps)
    const nextQy = Math.max(yrRange.min, debYear - mapFallbackSteps - 1)
    if (nextQy >= curQy) return
    setMapFallbackSteps((s) => s + 1)
  }, [
    debInd,
    debYear,
    mapRows,
    mapLoading,
    mapError,
    mapFallbackSteps,
    yrRange,
    mapHasNumericData,
  ])

  const showYearFallbackHint =
    mapFallbackSteps > 0 &&
    mapHasNumericData &&
    mapQueryYear !== debYear

  const { category, unit } = useMemo(
    () => categoryAndUnitForIndicator(categories, indicatorCode),
    [categories, indicatorCode],
  )

  const fmtCtx = useMemo(
    () => ({
      indicatorCode,
      category,
      unit,
      lang: lang as Lang,
    }),
    [indicatorCode, category, unit, lang],
  )

  const formatValue = useMemo(() => {
    return (v: number | null | undefined) => {
      if (v == null || Number.isNaN(v)) return '—'
      return formatWorldIndicatorValue(v, fmtCtx)
    }
  }, [fmtCtx])

  const unitShort = useMemo(
    () => shortenWorldUnit(unit, lang as Lang),
    [unit, lang],
  )

  const nameByIso = useMemo(() => {
    const m = new Map<string, string>()
    if (!geojson) return m
    for (const f of geojson.features) {
      const iso = f.properties.iso3?.toUpperCase()
      if (iso) m.set(iso, f.properties.name)
    }
    return m
  }, [geojson])

  const { minV, maxV, avgV, withData, hiRow, loRow } = useMemo(() => {
    const rows = (mapRows ?? []).filter(
      (r) => r.value != null && !Number.isNaN(r.value as number),
    )
    if (!rows.length) {
      return {
        minV: 0,
        maxV: 1,
        avgV: 0,
        withData: 0,
        hiRow: null as WorldMapRow | null,
        loRow: null as WorldMapRow | null,
      }
    }
    let sum = 0
    let hi = rows[0]!
    let lo = rows[0]!
    for (const r of rows) {
      const v = r.value as number
      sum += v
      if (v > (hi.value as number)) hi = r
      if (v < (lo.value as number)) lo = r
    }
    const min = lo.value as number
    const max = hi.value as number
    return {
      minV: min,
      maxV: max === min ? min + 1e-9 : max,
      avgV: sum / rows.length,
      withData: rows.length,
      hiRow: hi,
      loRow: lo,
    }
  }, [mapRows])

  const hiName =
    hiRow &&
    (nameByIso.get(norm(hiRow.country_code)) ??
      hiRow.country_name ??
      hiRow.country_code)
  const loName =
    loRow &&
    (nameByIso.get(norm(loRow.country_code)) ??
      loRow.country_name ??
      loRow.country_code)

  const yearOpts = useMemo(() => {
    const yr = stats?.years_range
    if (!yr) return [] as number[]
    const out: number[] = []
    for (let y = yr.max; y >= yr.min; y--) out.push(y)
    return out
  }, [stats])

  const statCard = (title: string, body: string) => (
    <DataCard
      header={
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: narrow ? '0.72rem' : '0.8rem',
            color: c.muted,
          }}
        >
          {title}
        </span>
      }
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: narrow ? '0.92rem' : '1.05rem',
          color: c.text,
          lineHeight: 1.45,
        }}
      >
        {body}
      </div>
    </DataCard>
  )

  const labelSpan = (text: string) => (
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

  return (
    <div style={{ marginTop: spacing.lg }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow
            ? 'repeat(2, minmax(0, 1fr))'
            : 'repeat(4, minmax(0, 1fr))',
          gap: narrow ? spacing.sm : spacing.md,
          marginBottom: spacing.lg,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          alignItems: 'end',
        }}
      >
        <IndicatorSelector
          categories={categories}
          categoryId={categoryId}
          indicatorCode={indicatorCode}
          onCategoryId={setCategoryId}
          onIndicatorCode={setIndicatorCode}
          lang={lang as Lang}
          disabled={!categories?.length}
          narrow={narrow}
          selectCss={() => selectCss(c)}
          labelSpan={labelSpan}
          asGridCells
          compact
        />
        <label style={{ minWidth: 0 }}>
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
        <div style={{ minWidth: 0 }}>
          {labelSpan(t('worldSearchCountry'))}
          <CountryAutocomplete
            geojson={geojson}
            onSelect={onSelectCountry}
            placeholder={t('worldSearchCountry')}
          />
        </div>
      </div>

      {mapError && (
        <p
          style={{
            marginBottom: spacing.md,
            color: c.red,
            fontFamily: fonts.body,
            fontSize: '0.9rem',
          }}
        >
          {t('dataLoadError')}
        </p>
      )}

      {showYearFallbackHint && (
        <p
          style={{
            marginBottom: spacing.sm,
            color: c.muted,
            fontFamily: fonts.body,
            fontSize: narrow ? '0.8rem' : '0.88rem',
            lineHeight: 1.45,
          }}
        >
          {t('worldMapYearFallback')
            .replace('{requested}', String(debYear))
            .replace('{shown}', String(mapQueryYear))}
        </p>
      )}

      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <WorldGlMap
          geojson={geojson}
          mapData={mapRows ?? []}
          category={category}
          valueMin={minV}
          valueMax={maxV}
          nameByIso={nameByIso}
          onSelectCountry={onSelectCountry}
          selectedIso={selectedIso}
          formatValue={formatValue}
          loading={mapLoading}
          narrow={narrow}
          mapHeightPx={narrow ? 350 : 500}
        />
      </div>

      <WorldMapLegend
        category={category}
        labelMin={formatValue(minV)}
        labelMax={formatValue(maxV)}
        unitShort={unitShort}
        compact={narrow}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow
            ? 'repeat(2, minmax(0, 1fr))'
            : 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: spacing.md,
          marginTop: spacing.xl,
          width: '100%',
          maxWidth: '100%',
        }}
      >
        {statCard(
          t('worldHighest'),
          hiRow && hiName
            ? `${hiName} · ${formatValue(hiRow.value)}`
            : '—',
        )}
        {statCard(
          t('worldLowest'),
          loRow && loName
            ? `${loName} · ${formatValue(loRow.value)}`
            : '—',
        )}
        {statCard(t('worldMapAverage'), formatValue(avgV))}
        {statCard(t('worldCountriesWithData'), String(withData))}
      </div>
    </div>
  )
}

function norm(code: string): string {
  return code.trim().toUpperCase()
}
