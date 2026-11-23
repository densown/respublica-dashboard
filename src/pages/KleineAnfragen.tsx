import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Chip,
  EmptyState,
  FilterToolbar,
  LoadingSpinner,
  PageHeader,
  Pagination,
  Section,
  Toolbar,
  useTheme,
} from '../design-system'
import { fonts, fontSize, lineHeight, motion, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useSeo } from '../hooks/useSeo'
import { AntwortKarte } from './kleineAnfragen/AntwortKarte'
import { ressortKurz, type FacettenResponse, type ListeResponse, type WocheResponse } from './kleineAnfragen/types'

/**
 * Tracker Kleine Anfragen, Beta.
 *
 * Wie Demokratie-Index und Versammlungen noch nicht in der Navigation
 * verlinkt; erreichbar unter /kleine-anfragen. Daten: /api/kleine-anfragen*
 * (respublica-api, Migration 021). Zusammenfassungen und Kernzahlen sind
 * automatisch erstellt, die Seite sagt das an jeder Karte und in der Methodik.
 */

const LIMIT = 20

export default function KleineAnfragen() {
  const { c, t, lang } = useTheme()
  const [params, setParams] = useSearchParams()
  useSeo({ titel: t('kaSeoTitel'), beschreibung: t('kaSeoBeschreibung') })

  const q = params.get('q') ?? ''
  const fraktion = params.get('fraktion') ?? ''
  const ressort = params.get('ressort') ?? ''
  const sachgebiet = params.get('sachgebiet') ?? ''
  const nurZahlen = params.get('zahlen') === '1'
  const nichtErhoben = params.get('nichtwissen') === '1'
  const seite = Math.max(1, Number(params.get('seite')) || 1)

  // Suchfeld lokal halten und verzoegert in die URL schreiben: sonst ein
  // Abruf je Tastendruck
  const [eingabe, setEingabe] = useState(q)
  const qVerzoegert = useDebouncedValue(eingabe, 350)

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

  useEffect(() => {
    if (qVerzoegert.trim() !== q) setParam('q', qVerzoegert.trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qVerzoegert])

  const sortParam = params.get('sort') ?? ''
  const sort = sortParam || (q ? 'relevanz' : 'datum')

  const filterQs = [
    q && `q=${encodeURIComponent(q)}`,
    fraktion && `fraktion=${encodeURIComponent(fraktion)}`,
    ressort && `ressort=${encodeURIComponent(ressort)}`,
    sachgebiet && `sachgebiet=${encodeURIComponent(sachgebiet)}`,
    nurZahlen && 'nur_zahlen=1',
    nichtErhoben && 'nicht_erhoben=1',
  ]
    .filter(Boolean)
    .join('&')
  const gefiltert = Boolean(filterQs)
  const listUrl = `/api/kleine-anfragen?limit=${LIMIT}&offset=${(seite - 1) * LIMIT}&sort=${sort}${filterQs ? `&${filterQs}` : ''}`

  const { data: facetten } = useApi<FacettenResponse>('/api/kleine-anfragen/facetten')
  const { data: woche, loading: ladeWoche } = useApi<WocheResponse>(gefiltert ? '' : '/api/kleine-anfragen/woche?top=5')
  const { data: liste, loading: ladeListe, error: fehlerListe } = useApi<ListeResponse>(listUrl)

  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const zahl = (n: number) => n.toLocaleString(locale)
  const datum = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' })

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

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <PageHeader
        kicker={t('kaKicker')}
        title={t('kaTitle')}
        subtitle={t('kaSubtitle')}
        meta={
          facetten && facetten.gesamt > 0 && facetten.zeitraum.von
            ? t('kaMeta')
                .replace('{n}', zahl(facetten.gesamt))
                .replace('{von}', datum(facetten.zeitraum.von))
                .replace('{a}', zahl(facetten.ausgewertet))
            : undefined
        }
      />

      {!gefiltert && (
        <Section
          title={t('kaWocheTitle')}
          aside={woche ? t('kaWocheAside').replace('{n}', zahl(woche.neu)) : undefined}
          note={t('kaWocheNote')}
        >
          {ladeWoche && !woche && <LoadingSpinner />}
          {woche && woche.daten.length === 0 && <p style={absatz}>{t('kaWocheLeer')}</p>}
          {woche && woche.daten.length > 0 && (
            <div>
              {woche.daten.map((a) => (
                <AntwortKarte key={a.id} a={a} kompakt />
              ))}
            </div>
          )}
        </Section>
      )}

      <FilterToolbar
        placeholder={t('kaSuche')}
        search={{ value: eingabe, onChange: setEingabe }}
        filters={[
          {
            label: t('kaFraktion'),
            value: fraktion,
            onChange: (v) => setParam('fraktion', v),
            options: [
              { value: '', label: t('kaFraktionAlle') },
              ...(facetten?.fraktionen ?? []).map((f) => ({ value: f.fraktion, label: `${f.name} (${zahl(f.anzahl)})` })),
            ],
          },
          {
            label: t('kaRessort'),
            value: ressort,
            onChange: (v) => setParam('ressort', v),
            options: [
              { value: '', label: t('kaRessortAlle') },
              ...(facetten?.ressorts ?? []).map((r) => ({ value: r.ressort, label: `${ressortKurz(r.ressort)} (${zahl(r.anzahl)})` })),
            ],
          },
          {
            label: t('kaSachgebiet'),
            value: sachgebiet,
            onChange: (v) => setParam('sachgebiet', v),
            options: [
              { value: '', label: t('kaSachgebietAlle') },
              ...(facetten?.sachgebiete ?? []).map((s) => ({ value: s.sachgebiet, label: `${s.sachgebiet} (${zahl(s.anzahl)})` })),
            ],
          },
        ]}
      />

      <Toolbar label={t('kaSortierung')}>
        <Chip dense label={t('kaSortDatum')} active={sort === 'datum'} onClick={() => setParam('sort', q ? 'datum' : '')} />
        <Chip dense label={t('kaSortWert')} active={sort === 'wert'} onClick={() => setParam('sort', 'wert')} />
        {q && <Chip dense label={t('kaSortRelevanz')} active={sort === 'relevanz'} onClick={() => setParam('sort', '')} />}
        <Chip dense label={t('kaNurZahlen')} active={nurZahlen} onClick={() => setParam('zahlen', nurZahlen ? '' : '1')} />
        <Chip dense label={t('kaNichtErhoben')} active={nichtErhoben} onClick={() => setParam('nichtwissen', nichtErhoben ? '' : '1')} />
      </Toolbar>

      <Section title={t('kaListeTitle')} aside={liste ? t('kaTreffer').replace('{n}', zahl(liste.total)) : undefined}>
        {fehlerListe && !liste && <p style={absatz}>{t('kaFehler')}</p>}
        {ladeListe && !liste && <LoadingSpinner />}
        {liste && (
          <div style={nachladen(ladeListe)}>
            {liste.daten.length === 0 ? (
              <EmptyState text={t('kaLeer')} />
            ) : (
              liste.daten.map((a) => <AntwortKarte key={a.id} a={a} />)
            )}
            {liste.total > LIMIT && (
              <div style={{ marginTop: spacing.lg }}>
                <Pagination
                  current={seite}
                  total={Math.ceil(liste.total / LIMIT)}
                  onChange={(p) => setParam('seite', String(p), false)}
                />
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title={t('kaMethodikTitle')} last>
        <div style={{ display: 'grid', gap: spacing.md }}>
          <p style={absatz}>{t('kaMethodik1')}</p>
          <p style={absatz}>{t('kaMethodik2')}</p>
          <p style={absatz}>{t('kaMethodik3')}</p>
          <p style={absatz}>{t('kaMethodik4')}</p>
          {facetten?.quelle && (
            <p style={{ ...absatz, fontSize: fontSize.sm }}>
              <a href={facetten.quelle.url} target="_blank" rel="noopener noreferrer" style={{ color: c.ink }}>
                {facetten.quelle.name}
              </a>
            </p>
          )}
        </div>
      </Section>
    </div>
  )
}
