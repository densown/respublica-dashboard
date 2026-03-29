import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useState,
} from 'react'
import {
  Badge,
  DataCard,
  useTheme,
} from '../../design-system'
import type { BadgeVariant } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import {
  courtBadgeVariant,
  formatDisplayDate,
  rechtsprechungFullTextUrl,
} from './utils'
import type { Urteil } from './types'

function smallRgBadgeVariant(rg: string): BadgeVariant {
  const s = rg.toLowerCase()
  if (s.includes('zivil')) return 'blue'
  if (s.includes('straf')) return 'no'
  if (s.includes('verfassung')) return 'muted'
  if (s.includes('verwaltung')) return 'yes'
  if (s.includes('steuer')) return 'teal'
  if (s.includes('arbeit')) return 'amber'
  if (s.includes('sozial')) return 'purple'
  if (s.includes('patent')) return 'gray'
  if (s.includes('öffentlich')) return 'muted'
  return 'muted'
}

function nlToBr(text: string): ReactNode[] {
  const lines = text.split('\n')
  return lines.flatMap((line, i) =>
    i === 0 ? [line] : [<br key={`br-${i}`} />, line],
  )
}

export type UrteilCardProps = {
  urteil: Urteil
  onGesetzBadgeClick?: (kuerzel: string) => void
}

export function UrteilCard({ urteil, onGesetzBadgeClick }: UrteilCardProps) {
  const { c, t, lang } = useTheme()
  const [tenorOpen, setTenorOpen] = useState(false)
  const [impactOpen, setImpactOpen] = useState(false)
  const [lawsOpen, setLawsOpen] = useState(false)

  const detailEndpoint =
    lawsOpen && urteil.id != null
      ? `/api/urteile/${encodeURIComponent(String(urteil.id))}`
      : ''
  const { data: detailPayload, loading: detailLoading } = useApi<Urteil>(
    detailEndpoint,
  )

  const gesetzeFromDetail = detailPayload?.gesetze

  useEffect(() => {
    setTenorOpen(false)
    setImpactOpen(false)
    setLawsOpen(false)
  }, [urteil.id])

  const summary = urteil.zusammenfassung?.trim() ?? ''
  const tenor = urteil.tenor?.trim() ?? ''
  const impact = urteil.auswirkung?.trim() ?? ''
  const rg = urteil.rechtsgebiet?.trim() ?? ''
  const az = urteil.aktenzeichen?.trim() ?? '—'
  const court = urteil.gericht?.trim() || '—'
  const docId = urteil.doc_id?.trim() ?? ''
  const fullUrl = docId ? rechtsprechungFullTextUrl(docId) : ''

  const toggleBtn: CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    marginTop: spacing.sm,
    padding: `${spacing.sm}px 0`,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontFamily: fonts.body,
    fontSize: '0.88rem',
    color: c.red,
  }

  const panelStyle: CSSProperties = {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 6,
    background: c.bgAlt,
    border: `1px solid ${c.border}`,
    fontFamily: fonts.body,
    fontSize: '0.88rem',
    lineHeight: 1.6,
    color: c.ink,
  }

  return (
    <DataCard
      header={
        <Badge text={court} variant={courtBadgeVariant(court)} />
      }
    >
      <p
        style={{
          fontFamily: fonts.mono,
          fontSize: '0.84rem',
          color: c.inkSoft,
          marginBottom: rg ? spacing.xs : spacing.md,
        }}
      >
        {az}
        <span style={{ color: c.subtle, margin: `0 ${spacing.xs}px` }}>·</span>
        <time dateTime={urteil.datum ?? undefined}>
          {formatDisplayDate(urteil.datum, lang)}
        </time>
      </p>
      {rg ? (
        <div style={{ marginBottom: spacing.md }}>
          <Badge text={rg} variant={smallRgBadgeVariant(rg)} />
        </div>
      ) : null}

      {summary ? (
        <>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.92rem',
              lineHeight: 1.6,
              color: c.ink,
            }}
          >
            {summary}
          </p>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '0.76rem',
              color: c.muted,
              marginTop: spacing.sm,
            }}
          >
            {t('legislationAiDisclaimerEmoji')}
          </p>
        </>
      ) : null}

      {tenor ? (
        <div>
          <button
            type="button"
            aria-expanded={tenorOpen}
            onClick={() => setTenorOpen((o) => !o)}
            style={toggleBtn}
          >
            {tenorOpen ? t('urteileTenorHide') : t('urteileTenorShow')}
          </button>
          {tenorOpen ? <div style={panelStyle}>{nlToBr(tenor)}</div> : null}
        </div>
      ) : null}

      {impact ? (
        <div>
          <button
            type="button"
            aria-expanded={impactOpen}
            onClick={() => setImpactOpen((o) => !o)}
            style={toggleBtn}
          >
            {impactOpen
              ? t('urteileAuswirkungHide')
              : t('urteileAuswirkungShow')}
          </button>
          {impactOpen ? (
            <div style={panelStyle}>{nlToBr(impact)}</div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: spacing.md }}>
        <button
          type="button"
          aria-expanded={lawsOpen}
          onClick={() => setLawsOpen((o) => !o)}
          style={toggleBtn}
        >
          {lawsOpen ? t('urteileLawsHide') : t('urteileLawsShow')}
        </button>
        {lawsOpen ? (
          <div style={{ ...panelStyle, marginTop: spacing.sm }}>
            {detailLoading ? (
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: '0.82rem',
                  color: c.muted,
                }}
              >
                {t('urteileLawsLoading')}
              </span>
            ) : gesetzeFromDetail && gesetzeFromDetail.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                }}
              >
                {gesetzeFromDetail.map((code) => {
                  const k = String(code).trim()
                  if (!k) return null
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onGesetzBadgeClick?.(k)}
                      style={{
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: onGesetzBadgeClick ? 'pointer' : 'default',
                      }}
                    >
                      <Badge text={k} variant="muted" />
                    </button>
                  )
                })}
              </div>
            ) : (
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: '0.82rem',
                  color: c.muted,
                }}
              >
                —
              </span>
            )}
          </div>
        ) : null}
      </div>

      {fullUrl ? (
        <p style={{ marginTop: spacing.lg, marginBottom: 0 }}>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.72rem',
              color: c.red,
              textDecoration: 'none',
              borderBottom: `1px solid ${c.red}55`,
            }}
          >
            {t('urteileFullTextLink')}
          </a>
        </p>
      ) : null}
    </DataCard>
  )
}
