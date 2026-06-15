import MonoLabel from '../../../design-system/components/MonoLabel'
import SectionDivider from '../../../design-system/components/SectionDivider'
import StatTile from '../../../design-system/components/StatTile'
import { useTheme } from '../../../design-system'
import { interpolate } from '../../../design-system/i18n'
import { fonts, spacing } from '../../../design-system/tokens'
import { fmtNumber } from '../worldConsoleHelpers'
import type { WorldRankingRow } from '../worldTypes'
import type { ConsoleTabLayoutDirection } from '../CountrySidebar'

export function GlobalView({
  activeIndicatorLabel,
  ranking,
  stats,
  totalCountries,
  layoutDirection,
}: {
  activeIndicatorLabel: string | undefined
  ranking: WorldRankingRow[] | null
  stats: { median: number; mean: number; total: number } | null
  totalCountries: number | undefined
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'
  const top5 = (ranking ?? []).slice(0, 5)
  const bot5 = (ranking ?? []).slice(-5).reverse()

  const top5Block = (
    <>
      {top5.length > 0 && (
        <>
          <SectionDivider label={t('worldConsoleGlobalTop5')} />
          {top5.map((row, i) => (
            <div
              key={row.country_code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.sm}px 0`,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.muted, width: 16 }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: fonts.body, fontSize: 13, color: c.ink, flex: 1 }}>
                {row.country_name ?? row.country_code}
              </span>
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: c.ink }}>
                {fmtNumber(row.value, 2, locale)}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  )

  const bot5Block = (
    <>
      {bot5.length > 0 && (
        <>
          <SectionDivider label={t('worldConsoleGlobalBottom5')} />
          {bot5.map((row, i) => (
            <div
              key={row.country_code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.sm}px 0`,
                borderBottom: `1px solid ${c.border}`,
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.muted, width: 16 }}>
                {(totalCountries || 0) - i}
              </span>
              <span style={{ fontFamily: fonts.body, fontSize: 13, color: c.ink, flex: 1 }}>
                {row.country_name ?? row.country_code}
              </span>
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: c.no }}>
                {fmtNumber(row.value, 2, locale)}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  )

  const hintBlock = (
    <div
      style={{
        marginTop: spacing.xl,
        padding: spacing.lg,
        border: `1px dashed ${c.border}`,
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 20, marginBottom: spacing.sm }}>⊕</div>
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
            value={fmtNumber(stats.median, 2, locale)}
            sub={t('worldConsoleGlobalMedianSub')}
            icon="◉"
          />
          <StatTile
            label={t('worldConsoleGlobalMean')}
            value={fmtNumber(stats.mean, 2, locale)}
            sub={t('worldConsoleGlobalMeanSub')}
            icon="◆"
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
      {top5Block}
      {bot5Block}
      {hintBlock}
    </div>
  )
}
