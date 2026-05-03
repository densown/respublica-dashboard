import { useMemo, type CSSProperties } from 'react'
import { useTheme, StatWidget } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import { iso3ToFlagIso2 } from './worldIso3ToIso2'
import type { WorldCountryDetail, WorldGeoJson, WorldMapRow } from './worldTypes'
import './countrySidebar.css'

// FUTURE: CountryDataSection-Komponente pro Datenquelle
// Geplante Sektionen:
// - Wirtschaft (Weltbank)
// - Demokratie-Index (V-Dem)
// - Pressefreiheit (RSF)
// - Militär (SIPRI)
// - Wahlen (eigene DB)
// Jede Sektion: { title, source, lastUpdated, indicators: {label, value, unit, trend}[] }

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
  formatIndicatorValue: (v: number | null | undefined) => string
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

function formatGdpPerCapStat(v: number | null): string {
  if (v == null || Number.isNaN(v)) return '—'
  return `${v.toLocaleString('de-DE', { maximumFractionDigits: 0 })} $`
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
  formatIndicatorValue,
  countryDetail,
}: CountrySidebarProps) {
  const { c, t, lang } = useTheme()

  const iso2 = iso3 ? iso3ToFlagIso2(iso3, geojson) : null
  const flagUrl = iso2 ? `https://flagcdn.com/w40/${iso2}.png` : null

  const regionLabel = countryDetail?.region ?? '—'
  const populationDisplay = useMemo(() => {
    const v = lastIndicatorNumeric(countryDetail, 'SP.POP.TOTL')
    return formatPopulationStat(v, lang)
  }, [countryDetail, lang])

  const gdpPerCapDisplay = useMemo(() => {
    const v = lastIndicatorNumeric(countryDetail, 'NY.GDP.PCAP.CD')
    return formatGdpPerCapStat(v)
  }, [countryDetail])

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

  const statLabelStyle = {
    display: 'block' as const,
    fontFamily: fonts.mono,
    fontSize: '0.58rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: c.muted,
    marginBottom: spacing.xs,
  }

  const regionCellStyle: CSSProperties = {
    minWidth: 0,
    background: c.cardBg,
    border: `1px solid ${c.cardBorder}`,
    borderRadius: 6,
    padding: spacing.md,
    boxShadow: c.shadow,
  }

  const inner = (
    <>
      <div
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
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, minWidth: 0 }}>
          {flagUrl ? (
            <img
              src={flagUrl}
              width={40}
              height={28}
              alt=""
              style={{
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
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: c.text,
                lineHeight: 1.2,
              }}
            >
              {countryName}
            </h2>
            {iso3 && (
              <p
                style={{
                  margin: `${spacing.xs}px 0 0`,
                  fontFamily: fonts.mono,
                  fontSize: '0.72rem',
                  color: c.muted,
                }}
              >
                {iso3}
              </p>
            )}
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
      </div>

      <div style={{ paddingTop: spacing.md, flexShrink: 0 }}>
        <h3
          style={{
            margin: `0 0 ${spacing.sm}px`,
            fontFamily: fonts.display,
            fontSize: '0.95rem',
            fontWeight: 700,
            color: c.text,
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
            <div style={regionCellStyle}>
              <span style={statLabelStyle}>{t('worldSidebarStatRegion')}</span>
              <div
                title={regionLabel}
                style={{
                  fontFamily: fonts.body,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: c.text,
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {regionLabel}
              </div>
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <StatWidget
              fluid
              label={t('worldSidebarStatPopulation')}
              value={populationDisplay}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <StatWidget fluid label={t('worldSidebarStatGdpPc')} value={gdpPerCapDisplay} />
          </div>
          <div style={{ minWidth: 0 }}>
            <StatWidget fluid label={activeIndicatorLabel} value={activeValue} />
          </div>
        </div>
      </div>

      <div style={{ paddingTop: spacing.lg, flexShrink: 0 }}>
        <h3
          style={{
            margin: `0 0 ${spacing.sm}px`,
            fontFamily: fonts.display,
            fontSize: '0.95rem',
            fontWeight: 700,
            color: c.text,
          }}
        >
          {t('worldSidebarMoreTitle')}
        </h3>
        <p
          style={{
            margin: 0,
            fontFamily: fonts.body,
            fontSize: '0.88rem',
            lineHeight: 1.45,
            color: c.muted,
          }}
        >
          {t('worldSidebarMorePlaceholder')}
        </p>
      </div>

      <div
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
            fontFamily: fonts.mono,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            color: c.muted,
            textDecoration: 'none',
          }}
        >
          {t('worldSidebarFooterLink')}
        </a>
      </div>
    </>
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
          }}
        >
          {inner}
        </div>
      ) : null}
    </aside>
  )
}
