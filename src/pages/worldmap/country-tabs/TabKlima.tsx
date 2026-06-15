import HBar from '../../../design-system/components/HBar'
import { useTheme } from '../../../design-system'
import { fonts, spacing } from '../../../design-system/tokens'
import type { ClimateResponse, ClimateScenario } from '../worldTypes'
import type { ConsoleTabLayoutDirection } from '../CountrySidebar'

// Lesbare Textfarbe (dunkel/hell) für einen beliebigen Hintergrund-Hex via
// YIQ-Helligkeit: dunkler Text auf hellen Klassenfarben (Gelb, Hellgrün),
// heller Text auf dunklen (Dunkelblau, Rot). Hält die Symbole auf den
// Köppen-Farbklötzen in Sektion 1 lesbar.
function koeppenTextColor(hexBg: string): string {
  const h = hexBg.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((x) => x + x)
          .join('')
      : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return '#0F0F0F'
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 140 ? '#0F0F0F' : '#FFFFFF'
}

// Feste Szenario-Reihenfolge (Zeit-/Schwere-Progression) für beide Sektionen.
const CLIMATE_SCENARIO_ORDER = ['historical', 'ssp126', 'ssp245', 'ssp370', 'ssp585']

export function TabKlima({
  climate,
  loading,
}: {
  climate: ClimateResponse | null
  loading: boolean
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t, lang } = useTheme()

  const scenarioLabel = (scenario: string): string => {
    switch (scenario) {
      case 'historical':
        return t('worldClimateScenarioHistorical')
      case 'ssp126':
        return t('worldClimateScenarioSsp126')
      case 'ssp245':
        return t('worldClimateScenarioSsp245')
      case 'ssp370':
        return t('worldClimateScenarioSsp370')
      case 'ssp585':
        return t('worldClimateScenarioSsp585')
      default:
        return scenario
    }
  }

  const fmtShare = (s: number | null): string =>
    s == null ? '—' : `${s.toFixed(1)}%`

  if (loading && !climate) {
    return (
      <div style={{ padding: spacing.lg }}>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          {t('worldClimateLoading')}
        </p>
      </div>
    )
  }

  if (!climate || !climate.scenarios?.length) {
    return (
      <div style={{ padding: spacing.lg }}>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          {t('worldClimateNoData')}
        </p>
      </div>
    )
  }

  const byId = new Map(climate.scenarios.map((s) => [s.scenario, s]))
  const ordered = CLIMATE_SCENARIO_ORDER.map((id) => byId.get(id)).filter(
    (s): s is ClimateScenario => Boolean(s),
  )

  return (
    <div
      style={{
        padding: spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.lg,
      }}
    >
      {/* SEKTION 1: Veränderungs-Übersicht — ein Farbklotz je Szenario, links→rechts */}
      <div
        style={{
          display: 'flex',
          gap: spacing.sm,
          overflowX: 'auto',
          paddingBottom: spacing.xs,
        }}
      >
        {ordered.map((sc) => {
          const dom = sc.dominant
          const bg = dom?.color_rgb || c.bgHover
          const fg = dom ? koeppenTextColor(bg) : c.muted
          return (
            <div
              key={sc.scenario}
              style={{
                flex: '1 0 0',
                minWidth: 92,
                background: bg,
                color: fg,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                padding: spacing.sm,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: spacing.xs,
                textAlign: 'center',
              }}
            >
              <span style={{ fontFamily: fonts.body, fontSize: 10, lineHeight: 1.25 }}>
                {scenarioLabel(sc.scenario)}
              </span>
              <span
                style={{ fontFamily: fonts.mono, fontSize: 22, fontWeight: 700, lineHeight: 1 }}
              >
                {dom?.symbol ?? '—'}
              </span>
              {dom?.short_name ? (
                <span style={{ fontFamily: fonts.body, fontSize: 11, lineHeight: 1.2 }}>
                  {dom.short_name}
                </span>
              ) : null}
              {dom?.share != null && (
                <span style={{ fontFamily: fonts.mono, fontSize: 10, opacity: 0.85 }}>
                  {fmtShare(dom.share)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* SEKTION 2: Verteilung je Szenario als proportionale Farbbalken (HBar) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.lg,
          paddingTop: spacing.md,
          borderTop: `1px solid ${c.border}`,
        }}
      >
        {ordered.map((sc) => {
          const dom = sc.dominant
          const domName = dom ? (lang === 'de' ? dom.name_de : dom.name_en) : null
          return (
            <section key={sc.scenario}>
              <h4
                style={{
                  margin: 0,
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 700,
                  color: c.text,
                }}
              >
                {scenarioLabel(sc.scenario)}
              </h4>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  color: c.muted,
                  marginTop: 2,
                  marginBottom: spacing.sm,
                }}
              >
                {t('worldClimateDominantClass')}:{' '}
                {dom
                  ? `${dom.symbol} — ${domName ?? ''} (${fmtShare(dom.share)})`
                  : t('worldClimateNoData')}
              </div>
              {sc.distribution.map((d) => (
                <HBar
                  key={d.class_code}
                  label={d.symbol}
                  value={d.share ?? 0}
                  max={100}
                  formatted={fmtShare(d.share)}
                  color={d.color_rgb}
                />
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
