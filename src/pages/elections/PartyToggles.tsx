import { useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import type { Lang } from '../../design-system/ThemeContext'
import { PARTY_LABELS, partyColorsForTheme } from './partyColors'

/** Reihenfolge wie im UI-Prompt: CDU, SPD, Grüne, AfD, BSW, FDP, Linke */
export const DISTRICT_CHART_PARTIES = [
  'cdu_csu',
  'spd',
  'gruene',
  'afd',
  'bsw',
  'fdp',
  'linke_pds',
] as const

export type DistrictChartParty = (typeof DISTRICT_CHART_PARTIES)[number]

type PartyTogglesProps = {
  lang: Lang
  activeKeys: readonly string[]
  onChange: (next: string[]) => void
}

function textOnPartyColor(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#0F0F0F'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 180 ? '#0F0F0F' : '#FFFFFF'
}

export function PartyToggles({ lang, activeKeys, onChange }: PartyTogglesProps) {
  const { c, theme } = useTheme()
  const partyColors = partyColorsForTheme(theme === 'dark')
  const activeSet = new Set(activeKeys)

  const toggle = (key: string) => {
    if (activeSet.has(key)) {
      if (activeKeys.length <= 1) return
      onChange(activeKeys.filter((k) => k !== key))
    } else {
      onChange([...activeKeys, key])
    }
  }

  return (
    <div
      role="group"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {DISTRICT_CHART_PARTIES.map((p) => {
        const on = activeSet.has(p)
        const bg = partyColors[p] ?? partyColors.other
        const label = PARTY_LABELS[p]?.[lang] ?? p
        return (
          <button
            key={p}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(p)}
            style={{
              minHeight: 36,
              padding: `0 ${spacing.md}px`,
              borderRadius: 999,
              border: `2px solid ${bg}`,
              background: on ? bg : 'transparent',
              color: on ? textOnPartyColor(bg) : c.ink,
              fontFamily: fonts.mono,
              fontSize: '0.78rem',
              fontWeight: on ? 600 : 400,
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            {on ? `✓ ${label}` : label}
          </button>
        )
      })}
    </div>
  )
}
