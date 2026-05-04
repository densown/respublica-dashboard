import { useMemo, useState, type CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'
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

function fmtUsd(v: number, locale: string) {
  if (v >= 1e9) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v / 1e9)} B$`
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v / 1e6)} M$`
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
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.ink }}>{r.hs_section}</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.muted }}>
                {fmtUsd(r.value_usd, locale)}
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
        {activeRow.hs_section}: {fmtUsd(activeRow.value_usd, locale)}
      </div>
      <div style={{ marginTop: spacing.xs, fontFamily: fonts.body, fontSize: 11, color: c.muted }}>{sourceLabel}</div>
    </div>
  )
}
