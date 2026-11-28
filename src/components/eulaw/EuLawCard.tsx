import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, DataCard, useTheme, Fundstelle } from '../../design-system'
import type { I18nKey } from '../../design-system/i18n'
import { fontSize, fonts, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { formatDisplayDate } from '../gesetze/utils'
import type { EuRechtDetail, EuRechtListItem } from './types'
import { kiText } from '../../utils/kiText'
import { rechtsgebietFarbe, rechtsgebietLabel } from './rechtsgebiet'
import { EU_DOC_TYPE, EU_DOC_TYPE_FALLBACK } from '../../design-system/palettes'


const PREVIEW_LEN = 200

function trunc(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

function typLabelI18n(
  typ: string,
  t: (k: I18nKey) => string,
): string {
  if (typ === 'REG') return t('euLawTypRegulation')
  if (typ === 'DIR') return t('euLawTypDirective')
  if (typ === 'DEC') return t('euLawTypDecision')
  return typ
}

function eurovocToStrings(tags: unknown): string[] {
  if (tags == null) return []
  if (Array.isArray(tags)) {
    return tags
      .map((x) => {
        if (typeof x === 'string') return x.trim()
        if (x && typeof x === 'object' && 'label' in x) {
          const l = (x as { label?: unknown }).label
          return typeof l === 'string' ? l.trim() : ''
        }
        return String(x)
      })
      .filter(Boolean)
  }
  if (typeof tags === 'string') {
    const s = tags.trim()
    if (!s) return []
    try {
      const p = JSON.parse(s) as unknown
      return eurovocToStrings(p)
    } catch {
      return [s]
    }
  }
  return []
}

export type EuLawCardProps = {
  item: EuRechtListItem
  startExpanded?: boolean
  /** Erster Eintrag der Seite: groessere Schlagzeile, laengerer Vorspann. */
  aufmacher?: boolean
  /** Datum steht schon in der Tagesueberschrift darueber. */
  ohneDatum?: boolean
  /** Kurzmeldung: nur Art, Titel, Rechtsgebiet; Vorspann erst beim Aufklappen. */
  kurz?: boolean
}

export function EuLawCard({ item, startExpanded, aufmacher = false, ohneDatum = false, kurz = false }: EuLawCardProps) {
  const { c, t, lang } = useTheme()
  const navigate = useNavigate()
  const narrow = useIsMobile()
  const [expanded, setExpanded] = useState(Boolean(startExpanded))

  useEffect(() => {
    if (startExpanded) setExpanded(true)
  }, [startExpanded, item.id])

  const detailEndpoint = expanded
    ? `/api/eu-recht/${encodeURIComponent(String(item.id))}`
    : ''
  const { data: detail, loading: detailLoading } =
    useApi<EuRechtDetail>(detailEndpoint)

  const title =
    lang === 'de'
      ? (item.titel_de ?? item.titel_en ?? '—')
      : (item.titel_en ?? item.titel_de ?? '—')

  const summaryFull =
    lang === 'de'
      ? kiText(item.zusammenfassung_de)
      : kiText(item.zusammenfassung_en)
  const preview = summaryFull ? trunc(summaryFull, aufmacher ? PREVIEW_LEN * 2 : PREVIEW_LEN) : ''

  const typBadgeText =
    lang === 'de' && item.typ_label?.trim()
      ? item.typ_label.trim()
      : typLabelI18n(String(item.typ), t)

  const toggle = useCallback(() => {
    setExpanded((v) => !v)
  }, [])

  const onCardClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const el = e.target as HTMLElement
      if (el.closest('a, button')) return
      toggle()
    },
    [toggle],
  )

  const titleStyle: CSSProperties = aufmacher
    ? {
        fontFamily: fonts.display,
        fontSize: narrow ? fontSize.xl : fontSize.xxl,
        fontWeight: 900,
        lineHeight: 1.2,
        color: c.ink,
        margin: 0,
        marginTop: spacing.sm,
        maxWidth: '40ch',
      }
    : {
        fontFamily: fonts.body,
        fontSize: narrow ? '0.9rem' : '1rem',
        fontWeight: 600,
        lineHeight: 1.35,
        color: c.ink,
        margin: 0,
        marginTop: spacing.sm,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }

  // Art des Rechtsakts mit Farbmarke: Verordnung blau, Richtlinie gruen, Beschluss orange
  const typFarbe = EU_DOC_TYPE[String(item.typ)] ?? EU_DOC_TYPE_FALLBACK

  const headerRow: ReactNode = (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
        flexWrap: 'nowrap',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
        {/* Art des Rechtsakts als Zeile ueber dem Titel, Nummer als Fundstelle */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.sm, fontFamily: fonts.body, fontStyle: 'italic', fontSize: fontSize.sm, color: c.inkSoft, lineHeight: 1.2 }}>
          <span aria-hidden style={{ width: 10, height: 10, background: typFarbe, display: 'inline-block', flexShrink: 0 }} />
          {aufmacher ? <span style={{ color: c.red, fontStyle: 'normal', fontFamily: fonts.mono, fontSize: fontSize.micro, letterSpacing: '0.04em' }}>{t('euLawNeuester')}</span> : null}
          {typBadgeText}
        </span>
        <Fundstelle href={item.eurlex_url} title="EUR-Lex">CELEX {item.celex}</Fundstelle>
      </div>
      {item.datum && !ohneDatum ? (
        <time
          dateTime={item.datum}
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSize.xs,
            color: c.muted,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {formatDisplayDate(item.datum, lang)}
        </time>
      ) : null}
    </div>
  )

  const eurovocStrings = useMemo(
    () => eurovocToStrings(detail?.eurovoc_tags),
    [detail?.eurovoc_tags],
  )

  return (
    <DataCard header={headerRow}>
      <div
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        <p style={titleStyle}>{title}</p>

        {item.rechtsgebiet?.trim() ? (
          <div style={{ marginTop: spacing.sm }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs, fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: rechtsgebietFarbe(item.rechtsgebiet), display: 'inline-block' }} />
              {rechtsgebietLabel(item.rechtsgebiet, t)}
            </span>
          </div>
        ) : null}

        {summaryFull && !expanded && !kurz ? (
          <>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: aufmacher ? fontSize.lg : fontSize.md,
                lineHeight: 1.6,
                color: aufmacher ? c.ink : c.inkSoft,
                marginTop: spacing.md,
                maxWidth: '68ch',
                marginBottom: 0,
              }}
            >
              {preview}
            </p>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: fontSize.xs,
                color: c.muted,
                marginTop: spacing.sm,
                marginBottom: 0,
              }}
            >
              {t('euLawAiDisclaimerEmoji')}
            </p>
          </>
        ) : null}

        {expanded ? (
          <div
            onClick={(e) => e.stopPropagation()}
            role="presentation"
            style={{ marginTop: spacing.lg }}
          >
            {summaryFull ? (
              <>
                <p
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSize.micro,
                    color: c.muted,
                    marginBottom: spacing.sm,
                  }}
                >
                  {t('euLawCourtSummarySection')}
                </p>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: fontSize.md,
                    lineHeight: 1.6,
                    color: c.ink,
                    marginTop: 0,
                    marginBottom: 0,
                  }}
                >
                  {summaryFull}
                </p>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: fontSize.xs,
                    color: c.muted,
                    marginTop: spacing.sm,
                    marginBottom: spacing.md,
                  }}
                >
                  {t('euLawAiDisclaimerEmoji')}
                </p>
              </>
            ) : null}
            {item.linked_gesetze?.length ? (
              <div style={{ marginBottom: spacing.md }}>
                <p
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSize.micro,
                    color: c.muted,
                    marginBottom: spacing.sm,
                  }}
                >
                  {t('euLawLinkedGermanLaws')}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  {item.linked_gesetze.map((g) => (
                    <button
                      key={`${g.id}-${g.kuerzel}`}
                      type="button"
                      onClick={() => navigate(`/gesetze/${g.id}`)}
                      style={{
                        minHeight: 44,
                        minWidth: 44,
                        padding: `${spacing.xs}px ${spacing.sm}px`,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Badge text={g.kuerzel} variant="muted" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {detailLoading ? (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: fontSize.sm,
                  color: c.muted,
                  marginBottom: spacing.md,
                }}
              >
                {t('euLawDetailLoading')}
              </p>
            ) : eurovocStrings.length ? (
              <div style={{ marginBottom: spacing.md }}>
                <p
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSize.micro,
                    color: c.muted,
                    marginBottom: spacing.sm,
                  }}
                >
                  {t('euLawEurovocHeading')}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  {eurovocStrings.map((tag) => (
                    <Badge key={tag} text={tag} variant="muted" />
                  ))}
                </div>
              </div>
            ) : null}

            {item.eurlex_url ? (
              <p style={{ marginBottom: 0 }}>
                <a
                  href={item.eurlex_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSize.xs,
                    color: c.red,
                    textDecoration: 'none',
                    borderBottom: `1px solid ${c.red}55`,
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {t('euLawViewEurlexArrow')}
                </a>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </DataCard>
  )
}
