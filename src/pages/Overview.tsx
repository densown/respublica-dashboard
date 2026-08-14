import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Section, useTheme } from '../design-system'
import { fonts, fontSize, lineHeight, motion, radius, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'

type GesetzeStats = { gesetze_count: number; aenderungen_count: number }
type EuStats = { rechtsakte_count?: number; count?: number }

type GesetzRow = {
  id: number
  kuerzel: string
  name: string | null
  titel_offiziell: string | null
  datum: string
  zusammenfassung: string | null
  has_lobby: boolean
}

type Wahltermin = {
  slug: string
  land: string | null
  name_de: string
  name_en: string
  datum: string | null
  status: string
  umfragen: number
}
type WahlterminListe = { wahltermine: Wahltermin[] }

function tageBis(iso: string | null): number | null {
  if (!iso) return null
  const ziel = new Date(`${iso}T00:00:00`).getTime()
  if (Number.isNaN(ziel)) return null
  const heute = new Date()
  heute.setHours(0, 0, 0, 0)
  return Math.round((ziel - heute.getTime()) / 86_400_000)
}

function datum(iso: string | null, lang: string): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/**
 * Einstiegsseite.
 *
 * Bewusst als Titelseite gebaut, nicht als Dashboard. Die vorige Fassung
 * stapelte vier gleiche Kennzahlkacheln, sechs gleiche "Feature"-Karten und
 * drei Spalten Rohdaten — alles gleich gewichtet, nichts gefuehrt, und die
 * Vorschau zeigte Aktenzeichen statt Gesetzesnamen.
 *
 * Eine Titelseite fuehrt: eine Aussage, dann was gerade ansteht, dann die
 * Einstiege nach Gewicht, dann was zuletzt passiert ist.
 */
export default function Overview() {
  const { c, t, lang } = useTheme()
  const navigate = useNavigate()
  const narrow = useIsMobile()

  const { data: gStats } = useApi<GesetzeStats>('/api/gesetze/stats')
  const { data: euStats } = useApi<EuStats>('/api/eu-recht/stats')
  const { data: gesetze } = useApi<GesetzRow[]>('/api/gesetze?limit=6')
  const { data: wahlen } = useApi<WahlterminListe>('/api/wahltermine?status=kommend')

  /** Die naechste Wahl mit Datum — der zeitliche Aufhaenger der Seite. */
  const naechsteWahl = useMemo(() => {
    const mitDatum = (wahlen?.wahltermine ?? []).filter((w) => w.datum)
    return [...mitDatum].sort((a, b) => (a.datum ?? '').localeCompare(b.datum ?? ''))[0] ?? null
  }, [wahlen])

  const tage = tageBis(naechsteWahl?.datum ?? null)

  /** Nur Aenderungen mit Zusammenfassung — ein Aktenzeichen erklaert nichts. */
  const letzte = useMemo(
    () => (gesetze ?? []).filter((g) => g.zusammenfassung && g.name).slice(0, 3),
    [gesetze],
  )

  const bestand = [
    { wert: gStats?.gesetze_count, label: t('overviewStatLaws') },
    { wert: gStats?.aenderungen_count, label: t('overviewStatChanges') },
    { wert: euStats?.rechtsakte_count ?? euStats?.count, label: t('overviewStatEuActs') },
  ].filter((x) => typeof x.wert === 'number')

  const einstiege = [
    { id: 'elections', pfad: '/wahlen', titel: t('navElections'), text: t('overviewEntryElections') },
    { id: 'bundestag', pfad: '/bundestag', titel: t('bundestag'), text: t('overviewEntryBundestag') },
    { id: 'legislation', pfad: '/gesetze', titel: t('legislation'), text: t('overviewEntryLegislation') },
    { id: 'lobby', pfad: '/lobbyregister', titel: t('lobby'), text: t('overviewEntryLobby') },
    { id: 'euLaw', pfad: '/eu-recht', titel: t('euLaw'), text: t('overviewEntryEuLaw') },
    { id: 'worldmap', pfad: '/weltkarte', titel: t('worldMap'), text: t('overviewEntryWorld') },
  ]

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <PageHeader
        kicker="Res.Publica"
        title={t('overviewHeroTitle')}
        subtitle={t('overviewIntro')}
      />

      {/* --- Bestandsband: Zahlen als Satz, nicht als Kachelreihe ---------- */}
      {bestand.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: `${spacing.md}px ${spacing.xl}px`,
            alignItems: 'baseline',
            paddingBottom: spacing.xl,
            marginBottom: spacing.xxl,
            borderBottom: `1px solid ${c.border}`,
          }}
        >
          {bestand.map((x) => (
            <span key={x.label} style={{ display: 'flex', alignItems: 'baseline', gap: spacing.sm }}>
              <span
                style={{
                  fontFamily: fonts.display,
                  fontSize: fontSize.xxl,
                  fontWeight: 900,
                  color: c.ink,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {(x.wert as number).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US')}
              </span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.micro,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: c.muted,
                }}
              >
                {x.label}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* --- Jetzt: der zeitliche Aufhänger -------------------------------- */}
      {naechsteWahl && tage != null && tage >= 0 && (
        <Section title={t('overviewNowTitle')}>
          <div
            onClick={() => navigate('/wahlen/umfragen')}
            style={{
              display: 'grid',
              gridTemplateColumns: narrow ? '1fr' : 'auto 1fr',
              gap: narrow ? spacing.lg : spacing.xl,
              alignItems: 'center',
              padding: spacing.xl,
              border: `1px solid ${c.border}`,
              borderLeft: `3px solid ${c.red}`,
              borderRadius: radius.lg,
              background: c.cardBg,
              cursor: 'pointer',
              transition: `border-color ${motion.fast} ${motion.easing}`,
            }}
          >
            <div style={{ textAlign: narrow ? 'left' : 'center' }}>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: fontSize.hero,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: c.red,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {tage}
              </div>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.micro,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: c.muted,
                  marginTop: spacing.xs,
                }}
              >
                {t('overviewDaysLeft')}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  fontFamily: fonts.display,
                  fontSize: fontSize.xl,
                  lineHeight: lineHeight.tight,
                  color: c.ink,
                  margin: 0,
                }}
              >
                {lang === 'de' ? naechsteWahl.name_de : naechsteWahl.name_en}
              </h3>
              <p
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSize.xs,
                  color: c.muted,
                  margin: `${spacing.xs}px 0 ${spacing.md}px`,
                }}
              >
                {datum(naechsteWahl.datum, lang)} · {naechsteWahl.umfragen}{' '}
                {t('overviewPollsCount')}
              </p>
              <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
                {[
                  { pfad: '/wahlen/umfragen', label: t('electionPollsNavPolls') },
                  { pfad: '/wahlen/kandidaturen', label: t('electionPollsNavCandidates') },
                ].map((l) => (
                  <button
                    key={l.pfad}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(l.pfad)
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      minHeight: 44,
                      cursor: 'pointer',
                      fontFamily: fonts.mono,
                      fontSize: fontSize.xs,
                      color: c.red,
                    }}
                  >
                    {l.label} →
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* --- Einstiege ---------------------------------------------------- */}
      <Section title={t('overviewEntriesTitle')}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 0,
            borderTop: `1px solid ${c.border}`,
          }}
        >
          {einstiege.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => navigate(e.pfad)}
              style={{
                textAlign: 'left',
                border: 'none',
                borderBottom: `1px solid ${c.border}`,
                background: 'transparent',
                padding: `${spacing.lg}px ${spacing.lg}px ${spacing.lg}px 0`,
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: fontSize.lg,
                  color: c.ink,
                  marginBottom: spacing.xs,
                }}
              >
                {e.titel}
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: fontSize.md,
                  lineHeight: lineHeight.normal,
                  color: c.muted,
                  maxWidth: '38ch',
                }}
              >
                {e.text}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* --- Zuletzt geändert --------------------------------------------- */}
      {letzte.length > 0 && (
        <Section
          title={t('overviewLatestTitle')}
          aside={
            <button
              type="button"
              onClick={() => navigate('/gesetze')}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                fontFamily: fonts.mono,
                fontSize: fontSize.xs,
                color: c.red,
              }}
            >
              {t('viewAll')} →
            </button>
          }
        >
          <div style={{ display: 'grid', gap: 0 }}>
            {letzte.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => navigate(`/gesetze/${g.id}`)}
                style={{
                  textAlign: 'left',
                  border: 'none',
                  borderBottom: `1px solid ${c.border}`,
                  background: 'transparent',
                  padding: `${spacing.md}px 0`,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: spacing.sm,
                    alignItems: 'baseline',
                    flexWrap: 'wrap',
                    marginBottom: spacing.xs,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: fontSize.base,
                      color: c.ink,
                    }}
                  >
                    {g.name}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: fontSize.micro,
                      color: c.muted,
                    }}
                  >
                    {datum(g.datum, lang)}
                  </span>
                  {g.has_lobby && (
                    <span
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: fontSize.micro,
                        color: c.muted,
                        border: `1px solid ${c.border}`,
                        borderRadius: radius.sm,
                        padding: '1px 6px',
                      }}
                    >
                      {t('overviewLobbyTouched')}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: fontSize.md,
                    lineHeight: lineHeight.relaxed,
                    color: c.inkSoft,
                    margin: 0,
                    maxWidth: '68ch',
                  }}
                >
                  {g.zusammenfassung}
                </p>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* --- Herkunft ------------------------------------------------------ */}
      <Section title={t('overviewOriginTitle')} last>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: fontSize.base,
            lineHeight: lineHeight.relaxed,
            color: c.inkSoft,
            margin: 0,
            maxWidth: '68ch',
          }}
        >
          {t('overviewOriginBody')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/quellen')}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            marginTop: spacing.md,
            minHeight: 44,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: fontSize.xs,
            color: c.red,
          }}
        >
          {t('navSources')} →
        </button>
      </Section>
    </div>
  )
}
