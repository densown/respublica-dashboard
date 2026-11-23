import MonoLabel from '../../../design-system/components/MonoLabel'
import SectionDivider from '../../../design-system/components/SectionDivider'
import StatTile from '../../../design-system/components/StatTile'
import { useTheme } from '../../../design-system'
import { interpolate } from '../../../design-system/i18n'
import { fonts, radius, spacing } from '../../../design-system/tokens'
import { fmtNumber } from '../worldConsoleHelpers'
import type { WorldRankingRow } from '../worldTypes'
import type { ConsoleTabLayoutDirection } from '../CountrySidebar'

export function GlobalView({
  activeIndicatorLabel,
  ranking,
  stats,
  totalCountries,
  layoutDirection,
  formatValue,
  onSelectCountry,
}: {
  activeIndicatorLabel: string | undefined
  ranking: WorldRankingRow[] | null
  stats: { median: number; mean: number; total: number } | null
  totalCountries: number | undefined
  layoutDirection: ConsoleTabLayoutDirection
  /** Wert mit Einheit, wie in Legende und Hinweis auf der Karte */
  formatValue?: (v: number | null | undefined) => string
  /** Tipp auf eine Zeile oeffnet den Steckbrief des Landes */
  onSelectCountry?: (iso3: string) => void
}) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const wert = (v: number) => (formatValue ? formatValue(v) : fmtNumber(v, 2, locale))
  const alle = ranking ?? []
  const top5 = alle.slice(0, 5)
  const bot5 = alle.length > 5 ? alle.slice(-5).reverse() : []

  const zeile = (row: WorldRankingRow, platz: number) => (
    <button
      key={row.country_code}
      type="button"
      onClick={() => onSelectCountry?.(row.country_code)}
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: spacing.md,
        width: '100%',
        minHeight: 40,
        padding: `${spacing.sm}px 0`,
        border: 'none',
        borderBottom: `1px solid ${c.border}`,
        background: 'transparent',
        textAlign: 'left',
        cursor: onSelectCountry ? 'pointer' : 'default',
      }}
    >
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: 11,
          fontVariantNumeric: 'tabular-nums',
          color: c.muted,
          width: 24,
          flexShrink: 0,
        }}
      >
        {platz}
      </span>
      <span style={{ fontFamily: fonts.body, fontSize: 14, color: c.ink, flex: 1, minWidth: 0 }}>
        {row.country_name ?? row.country_code}
      </span>
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
          color: c.ink,
          whiteSpace: 'nowrap',
        }}
      >
        {wert(row.value)}
      </span>
    </button>
  )

  const top5Block =
    top5.length > 0 ? (
      <>
        <SectionDivider label={t('worldGlobalHighest')} />
        {top5.map((row, i) => zeile(row, i + 1))}
      </>
    ) : null

  const bot5Block =
    bot5.length > 0 ? (
      <>
        <SectionDivider label={t('worldGlobalLowest')} />
        {bot5.map((row, i) => zeile(row, (totalCountries || alle.length) - i))}
      </>
    ) : null

  const hintBlock = (
    <div
      style={{
        marginBottom: spacing.lg,
        padding: spacing.md,
        border: `1px dashed ${c.border}`,
        borderRadius: radius.lg,
        textAlign: 'center',
      }}
    >
      <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, lineHeight: 1.5 }}>
        {t('worldConsoleMapHintBody').split('\n').map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    </div>
  )

  const headerStatsBlock = (
    <>
      <div style={{ marginBottom: spacing.lg }}>
        <MonoLabel>{t('worldConsoleGlobalOverview')}</MonoLabel>
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: 22,
            color: c.ink,
            lineHeight: 1.1,
            marginTop: spacing.xs,
          }}
        >
          {activeIndicatorLabel || t('worldConsoleActiveIndicatorFallback')}
          <span style={{ color: c.red }}>.</span>
        </h2>
        <p
          style={{
            fontFamily: fonts.body,
            fontStyle: 'italic',
            fontSize: 12,
            color: c.muted,
            marginTop: spacing.xs,
          }}
        >
          {totalCountries
            ? interpolate(t('worldConsoleGlobalN'), { n: totalCountries })
            : `${t('worldNoValue')}…`}
        </p>
      </div>
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <StatTile
            label={t('worldConsoleGlobalMedian')}
            value={wert(stats.median)}
            sub={t('worldConsoleGlobalMedianSub')}
          />
          <StatTile
            label={t('worldConsoleGlobalMean')}
            value={wert(stats.mean)}
            sub={t('worldConsoleGlobalMeanSub')}
          />
        </div>
      )}
    </>
  )

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{headerStatsBlock}</div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {top5Block}
        </div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>
          {bot5Block}
          {hintBlock}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {headerStatsBlock}
      {hintBlock}
      {top5Block}
      {bot5Block}
    </div>
  )
}
