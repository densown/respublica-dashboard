import HBar from '../../../design-system/components/HBar'
import SectionDivider from '../../../design-system/components/SectionDivider'
import { useTheme } from '../../../design-system'
import { fonts, spacing } from '../../../design-system/tokens'
import { iso3ToFlagIso2 } from '../worldIso3ToIso2'
import { normIso3 } from './helpers'
import type {
  CountrySelection,
  WorldCountryDetail,
  WorldGeoJson,
  WorldMapRow,
} from '../worldTypes'
import type {
  ConsoleTabLayoutDirection,
  WorldConsoleActiveIndicator,
} from '../CountrySidebar'

export function TabVergleich({
  selection,
  allCountryDetails,
  mapRowsCountries,
  formatIndicatorValue,
  activeIndicator,
  geojson,
  onRemoveFromSelection,
  onClearAllSelection,
  layoutDirection,
}: {
  selection: CountrySelection
  allCountryDetails: Map<string, WorldCountryDetail>
  mapRowsCountries: WorldMapRow[]
  formatIndicatorValue: (v: number | null | undefined) => string
  activeIndicator: WorldConsoleActiveIndicator | null
  geojson: WorldGeoJson | null
  onRemoveFromSelection: (iso3: string) => void
  onClearAllSelection: () => void
  layoutDirection: ConsoleTabLayoutDirection
}) {
  const { c, t } = useTheme()

  const ordered: string[] = [
    ...(selection.primary ? [normIso3(selection.primary)] : []),
    ...selection.compare.map(normIso3),
  ]

  const rowsForHbar = ordered.map((iso) => {
    const det = allCountryDetails.get(iso)
    const mapRow = mapRowsCountries.find((r) => normIso3(r.country_code) === iso)
    const name = det?.country_name ?? mapRow?.country_name ?? iso
    const val =
      mapRow?.value != null && !Number.isNaN(mapRow.value as number)
        ? (mapRow.value as number)
        : null
    return { iso, name, val }
  })
  const maxBar = Math.max(
    1e-9,
    ...rowsForHbar.map((r) => (r.val != null ? Math.abs(r.val) : 0)),
  )
  const barColors = [c.red, c.yes, c.no, c.ink]

  const listRows = ordered.map((iso, idx) => {
    const det = allCountryDetails.get(iso)
    const mapRow = mapRowsCountries.find((r) => normIso3(r.country_code) === iso)
    const iso2 = iso3ToFlagIso2(iso, geojson)
    const flagUrl = iso2 ? `https://flagcdn.com/w40/${iso2}.png` : null
    const isPrimary = idx === 0
    const regionLine = [det?.region, det?.income_level].filter(Boolean).join(' · ')
    return (
      <div
        key={iso}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: spacing.md,
          padding: `${spacing.md}px 0`,
          borderBottom: `1px solid ${c.border}`,
        }}
      >
        {flagUrl ? (
          <img
            src={flagUrl}
            alt=""
            width={40}
            height={28}
            style={{
              borderRadius: 4,
              objectFit: 'cover',
              flexShrink: 0,
              border: `1px solid ${c.border}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 28,
              borderRadius: 4,
              background: c.bgHover,
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                fontWeight: 600,
                color: c.ink,
              }}
            >
              {det?.country_name ?? mapRow?.country_name ?? iso}
            </span>
            {isPrimary && (
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 8,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: c.red,
                  border: `1px solid ${c.red}`,
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                {t('worldCompareTabPrimary')}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              color: c.muted,
              marginTop: 4,
              letterSpacing: '0.04em',
            }}
          >
            {iso}
            {regionLine ? ` · ${regionLine}` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemoveFromSelection(iso)}
          title={t('worldConsoleClose')}
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: 0,
            border: `1px solid ${c.border}`,
            borderRadius: 4,
            background: 'transparent',
            color: c.muted,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: 14,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    )
  })

  const hintsBlock =
    ordered.length < 4 ? (
      <div
        style={{
          marginTop: spacing.lg,
          padding: spacing.md,
          border: `1px dashed ${c.border}`,
          borderRadius: 8,
        }}
      >
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 12,
            color: c.muted,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {t('worldCompareTabHintRightclick')}
          <br />
          {t('worldCompareTabHintCmdclick')}
        </p>
      </div>
    ) : null

  const clearAllBtn = (
    <button
      type="button"
      onClick={onClearAllSelection}
      style={{
        marginTop: spacing.lg,
        width: '100%',
        minHeight: 44,
        padding: `${spacing.sm}px ${spacing.md}px`,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        background: c.bg,
        color: c.ink,
        fontFamily: fonts.mono,
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {t('worldCompareTabClearAll')}
    </button>
  )

  const compareListColumn = (
    <>
      <SectionDivider label={t('worldCompareTabSelectedCountries')} />
      {listRows}
      {hintsBlock}
      {clearAllBtn}
    </>
  )

  const indicatorColumn = (
    <>
      <SectionDivider label={t('worldCompareTabActiveIndicator')} />
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          fontWeight: 600,
          color: c.ink,
          marginTop: spacing.sm,
          marginBottom: spacing.md,
        }}
      >
        {activeIndicator?.name || t('worldConsoleActiveIndicatorFallback')}
      </p>
      {rowsForHbar.map((r, i) => (
        <HBar
          key={r.iso}
          label={r.name}
          value={r.val != null ? Math.abs(r.val) : 0}
          max={maxBar}
          formatted={r.val != null ? formatIndicatorValue(r.val) : t('worldNoValue')}
          color={barColors[i % barColors.length]!}
        />
      ))}
    </>
  )

  if (layoutDirection === 'horizontal') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: spacing.xl,
          padding: spacing.lg,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{compareListColumn}</div>
        <div style={{ overflowY: 'auto', minWidth: 0 }}>{indicatorColumn}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.lg}px ${spacing.xxl}px` }}>
      {compareListColumn}
      <div style={{ marginTop: spacing.xl }}>{indicatorColumn}</div>
    </div>
  )
}
