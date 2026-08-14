import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Chip,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Section,
  Toolbar,
  useTheme,
} from '../design-system'
import { fonts, fontSize, lineHeight, motion, radius, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { GovernanceFingerprint } from './governance/GovernanceFingerprint'
import { GovernanceStripes } from './governance/GovernanceStripes'
import { BAND_REIHENFOLGE, BAND_WERT, governanceFarbe } from './governance/governanceScale'
import type {
  DimensionenResponse,
  HandelResponse,
  VeraenderungResponse,
  VerlaufResponse,
} from './governance/governanceTypes'

/** Die drei Länder, an denen sich die Handschriften am klarsten zeigen. */
const HANDSCHRIFTEN = ['HKG', 'SLV', 'TUR']
const DEUTUNG_KEYS: Record<string, string> = {
  HKG: 'governanceCaseHkg',
  SLV: 'governanceCaseSlv',
  TUR: 'governanceCaseTur',
}

export default function DemocracyIndex() {
  const { c, t, lang, theme } = useTheme()
  const narrow = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()
  const dunkel = theme === 'dark'

  const dimension = searchParams.get('dimension') || 'VA.EST'
  const setDimension = (code: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (code === 'VA.EST') next.delete('dimension')
        else next.set('dimension', code)
        return next
      },
      { replace: true },
    )
  }

  const { data: dims } = useApi<DimensionenResponse>('/api/governance/dimensionen')
  const { data: verlauf, loading: ladeVerlauf } = useApi<VerlaufResponse>(
    `/api/governance/verlauf?dimension=${encodeURIComponent(dimension)}`,
  )
  const { data: wandel } = useApi<VeraenderungResponse>(
    `/api/governance/veraenderung?laender=${HANDSCHRIFTEN.join(',')},DEU`,
  )
  const { data: handel } = useApi<HandelResponse>('/api/governance/handel')

  const dimensionen = dims?.dimensionen ?? []
  const aktuelleDim = dimensionen.find((d) => d.code === dimension)

  const nachIso = useMemo(
    () => new Map((wandel?.laender ?? []).map((l) => [l.iso3, l])),
    [wandel],
  )
  const deutschland = nachIso.get('DEU')
  const letztesJahr = handel?.jahre[handel.jahre.length - 1]

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <PageHeader
        kicker={t('governanceKicker')}
        title={t('governanceTitle')}
        subtitle={t('governanceLede')}
        meta={
          dims && verlauf ? (
            <>
              {dimensionen.length} {t('governanceDimensions')} · {aktuelleDim?.laender}{' '}
              {t('governanceCountries')} · {aktuelleDim?.von}–{aktuelleDim?.bis}
            </>
          ) : undefined
        }
      />

      {/* ---------- Streifen ---------- */}
      <Section
        title={t('governanceStripesTitle')}
        note={t('governanceStripesNote')}
        aside={aktuelleDim ? (lang === 'de' ? aktuelleDim.name_de : aktuelleDim.name_en) : undefined}
      >
        <Toolbar label={t('governanceDimension')}>
          {dimensionen.map((d) => (
            <Chip
              key={d.code}
              dense
              label={lang === 'de' ? d.name_de : d.name_en}
              active={d.code === dimension}
              onClick={() => setDimension(d.code)}
            />
          ))}
        </Toolbar>

        {ladeVerlauf && !verlauf && <LoadingSpinner />}
        {verlauf && (
          <div
            style={{
              opacity: ladeVerlauf ? 0.6 : 1,
              transition: `opacity ${motion.fast} ${motion.easing}`,
            }}
          >
            <GovernanceStripes
              laender={verlauf.laender}
              lang={lang}
              seit={verlauf.seit}
              deltaLabel={`${t('governanceSince')} ${verlauf.seit}`}
            />
          </div>
        )}
      </Section>

      {/* ---------- Handschriften ---------- */}
      <Section title={t('governanceHandwritingTitle')} note={t('governanceHandwritingNote')}>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: fontSize.base,
            lineHeight: lineHeight.relaxed,
            color: c.inkSoft,
            maxWidth: '68ch',
            marginTop: 0,
            marginBottom: spacing.xl,
          }}
        >
          {t('governanceHandwritingLede')}
        </p>

        {!wandel && <LoadingSpinner />}
        {wandel && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: narrow
                ? '1fr'
                : 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: spacing.xl,
            }}
          >
            {HANDSCHRIFTEN.map((iso) => {
              const land = nachIso.get(iso)
              if (!land) return null
              return (
                <GovernanceFingerprint
                  key={iso}
                  land={land}
                  dimensionen={dimensionen}
                  reihenfolge={wandel.reihenfolge}
                  lang={lang}
                  deutung={t(DEUTUNG_KEYS[iso] as Parameters<typeof t>[0])}
                />
              )
            })}
          </div>
        )}
      </Section>

      {/* ---------- Deutschland ---------- */}
      {deutschland && wandel && (
        <Section title={t('governanceGermanyTitle')} note={t('governanceGermanyNote')}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: spacing.xl,
              alignItems: 'start',
            }}
          >
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: fontSize.base,
                lineHeight: lineHeight.relaxed,
                color: c.inkSoft,
                margin: 0,
                maxWidth: '52ch',
              }}
            >
              {t('governanceGermanyLede')}
            </p>
            <GovernanceFingerprint
              land={deutschland}
              dimensionen={dimensionen}
              reihenfolge={wandel.reihenfolge}
              lang={lang}
            />
          </div>
        </Section>
      )}

      {/* ---------- Handelsspiegel ---------- */}
      {handel && letztesJahr && (
        <Section title={t('governanceTradeTitle')} note={t('governanceTradeNote')} last>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: fontSize.base,
              lineHeight: lineHeight.relaxed,
              color: c.inkSoft,
              maxWidth: '68ch',
              marginTop: 0,
              marginBottom: spacing.lg,
            }}
          >
            {t('governanceTradeLede')}
          </p>

          {/* Ein gestapeltes Band statt vier Balken: die Anteile summieren sich
              auf hundert, und genau das soll man sehen. */}
          <div
            style={{
              display: 'flex',
              height: 44,
              borderRadius: radius.md,
              overflow: 'hidden',
              marginBottom: spacing.sm,
            }}
          >
            {BAND_REIHENFOLGE.map((band) => {
              const x = letztesJahr.baender[band]
              if (!x || x.prozent < 0.05) return null
              return (
                <div
                  key={band}
                  title={`${t(`governanceBand_${band}` as Parameters<typeof t>[0])}: ${x.prozent} %`}
                  style={{
                    width: `${x.prozent}%`,
                    background: governanceFarbe(BAND_WERT[band], dunkel),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: fonts.mono,
                    fontSize: fontSize.xs,
                    color: c.ink,
                  }}
                >
                  {x.prozent >= 8 ? `${x.prozent} %` : ''}
                </div>
              )
            })}
          </div>

          <div
            style={{
              display: 'flex',
              gap: spacing.lg,
              flexWrap: 'wrap',
              fontFamily: fonts.mono,
              fontSize: fontSize.micro,
              color: c.muted,
              marginBottom: spacing.xl,
            }}
          >
            {BAND_REIHENFOLGE.map((band) => (
              <span key={band} style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: radius.xs,
                    background: governanceFarbe(BAND_WERT[band], dunkel),
                  }}
                />
                {t(`governanceBand_${band}` as Parameters<typeof t>[0])}
              </span>
            ))}
          </div>

          <h3
            style={{
              fontFamily: fonts.display,
              fontSize: fontSize.lg,
              color: c.ink,
              margin: `0 0 ${spacing.md}px`,
            }}
          >
            {t('governanceTradePartners')}
          </h3>
          <div style={{ display: 'grid', gap: 0 }}>
            {handel.groesste_partner_unter_mittel.map((p) => {
              const anteil = (p.wert_usd / letztesJahr.gesamt_usd) * 100
              return (
                <div
                  key={p.iso3}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: `${spacing.sm}px 0`,
                    borderBottom: `1px solid ${c.border}`,
                  }}
                >
                  <span
                    style={{
                      width: narrow ? 96 : 140,
                      flex: `0 0 ${narrow ? 96 : 140}px`,
                      fontFamily: fonts.body,
                      fontSize: fontSize.sm,
                      color: c.ink,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {lang === 'de' ? p.name_de : p.name_en}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        height: 10,
                        width: `${Math.max(1, (anteil / 12) * 100)}%`,
                        background: governanceFarbe(p.bewertung, dunkel),
                        borderRadius: radius.xs,
                      }}
                    />
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: fontSize.xs,
                      color: c.muted,
                      width: 132,
                      flex: '0 0 132px',
                      textAlign: 'right',
                    }}
                  >
                    {(p.wert_usd / 1e9).toFixed(1)} Mrd · {p.bewertung.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {!dims && !verlauf && !ladeVerlauf && <EmptyState text={t('dataLoadError')} />}

      <p
        style={{
          fontFamily: fonts.mono,
          fontSize: fontSize.xs,
          lineHeight: lineHeight.relaxed,
          color: c.muted,
          marginTop: spacing.xxl,
        }}
      >
        {t('governanceSource')}
      </p>
    </div>
  )
}
