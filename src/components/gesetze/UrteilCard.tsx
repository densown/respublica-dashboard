import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useState,
} from 'react'
import {
  Badge,
  DataCard,
  Fundstelle,
  useTheme,
} from '../../design-system'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import {
  formatDisplayDate,
  rechtsprechungFullTextUrl,
} from './utils'
import type { Urteil } from './types'
import { kiText } from '../../utils/kiText'

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

  const summary = kiText(urteil.zusammenfassung)
  const tenor = urteil.tenor?.trim() ?? ''
  const impact = kiText(urteil.auswirkung)
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
    fontSize: fontSize.md,
    color: c.red,
  }

  const panelStyle: CSSProperties = {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    background: c.bgAlt,
    border: `1px solid ${c.border}`,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 1.6,
    color: c.ink,
  }

  return (
    <DataCard
      header={
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.md,
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, minWidth: 0 }}>
            {/* Gericht und Rechtsgebiet als Zeile, Aktenzeichen als Fundstelle */}
            <span style={{ fontFamily: fonts.body, fontStyle: 'italic', fontSize: fontSize.sm, color: c.red, lineHeight: 1.2 }}>
              {court}
              {rg ? <span style={{ color: c.muted }}>{` · ${rg}`}</span> : null}
            </span>
            <Fundstelle href={fullUrl || undefined} title={t('urteileFullTextLink')}>
              {az}
            </Fundstelle>
          </div>
          {urteil.datum ? (
            <time
              dateTime={urteil.datum}
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSize.xs,
                color: c.muted,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {formatDisplayDate(urteil.datum, lang)}
            </time>
          ) : null}
        </div>
      }
    >
      {summary ? (
        <>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: fontSize.base,
              lineHeight: 1.6,
              color: c.ink,
            }}
          >
            {summary}
          </p>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: fontSize.xs,
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
                  fontSize: fontSize.sm,
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
                  fontSize: fontSize.sm,
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
              fontSize: fontSize.xs,
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
