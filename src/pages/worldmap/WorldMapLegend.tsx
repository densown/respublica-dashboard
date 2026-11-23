import { useTheme } from '../../design-system'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import { worldChoroplethGradientCss } from './worldColors'

type WorldMapLegendProps = {
  category: string
  labelMin: string
  labelMax: string
  /** Was die Karte zeigt, z. B. "BIP pro Kopf, 2023" */
  title?: string
  unitShort: string
  compact?: boolean
  /** Karte ist logarithmisch gefaerbt: Hinweis unter der Skala. */
  log?: boolean
}

/**
 * Legende als kleine Karte auf Papier. Vorher stand sie ohne Grund direkt auf
 * der Karte, die Schrift lief in Laendernamen und Kuesten.
 */
export function WorldMapLegend({
  category,
  labelMin,
  labelMax,
  title,
  unitShort,
  compact,
  log,
}: WorldMapLegendProps) {
  const { c, t, theme } = useTheme()
  const gradient = worldChoroplethGradientCss(category, {
    darkBasemap: theme === 'dark',
  })

  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: radius.md,
        padding: compact ? `${spacing.sm}px ${spacing.md}px` : spacing.md,
        fontFamily: fonts.body,
        boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
      }}
    >
      {title ? (
        <div
          style={{
            fontSize: fontSize.sm,
            fontWeight: 600,
            color: c.ink,
            lineHeight: 1.25,
            marginBottom: spacing.xs,
          }}
        >
          {title}
          {unitShort ? (
            <span style={{ fontWeight: 400, color: c.muted }}>{` (${unitShort})`}</span>
          ) : null}
        </div>
      ) : null}
      <div
        style={{
          height: 10,
          borderRadius: radius.sm,
          width: '100%',
          background: gradient,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: spacing.sm,
          marginTop: spacing.xs,
          fontFamily: fonts.mono,
          fontSize: fontSize.xs,
          fontVariantNumeric: 'tabular-nums',
          color: c.inkSoft,
        }}
      >
        <span>{labelMin}</span>
        <span style={{ textAlign: 'right' }}>{labelMax}</span>
      </div>
      {log && (
        <div
          style={{
            marginTop: spacing.xs,
            fontSize: fontSize.xs,
            fontStyle: 'italic',
            color: c.muted,
            lineHeight: 1.3,
          }}
        >
          {t('worldLegendLog')}
        </div>
      )}
    </div>
  )
}
