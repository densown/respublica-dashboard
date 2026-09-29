import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Chip,
  DataTable,
  EmptyState,
  FilterToolbar,
  HBar,
  LoadingSpinner,
  PageHeader,
  Pagination,
  Section,
  Toolbar,
  useTheme,
  type DataTableColumn,
} from '../design-system'
import type { I18nKey } from '../design-system/i18n'
import { fonts, fontSize, lineHeight, motion, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { KATEGORIEN, type ListResponse, type Mass, type StatsResponse, type Versammlung } from './versammlungen/types'
import { VerlaufChart } from './versammlungen/VerlaufChart'
import { WannGrid } from './versammlungen/WannGrid'
import { datenluecken, zeitreihe } from './versammlungen/zeitachse'

/**
 * Demonstrations-Tracker, Beta. Bislang nur Berlin.
 *
 * Wie der Demokratie-Index noch nicht in der Navigation verlinkt; erreichbar
 * unter /versammlungen. Daten: /api/versammlungen* (respublica-api).
 */

const ERSTES_JAHR = 2018
const LISTE_LIMIT = 10

function heuteIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Versammlungen() {
  const { c, t, lang } = useTheme()
  const [params, setParams] = useSearchParams()
  const heute = useMemo(heuteIso, [])
  const aktuellesJahr = Number(heute.slice(0, 4))

  const jahr = params.get('jahr') ?? ''
  const kategorie = params.get('thema') ?? ''
  const typ = params.get('form') ?? ''
  const q = params.get('q') ?? ''
  const mass: Mass = params.get('zaehlung') === 'tage' ? 'versammlungstage' : 'versammlungen'
  const seite = Math.max(1, Number(params.get('seite')) || 1)

  const setParam = (key: string, value: string, resetSeite = true) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        if (resetSeite && key !== 'seite') next.delete('seite')
        return next
      },
      { replace: true },
    )
  }

  const von = jahr ? `${jahr}-01-01` : `${ERSTES_JAHR}-01-01`
  const bisJahr = jahr ? `${jahr}-12-31` : heute
  const bis = bisJahr < heute ? bisJahr : heute
  const woche = Boolean(jahr)

  const filterQs = [
    kategorie && `kategorie=${encodeURIComponent(kategorie)}`,
    typ && `typ=${encodeURIComponent(typ)}`,
  ]
    .filter(Boolean)
    .join('&')
  const zeitQs = `von=${von}&bis=${bis}`

  const statsUrl = `/api/versammlungen/stats?${zeitQs}${filterQs ? `&${filterQs}` : ''}`
  // Themenverteilung ohne Themenfilter, sonst stuende nur ein Balken da
  const themenUrl = kategorie
    ? `/api/versammlungen/stats?${zeitQs}${typ ? `&typ=${encodeURIComponent(typ)}` : ''}`
    : ''
  const listUrl =
    `/api/versammlungen?buendeln=1&limit=${LISTE_LIMIT}&offset=${(seite - 1) * LISTE_LIMIT}` +
    `${filterQs ? `&${filterQs}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`

  const { data: stats, loading: ladeStats, error: fehlerStats } = useApi<StatsResponse>(statsUrl)
  const { data: themenExtra } = useApi<StatsResponse>(themenUrl)
  const { data: liste, loading: ladeListe, error: fehlerListe } = useApi<ListResponse>(listUrl)
  const themen = kategorie ? themenExtra : stats

  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const zahl = (n: number) => n.toLocaleString(locale)
  const datum = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  const monatJahr = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const katLabel = (k: string | null) => t(`versammlungenKat_${k ?? 'unklassifiziert'}` as I18nKey)

  const abdeckung = useMemo(() => stats?.abdeckung ?? [], [stats])
  const jahrHatDaten = (y: number) =>
    abdeckung.some((a) => a.von <= `${y}-12-31` && (a.bis ?? heute) >= `${y}-01-01`)

  const verlauf = useMemo(
    () => (stats ? zeitreihe(stats, von, bis, woche, mass, heute) : null),
    [stats, von, bis, woche, mass, heute],
  )
  const luecken = useMemo(() => datenluecken(abdeckung, von, bis), [abdeckung, von, bis])

  const themenZeilen = useMemo(() => {
    const rows = (themen?.kategorien ?? []).filter((k) => k[mass] > 0)
    const summe = rows.reduce((s, k) => s + k[mass], 0)
    return { rows: [...rows].sort((a, b) => b[mass] - a[mass]), summe }
  }, [themen, mass])

  const massLabel = t(mass === 'versammlungen' ? 'versammlungenMassVersammlungen' : 'versammlungenMassTage')

  const spalten: DataTableColumn<Versammlung>[] = [
    {
      key: 'datum',
      header: t('versammlungenSpalteDatum'),
      mono: true,
      cell: (v) => (
        <div>
          <div>{datum(v.datum)}</div>
          {v.serie?.bis && (
            <div style={{ color: c.muted, fontSize: fontSize.xs }}>
              {t('versammlungenSerieBis')
                .replace('{rhythmus}', v.serie.rhythmus ?? '')
                .replace('{bis}', datum(v.serie.bis))
                .trim()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'zeit',
      header: t('versammlungenSpalteZeit'),
      mono: true,
      cell: (v) => (v.ganztaegig ? t('versammlungenGanztaegig') : [v.von, v.bis].filter(Boolean).join('–')),
    },
    {
      key: 'thema',
      header: t('versammlungenSpalteThema'),
      cell: (v) => <span style={{ fontFamily: fonts.body }}>{v.thema}</span>,
    },
    {
      key: 'ort',
      header: t('versammlungenSpalteOrt'),
      cell: (v) => [v.plz, v.ort].filter(Boolean).join(' '),
    },
    {
      key: 'kategorie',
      header: t('versammlungenSpalteKategorie'),
      hideOnMobile: true,
      cell: (v) => katLabel(v.kategorie),
    },
  ]

  const absatz = {
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    lineHeight: lineHeight.relaxed,
    color: c.inkSoft,
    maxWidth: '68ch',
    margin: 0,
  } as const

  const nachladen = (laedt: boolean) => ({
    opacity: laedt ? 0.6 : 1,
    transition: `opacity ${motion.fast} ${motion.easing}`,
  })

  const letzterAbruf = stats?.letzter_abruf ? datum(stats.letzter_abruf.slice(0, 10)) : null

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <PageHeader
        kicker={t('versammlungenKicker')}
        title={t('versammlungenTitle')}
        subtitle={t('versammlungenSubtitle')}
        meta={
          stats ? (
            <>
              {letzterAbruf && `${t('versammlungenMetaStand')} ${letzterAbruf} · `}
              {abdeckung.length} {t('versammlungenMetaQuellen')}
            </>
          ) : undefined
        }
      />

      <Toolbar label={t('versammlungenZeitraum')}>
        <Chip dense label={t('versammlungenZeitraumAlle')} active={!jahr} onClick={() => setParam('jahr', '')} />
        {Array.from({ length: aktuellesJahr - ERSTES_JAHR + 1 }, (_, i) => ERSTES_JAHR + i).map((y) => {
          const hatDaten = !stats || jahrHatDaten(y)
          return (
            <Chip
              key={y}
              dense
              label={String(y)}
              active={jahr === String(y)}
              disabled={!hatDaten}
              title={hatDaten ? undefined : t('versammlungenKeineDaten')}
              onClick={() => setParam('jahr', String(y))}
            />
          )
        })}
      </Toolbar>

      <FilterToolbar
        placeholder={t('versammlungenSuche')}
        search={{ value: q, onChange: (v) => setParam('q', v) }}
        filters={[
          {
            label: t('versammlungenKategorie'),
            value: kategorie,
            onChange: (v) => setParam('thema', v),
            options: [
              { value: '', label: t('versammlungenKategorieAlle') },
              ...[...KATEGORIEN]
                .map((k) => ({ value: k, label: katLabel(k) }))
                .sort((a, b) => a.label.localeCompare(b.label, locale)),
            ],
          },
          {
            label: t('versammlungenTyp'),
            value: typ,
            onChange: (v) => setParam('form', v),
            options: [
              { value: '', label: t('versammlungenTypAlle') },
              { value: 'kundgebung', label: t('versammlungenTypKundgebung') },
              { value: 'aufzug', label: t('versammlungenTypAufzug') },
              { value: 'unbekannt', label: t('versammlungenTypUnbekannt') },
            ],
          },
        ]}
      />

      {fehlerStats && !stats && <p style={absatz}>{t('versammlungenFehler')}</p>}
      {ladeStats && !stats && <LoadingSpinner />}

      {stats && (
        <div style={nachladen(ladeStats)}>
          {/* ---------- Vorspann ---------- */}
          <Section>
            <p style={{ ...absatz, fontSize: fontSize.lg, color: c.ink }}>
              {t('versammlungenLede')
                .replace('{von}', datum(stats.zeitraum.von ?? von))
                .replace('{bis}', datum(stats.zeitraum.bis ?? bis))
                .replace('{n}', zahl(stats.versammlungen))
                .replace('{tage}', zahl(stats.versammlungstage))}{' '}
              {luecken.length > 0 &&
                t('versammlungenLedeLuecke').replace(
                  '{luecke}',
                  luecken.map((l) => `${monatJahr(l.von)} – ${monatJahr(l.bis)}`).join(', '),
                )}
            </p>
          </Section>

          {stats.versammlungstage === 0 ? (
            <EmptyState text={t('versammlungenLeer')} />
          ) : (
            <>
              {/* ---------- Zeitverlauf ---------- */}
              <Section
                title={t('versammlungenVerlaufTitle')}
                aside={t(woche ? 'versammlungenProWoche' : 'versammlungenProMonat')}
                note={t('versammlungenVerlaufNote')}
              >
                <Toolbar label={t('versammlungenMass')} tight>
                  <Chip
                    dense
                    label={t('versammlungenMassVersammlungen')}
                    active={mass === 'versammlungen'}
                    onClick={() => setParam('zaehlung', '', false)}
                  />
                  <Chip
                    dense
                    label={t('versammlungenMassTage')}
                    active={mass === 'versammlungstage'}
                    onClick={() => setParam('zaehlung', 'tage', false)}
                  />
                </Toolbar>
                {verlauf && verlauf.punkte.some((p) => p.wert !== null) && (
                  <VerlaufChart punkte={verlauf.punkte} luecken={verlauf.luecken} woche={woche} label={massLabel} />
                )}
                {verlauf && !verlauf.punkte.some((p) => p.wert !== null) && (
                  <p style={absatz}>{t('versammlungenVerlaufLeer')}</p>
                )}
              </Section>

              {/* ---------- Themen ---------- */}
              <Section title={t('versammlungenThemenTitle')} aside={massLabel} note={t('versammlungenThemenNote')}>
                {!themen && <LoadingSpinner />}
                {themen && (
                  <div style={{ display: 'grid', gap: spacing.sm, maxWidth: 720 }}>
                    {themenZeilen.rows.map((k) => (
                      <HBar
                        key={k.kategorie}
                        label={katLabel(k.kategorie)}
                        value={k[mass]}
                        max={themenZeilen.rows[0]?.[mass] ?? 1}
                        color={k.kategorie === kategorie ? c.red : c.inkSoft}
                        formatted={`${zahl(k[mass])} · ${t('versammlungenAnteil').replace(
                          '{p}',
                          ((100 * k[mass]) / (themenZeilen.summe || 1)).toLocaleString(locale, {
                            maximumFractionDigits: 0,
                          }),
                        )}`}
                      />
                    ))}
                  </div>
                )}
              </Section>

              {/* ---------- Wann ---------- */}
              <Section title={t('versammlungenWannTitle')} note={t('versammlungenWannNote')}>
                {stats.wochentag_stunde.length ? (
                  <WannGrid zellen={stats.wochentag_stunde} />
                ) : (
                  <p style={absatz}>{t('versammlungenWannLeer')}</p>
                )}
              </Section>
            </>
          )}
        </div>
      )}

      {/* ---------- Kommende ---------- */}
      <Section
        title={t('versammlungenKommendTitle')}
        aside={liste ? t('versammlungenTreffer').replace('{n}', zahl(liste.total)) : undefined}
        note={t('versammlungenKommendNote')}
      >
        {fehlerListe && !liste && <p style={absatz}>{t('versammlungenFehler')}</p>}
        {ladeListe && !liste && <LoadingSpinner />}
        {liste && (
          <div style={nachladen(ladeListe)}>
            <DataTable
              columns={spalten}
              rows={liste.items}
              rowKey={(v) => v.id}
              emptyText={t('versammlungenKommendLeer')}
            />
            {liste.total > LISTE_LIMIT && (
              <div style={{ marginTop: spacing.lg }}>
                <Pagination
                  current={seite}
                  total={Math.ceil(liste.total / LISTE_LIMIT)}
                  onChange={(p) => setParam('seite', String(p), false)}
                />
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ---------- Methodik ---------- */}
      <Section title={t('versammlungenMethodikTitle')} last>
        <div style={{ display: 'grid', gap: spacing.md }}>
          <p style={absatz}>{t('versammlungenMethodik1')}</p>
          <p style={absatz}>{t('versammlungenMethodik2')}</p>
          <p style={absatz}>{t('versammlungenMethodik3')}</p>
          <p style={absatz}>{t('versammlungenMethodik4')}</p>
          {abdeckung.length > 0 && (
            <ul
              style={{
                margin: 0,
                paddingLeft: spacing.lg,
                display: 'grid',
                gap: spacing.sm,
                fontFamily: fonts.body,
                fontSize: fontSize.md,
                color: c.inkSoft,
                maxWidth: '68ch',
              }}
            >
              {abdeckung.map((a) => (
                <li key={a.quelle}>
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: c.ink }}>
                      {a.name}
                    </a>
                  ) : (
                    a.name
                  )}
                  <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
                    {' · '}
                    {a.bis
                      ? t('versammlungenQuelleZeitraum').replace('{von}', datum(a.von)).replace('{bis}', datum(a.bis))
                      : t('versammlungenQuelleLaufend').replace('{von}', datum(a.von))}
                    {a.lizenz && ` · ${t('versammlungenLizenz')}: ${a.lizenz}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  )
}
