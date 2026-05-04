import { useMemo, useState, type CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'
import { HS_SECTION_LABELS_DE, HS_SECTION_LABELS_EN } from '../hsSections'
import { fonts, spacing } from '../tokens'

export type HSSectionRow = {
  hs_section: string
  value_usd: number
}

export type HSSectionBreakdownMode = 'export' | 'import'

export type HSSectionBreakdownProps = {
  sectionsExport: HSSectionRow[]
  sectionsImport: HSSectionRow[]
  mode: HSSectionBreakdownMode
  sourceLabel: string
  style?: CSSProperties
}

function fmtUsd(v: number, locale: string, lang: string) {
  if (v >= 1e9) {
    const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v / 1e9)
    return lang === 'de' ? `${n} Mrd. $` : `${n} bn $`
  }
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v / 1e6)
  return lang === 'de' ? `${n} Mio. $` : `${n} m $`
}

export default function HSSectionBreakdown({
  sectionsExport,
  sectionsImport,
  mode,
  sourceLabel,
  style,
}: HSSectionBreakdownProps) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const compact = typeof window !== 'undefined' && window.innerWidth <= 360
  const [active, setActive] = useState<string | null>(null)

  const rows = useMemo(() => {
    const src = mode === 'export' ? sectionsExport : sectionsImport
    return [...(src || [])]
      .filter((r) => Number.isFinite(r.value_usd) && r.value_usd > 0)
      .sort((a, b) => b.value_usd - a.value_usd)
  }, [mode, sectionsExport, sectionsImport])

  if (!rows.length) {
    return (
      <div style={{ ...style }}>
        <div style={{ color: c.muted, fontFamily: fonts.body, fontSize: 12, fontStyle: 'italic' }}>
          {t('worldConsoleTradeNoBreakdownData')}
        </div>
      </div>
    )
  }

  const max = Math.max(...rows.map((r) => r.value_usd), 1)
  const activeRow = rows.find((r) => r.hs_section === active) ?? rows[0]!

  return (
    <div style={style}>
      {rows.map((r) => {
        const pct = Math.min(100, (r.value_usd / max) * 100)
        const isActive = r.hs_section === activeRow.hs_section
        const labels = lang === 'de' ? HS_SECTION_LABELS_DE : HS_SECTION_LABELS_EN
        const sectionLabel = labels[r.hs_section] || labels.OTHER
        return (
          <button
            key={r.hs_section}
            type="button"
            onClick={() => setActive(r.hs_section)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              border: 'none',
              background: 'transparent',
              padding: 0,
              marginBottom: spacing.sm,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 4,
                gap: spacing.sm,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  flexWrap: 'wrap',
                  alignItems: 'baseline',
                  gap: 4,
                  fontSize: 10,
                  lineHeight: 1.35,
                }}
              >
                {!compact ? <span style={{ fontFamily: fonts.mono, color: c.muted }}>{r.hs_section}</span> : null}
                {!compact ? <span style={{ fontFamily: fonts.mono, color: c.muted }}>·</span> : null}
                <span style={{ fontFamily: fonts.body, color: c.ink }}>{sectionLabel}</span>
              </span>
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.muted }}>
                {fmtUsd(r.value_usd, locale, lang)}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: c.bgHover, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: mode === 'export' ? c.yes : c.no,
                  opacity: isActive ? 1 : 0.75,
                  transition: 'width 0.3s ease-out, opacity 0.3s ease-out',
                }}
              />
            </div>
          </button>
        )
      })}
      <div style={{ marginTop: spacing.xs, fontFamily: fonts.mono, fontSize: 10, color: c.muted }}>
        {(lang === 'de' ? HS_SECTION_LABELS_DE[activeRow.hs_section] : HS_SECTION_LABELS_EN[activeRow.hs_section]) ||
          activeRow.hs_section}
        : {fmtUsd(activeRow.value_usd, locale, lang)}
      </div>
      <div style={{ marginTop: spacing.xs, fontFamily: fonts.body, fontSize: 11, color: c.muted }}>{sourceLabel}</div>
    </div>
  )
}
