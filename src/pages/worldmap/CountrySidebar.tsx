import { useMemo, type CSSProperties } from 'react'
import { useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import { iso3ToFlagIso2 } from './worldIso3ToIso2'
import type { WorldCountryDetail, WorldGeoJson, WorldMapRow } from './worldTypes'
import './countrySidebar.css'

export type CountrySidebarProps = {
  iso3: string | null
  isOpen: boolean
  onClose: () => void
  /** Mobile Bottom-Sheet vs. Desktop-Dock */
  sheetLayout: boolean
  geojson: WorldGeoJson | null
  countryName: string
  selectedRow: WorldMapRow | null
  activeIndicatorLabel: string
  /** z. B. World-Bank-Code; für Fallback aus countryDetail.indicators */
  activeIndicatorCode: string
  /** Kategorie-ID des aktuellen Indikators (z. B. economy) — für „Weitere Indikatoren“ */
  activeIndicatorCategory: string
  /** Jahr des auf der Karte angezeigten Wertes */
  mapDisplayYear: number
  /** Kurz-Einheit des aktiven Indikators (Legende) */
  activeIndicatorUnitShort: string
  formatIndicatorValue: (v: number | null | undefined) => string
  /** Formatierung beliebiger Indikatoren-Codes (Weitere Indikatoren) */
  formatAnyIndicatorValue: (indicatorCode: string, value: number) => string
  countryDetail: WorldCountryDetail | null
}

function lastIndicatorNumeric(
  detail: WorldCountryDetail | null,
  code: string,
): number | null {
  if (!detail?.indicators) return null
  const ind = detail.indicators.find((i) => i.indicator_code === code)
  if (!ind?.values?.length) return null
  const sorted = [...ind.values].sort((a, b) => b.year - a.year)
  for (const row of sorted) {
    if (row.value != null && !Number.isNaN(row.value)) return row.value
  }
  return null
}

function latestObservation(
  ind: WorldCountryDetail['indicators'][number],
): { year: number; value: number } | null {
  if (!ind.values?.length) return null
  const sorted = [...ind.values].sort((a, b) => b.year - a.year)
  for (const row of sorted) {
    if (row.value != null && !Number.isNaN(row.value)) {
      return { year: row.year, value: row.value }
    }
  }
  return null
}

function pickOtherIndicators(
  detail: WorldCountryDetail | null,
  activeCode: string,
  activeCategory: string,
  formatVal: (code: string, v: number) => string,
  limit: number,
): Array<{ name: string; displayValue: string }> {
  if (!detail?.indicators?.length) return []
  type Row = {
    name: string
    displayValue: string
    year: number
    preferOtherCat: boolean
  }
  const rows: Row[] = []
  for (const ind of detail.indicators) {
    if (ind.indicator_code === activeCode) continue
    const obs = latestObservation(ind)
    if (!obs) continue
    const preferOtherCat = Boolean(
      ind.category && ind.category !== activeCategory,
    )
    rows.push({
      name: ind.name,
      displayValue: formatVal(ind.indicator_code, obs.value),
      year: obs.year,
      preferOtherCat,
    })
  }
  rows.sort((a, b) => {
    if (a.preferOtherCat !== b.preferOtherCat) return a.preferOtherCat ? -1 : 1
    if (b.year !== a.year) return b.year - a.year
    return a.name.localeCompare(b.name)
  })
  return rows.slice(0, limit).map(({ name, displayValue }) => ({ name, displayValue }))
}

function formatPopulationStat(v: number | null, lang: string): string {
  if (v == null || Number.isNaN(v)) return '—'
  if (v > 1_000_000) {
    const mio = v / 1_000_000
    const dec = mio >= 100 ? 0 : mio >= 10 ? 1 : 2
    const s = mio.toFixed(dec)
    return lang === 'de' ? `${s.replace('.', ',')} Mio.` : `${s} mil.`
  }
  return Math.round(v).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US')
}

function formatGdpPerCapStat(v: number | null, lang: string): string {
  if (v == null || Number.isNaN(v)) return '—'
  return `${v.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { maximumFractionDigits: 0 })} $`
}

const MONO_LABEL: CSSProperties = {
  display: 'block',
  fontFamily: fonts.mono,
  fontSize: 9,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 6,
  lineHeight: 1.2,
}

export function CountrySidebar({
  iso3,
  isOpen,
  onClose,
  sheetLayout,
  geojson,
  countryName,
  selectedRow,
  activeIndicatorLabel,
  activeIndicatorCode,
  activeIndicatorCategory,
  mapDisplayYear,
  activeIndicatorUnitShort,
  formatIndicatorValue,
  formatAnyIndicatorValue,
  countryDetail,
}: CountrySidebarProps) {
  const { c, t, lang } = useTheme()

  const iso2 = iso3 ? iso3ToFlagIso2(iso3, geojson) : null
  const flagUrl = iso2 ? `https://flagcdn.com/w40/${iso2}.png` : null

  const regionLabel = countryDetail?.region ?? '—'
  const incomeDisplay =
    countryDetail?.income_level ?? selectedRow?.income_level ?? '—'

  const populationDisplay = useMemo(() => {
    const v = lastIndicatorNumeric(countryDetail, 'SP.POP.TOTL')
    return formatPopulationStat(v, lang)
  }, [countryDetail, lang])

  const gdpPerCapDisplay = useMemo(() => {
    const v = lastIndicatorNumeric(countryDetail, 'NY.GDP.PCAP.CD')
    return formatGdpPerCapStat(v, lang)
  }, [countryDetail, lang])

  const activeValue = useMemo(() => {
    const rv = selectedRow?.value
    if (rv != null && !Number.isNaN(rv as number)) {
      return formatIndicatorValue(rv)
    }
    const ind = countryDetail?.indicators?.find(
      (i) => i.indicator_code === activeIndicatorCode,
    )
    const vals = ind?.values
    const last = vals?.length ? vals[vals.length - 1]?.value : undefined
    return last != null ? formatIndicatorValue(last) : '—'
  }, [
    selectedRow,
    countryDetail,
    activeIndicatorCode,
    formatIndicatorValue,
  ])

  const otherIndicators = useMemo(
    () =>
      pickOtherIndicators(
        countryDetail,
        activeIndicatorCode,
        activeIndicatorCategory,
        formatAnyIndicatorValue,
        4,
      ),
    [
      countryDetail,
      activeIndicatorCode,
      activeIndicatorCategory,
      formatAnyIndicatorValue,
    ],
  )

  const otherSlots = useMemo(() => {
    const out = [...otherIndicators]
    while (out.length < 4) {
      out.push({ name: '', displayValue: '—' })
    }
    return out.slice(0, 4)
  }, [otherIndicators])

  const unitYearLine = useMemo(() => {
    const u = activeIndicatorUnitShort.trim()
    if (u) return `${u} · ${mapDisplayYear}`
    return String(mapDisplayYear)
  }, [activeIndicatorUnitShort, mapDisplayYear])

  const coreCell = (label: string, value: string, title?: string) => (
    <div
      style={{
        minWidth: 0,
        background: c.cardBg,
        border: `1px solid ${c.cardBorder}`,
        borderRadius: 6,
        padding: spacing.md,
        boxShadow: c.shadow,
      }}
    >
      <span style={{ ...MONO_LABEL, color: c.muted }}>{label}</span>
      <div
        title={title ?? value}
        style={{
          fontFamily: fonts.display,
          fontSize: '1.15rem',
          fontWeight: 700,
          color: c.text,
          lineHeight: 1.15,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {value}
      </div>
    </div>
  )

  const inner = (
    <div className="country-sidebar__panel">
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingBottom: spacing.md,
          borderBottom: `1px solid ${c.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
            flex: 1,
          }}
        >
          {flagUrl ? (
            <img
              src={flagUrl}
              width={40}
              height={28}
              alt=""
              style={{
                width: 40,
                height: 28,
                borderRadius: 4,
                objectFit: 'cover',
                border: `1px solid ${c.border}`,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 28,
                borderRadius: 4,
                background: c.bgHover,
                border: `1px solid ${c.border}`,
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontFamily: fonts.mono,
                fontSize: 9,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: c.muted,
                lineHeight: 1.3,
              }}
            >
              {t('worldSidebarProfile')}
              {iso3 ? (
                <>
                  {' '}
                  <span style={{ color: c.subtle }}>·</span> {iso3}
                </>
              ) : null}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('worldSidebarClose')}
          style={{
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.cardBg,
            color: c.text,
            cursor: 'pointer',
            flexShrink: 0,
            fontFamily: fonts.mono,
            fontSize: '1.1rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </header>

      <div style={{ paddingTop: spacing.md, flexShrink: 0 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 28,
            fontWeight: 700,
            color: c.text,
            lineHeight: 1.15,
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <span style={{ minWidth: 0 }}>{countryName}</span>
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: c.red,
              flexShrink: 0,
              position: 'relative',
              top: 2,
            }}
          />
        </h2>
      </div>

      <section style={{ paddingTop: spacing.lg, flexShrink: 0 }}>
        <span style={{ ...MONO_LABEL, color: c.muted }}>{activeIndicatorLabel}</span>
        <p
          style={{
            margin: `4px 0 0`,
            fontFamily: fonts.display,
            fontSize: 42,
            fontWeight: 700,
            color: c.text,
            lineHeight: 1,
            wordBreak: 'break-word',
          }}
        >
          {activeValue}
        </p>
        <p
          style={{
            margin: `${spacing.sm}px 0 0`,
            fontFamily: fonts.body,
            fontSize: 13,
            color: c.muted,
            lineHeight: 1.35,
          }}
        >
          {unitYearLine}
        </p>
      </section>

      <section style={{ paddingTop: spacing.lg, flexShrink: 0 }}>
        <h3
          style={{
            margin: `0 0 ${spacing.sm}px`,
            fontFamily: fonts.mono,
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: c.muted,
          }}
        >
          {t('worldSidebarCoreTitle')}
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: spacing.sm,
          }}
        >
          <div style={{ minWidth: 0 }}>
            {coreCell(t('worldSidebarStatRegion'), regionLabel, regionLabel)}
          </div>
          <div style={{ minWidth: 0 }}>
            {coreCell(t('worldSidebarStatPopulation'), populationDisplay)}
          </div>
          <div style={{ minWidth: 0 }}>
            {coreCell(t('worldSidebarStatGdpPc'), gdpPerCapDisplay)}
          </div>
          <div style={{ minWidth: 0 }}>
            {coreCell(t('worldSidebarStatIncomeLevel'), incomeDisplay, incomeDisplay)}
          </div>
        </div>
      </section>

      <section style={{ paddingTop: spacing.lg, flexShrink: 0 }}>
        <h3
          style={{
            margin: `0 0 ${spacing.sm}px`,
            fontFamily: fonts.mono,
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: c.muted,
          }}
        >
          {t('worldSidebarMoreIndicatorsTitle')}
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: spacing.sm,
          }}
        >
          {otherSlots.map((slot, i) => (
            <div
              key={`${slot.name}-${i}`}
              style={{
                minWidth: 0,
                background: c.cardBg,
                border: `1px solid ${c.cardBorder}`,
                borderRadius: 6,
                padding: spacing.md,
                boxShadow: c.shadow,
              }}
            >
              <span
                style={{
                  ...MONO_LABEL,
                  color: c.muted,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  whiteSpace: 'normal',
                }}
              >
                {slot.name || t('worldSidebarMetricPending')}
              </span>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  fontWeight: 700,
                  color: c.text,
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {slot.displayValue}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          marginTop: 'auto',
          paddingTop: spacing.lg,
          flexShrink: 0,
        }}
      >
        <a
          href="https://respublica.media"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: fonts.body,
            fontSize: 13,
            color: c.muted,
            textDecoration: 'none',
          }}
        >
          <span>{t('worldSidebarSourcesLine')}</span>
          <span style={{ fontFamily: fonts.mono, color: c.red }} aria-hidden>
            →
          </span>
        </a>
      </footer>
    </div>
  )

  const asideStyle: CSSProperties = sheetLayout
    ? {
        background: c.cardBg,
        color: c.text,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        padding: spacing.lg,
        pointerEvents: isOpen ? 'auto' : 'none',
      }
    : {
        background: c.cardBg,
        color: c.text,
        borderLeft: isOpen ? `1px solid ${c.border}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'width 0.25s ease, border-color 0.2s ease',
        width: isOpen ? 320 : 0,
        flexShrink: 0,
        padding: isOpen ? spacing.lg : 0,
      }

  const showBody = Boolean(iso3) && (sheetLayout ? isOpen : isOpen)

  return (
    <aside
      className={`country-sidebar ${sheetLayout ? 'country-sidebar--sheet' : ''} ${isOpen ? 'country-sidebar--open' : ''}`}
      style={asideStyle}
      aria-hidden={!isOpen || !iso3}
    >
      {showBody ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
            minWidth: 0,
          }}
        >
          {inner}
        </div>
      ) : null}
    </aside>
  )
}
