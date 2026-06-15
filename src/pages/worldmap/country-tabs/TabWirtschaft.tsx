import LineChart from '../../../design-system/components/LineChart'
import MonoLabel from '../../../design-system/components/MonoLabel'
import SectionDivider from '../../../design-system/components/SectionDivider'
import { useTheme } from '../../../design-system'
import { interpolate } from '../../../design-system/i18n'
import { fonts, spacing } from '../../../design-system/tokens'
import { findInd, fmtNumber, latestValue, tailSeries } from '../worldConsoleHelpers'
import type { WorldCountryDetail } from '../worldTypes'
import type { ConsoleTabLayoutDirection } from '../CountrySidebar'

export function TabWirtschaft({
  countryDetail,
  layoutDirection,
}: {
  countryDetail: WorldCountryDetail | null
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t, lang } = useTheme()
  const locale = lang === 'de' ? 'de-DE' : 'en-US'

  const gdpPcInd = findInd(countryDetail, 'NY.GDP.PCAP.CD')
  const inflationInd = findInd(countryDetail, 'FP.CPI.TOTL.ZG')
  const unempInd = findInd(countryDetail, 'SL.UEM.TOTL.ZS')
  const giniInd = findInd(countryDetail, 'SI.POV.GINI')

  const gdpSeries = tailSeries(gdpPcInd, 14).map((p) => ({ y: p.y, v: p.v / 1000 }))
  const inflationSeries = tailSeries(inflationInd, 12)
  const unempSeries = tailSeries(unempInd, 12)

  const giniLatest = latestValue(giniInd)

  if (!gdpPcInd && !inflationInd && !unempInd) {
    return (
      <div style={{ padding: spacing.lg }}>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          {t('worldConsoleNoEcon')}
        </p>
      </div>
    )
  }

  const gdpInflationCol = (
    <>
      {gdpSeries.length >= 2 && (
        <>
          <SectionDivider label={t('worldConsoleSectionGdpPc')} />
          <LineChart data={gdpSeries} yLabel={t('worldConsoleGdpYLabel')} height={90} />
        </>
      )}
      {inflationSeries.length >= 2 && (
        <>
          <SectionDivider label={t('worldConsoleSectionInflation')} />
          <LineChart data={inflationSeries} color={c.no} height={70} showArea={false} />
        </>
      )}
    </>
  )

  const unempGiniCol = (
    <>
      {unempSeries.length >= 2 && (
        <>
          <SectionDivider label={t('worldConsoleSectionUnemployment')} />
          <LineChart data={unempSeries} color={c.yes} height={70} showArea={false} />
        </>
      )}
      {giniLatest && (
        <>
          <SectionDivider label={t('worldConsoleSectionInequality')} />
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: spacing.lg,
              marginBottom: spacing.sm,
            }}
          >
            <div>
              <MonoLabel>{t('worldConsoleGiniLabel')}</MonoLabel>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 900,
                  fontSize: 28,
                  color: c.ink,
                  lineHeight: 1.1,
                  marginTop: 4,
                }}
              >
                {fmtNumber(giniLatest.value, 1, locale)}
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: c.muted, marginTop: 2 }}>
                {interpolate(t('worldConsoleGiniSub'), { year: String(giniLatest.year) })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{gdpInflationCol}</div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{unempGiniCol}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {gdpInflationCol}
      {unempGiniCol}
    </div>
  )
}
