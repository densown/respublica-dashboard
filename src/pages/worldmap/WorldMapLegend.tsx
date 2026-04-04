import { useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import { worldChoroplethGradientCss } from './worldColors'

type WorldMapLegendProps = {
  category: string
  labelMin: string
  labelMax: string
  unitShort: string
  compact?: boolean
}

export function WorldMapLegend({
  category,
  labelMin,
  labelMax,
  unitShort,
  compact,
}: WorldMapLegendProps) {
  const { c, t, theme } = useTheme()
  const gradient = worldChoroplethGradientCss(category, {
    darkBasemap: theme === 'dark',
  })

  const fs = compact ? '0.65rem' : '0.75rem'
  const barH = compact ? 11 : 14
  const gap = compact ? 4 : 6

  return (
    <div
      style={{
        marginTop: spacing.md,
        width: '100%',
        maxWidth: '100%',
        fontFamily: fonts.mono,
        fontSize: fs,
        boxSizing: 'border-box',
      }}
    >
      {unitShort ? (
        <div
          style={{
            color: c.muted,
            marginBottom: gap,
            textAlign: 'center',
            fontSize: fs,
          }}
        >
          {t('worldLegendUnit')}: {unitShort}
        </div>
      ) : null}
      <div
        style={{
          height: barH,
          borderRadius: 4,
          border: `1px solid ${c.border}`,
          width: '100%',
          maxWidth: '100%',
          background: gradient,
          boxSizing: 'border-box',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: gap,
          color: c.inkSoft,
          width: '100%',
          gap: compact ? 4 : 8,
        }}
      >
        <span style={{ minWidth: 0, wordBreak: 'break-word' }}>{labelMin}</span>
        <span style={{ minWidth: 0, wordBreak: 'break-word', textAlign: 'right' }}>
          {labelMax}
        </span>
      </div>
    </div>
  )
}
