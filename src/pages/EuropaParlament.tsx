import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Chip,
  EmptyState,
  FilterToolbar,
  PageHeader,
  Pagination,
  Platzhalter,
  Section,
  Toolbar,
  useTheme,
  ViewToggle,
} from '../design-system'
import { fonts, fontSize, lineHeight, measure, motion, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useSeo } from '../hooks/useSeo'
import { artWort, EP_ARTEN } from '../components/europa/epArt'
import { EpKarte } from '../components/europa/EpKarte'
import { datumKurz, fuelle, zahl } from '../components/europa/format'
import { QuellenZeile, StandStempel } from '../components/europa/QuellenZeile'
import type { EpAbgeordnetenListe, EpListe, EpStand } from '../components/europa/typen'

/**
 * EU-Parlament: die Hauptabstimmungen der 10. Wahlperiode und die deutschen
 * Abgeordneten. Daten: /api/ep/* (respublica-api, Migration 023), Quelle
 * HowTheyVote.eu. Filter stehen in der Adresse, damit man eine Auswahl
 * teilen kann.
 */

const LIMIT = 20
type Ansicht = 'abstimmungen' | 'abgeordnete'

export default function EuropaParlament() {
  const { c, t, lang } = useTheme()
  const [params, setParams] = useSearchParams()
  useSeo({ titel: t('epTitel'), beschreibung: t('epSeoBeschreibung'), pfad: '/europa/parlament' })

  const ansicht: Ansicht = params.get('ansicht') === 'abgeordnete' ? 'abgeordnete' : 'abstimmungen'
  const q = params.get('q') ?? ''
  const ergebnis = params.get('ergebnis') ?? ''
  const art = params.get('art') ?? ''
  const knapp = params.get('knapp') === '1'
  const seite = Math.max(1, Number(params.get('seite')) || 1)

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

  const filter = [
    q && `q=${encodeURIComponent(q)}`,
    ergebnis && `ergebnis=${encodeURIComponent(ergebnis)}`,
    art && `art=${encodeURIComponent(art)}`,
    knapp && 'knapp=1',
  ]
    .filter(Boolean)
    .join('&')
  const gefiltert = Boolean(filter)

  const { data: stand } = useApi<EpStand>('/api/ep/stand')
  const listeUrl =
    ansicht === 'abstimmungen'
      ? `/api/ep/abstimmungen?limit=${LIMIT}&offset=${(seite - 1) * LIMIT}&lang=${lang}${filter ? `&${filter}` : ''}`
      : ''
  const { data: liste, loading: ladeListe, error: fehlerListe, refetch } = useApi<EpListe>(listeUrl)
  const {
    data: abgeordnete,
    loading: ladeAbg,
    error: fehlerAbg,
    refetch: refetchAbg,
  } = useApi<EpAbgeordnetenListe>(ansicht === 'abgeordnete' ? '/api/ep/abgeordnete?land=DEU' : '')

  const absatz = {
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    lineHeight: lineHeight.relaxed,
    color: c.inkSoft,
    maxWidth: '68ch',
    margin: 0,
  } as const

  const fehler = (nochmal: () => void) => (
    <EmptyState text={t('europaFehler')} action={{ label: t('europaNochmal'), onClick: nochmal }} />
  )

  // Suche in der Abgeordnetenliste im Browser: 96 Namen, kein Abruf noetig
  const gefunden = useMemo(() => {
    const alle = abgeordnete?.abgeordnete ?? []
    const s = eingabe.trim().toLocaleLowerCase('de')
    if (!s) return alle
    return alle.filter((m) => `${m.name} ${m.partei ?? ''} ${m.fraktion_kurz}`.toLocaleLowerCase('de').includes(s))
  }, [abgeordnete, eingabe])

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <PageHeader
        kicker={t('epKicker')}
        title={t('epTitel')}
        subtitle={t('epSubtitle')}
        meta={
          stand && stand.letzte_abstimmung ? (
            <>
              {fuelle(t('epMeta'), {
                n: zahl(stand.abstimmungen, lang),
                datum: datumKurz(stand.letzte_abstimmung, lang),
                m: zahl(stand.abgeordnete, lang),
              })}
              {' · '}
              <StandStempel stand={stand.stand} />
            </>
          ) : undefined
        }
      />

      <Toolbar label={t('epAnsicht')}>
        <ViewToggle<Ansicht>
          ariaLabel={t('epAnsicht')}
          value={ansicht}
          onChange={(v) => {
            setEingabe('')
            setParams(v === 'abgeordnete' ? { ansicht: v } : {}, { replace: true })
          }}
          options={[
            { value: 'abstimmungen', label: t('epAnsichtAbstimmungen') },
            { value: 'abgeordnete', label: t('epAnsichtAbgeordnete') },
          ]}
        />
      </Toolbar>

      {ansicht === 'abstimmungen' && (
        <>
          <FilterToolbar
            placeholder={t('epSuche')}
            search={{ value: eingabe, onChange: setEingabe }}
            filters={[
              {
                label: t('epErgebnis'),
                value: ergebnis,
                onChange: (v) => setParam('ergebnis', v),
                options: [
                  { value: '', label: t('epErgebnisAlle') },
                  { value: 'angenommen', label: t('accepted') },
                  { value: 'abgelehnt', label: t('rejected') },
                ],
              },
              {
                label: t('epArt'),
                value: art,
                onChange: (v) => setParam('art', v),
                options: [{ value: '', label: t('epArtAlle') }, ...EP_ARTEN.map((a) => ({ value: a, label: t(artWort(a)) }))],
              },
            ]}
          />
          <Toolbar>
            <Chip
              dense
              label={t('epKnapp')}
              title={t('epKnappTitel')}
              active={knapp}
              onClick={() => setParam('knapp', knapp ? '' : '1')}
            />
            {gefiltert && (
              <Chip
                dense
                label={t('epFilterLoeschen')}
                active={false}
                onClick={() => {
                  setEingabe('')
                  setParams({}, { replace: true })
                }}
              />
            )}
          </Toolbar>

          <Section
            title={t('epListeTitel')}
            aside={liste ? fuelle(t('epTreffer'), { n: zahl(liste.gesamt, lang) }) : undefined}
          >
            {fehlerListe && !liste && fehler(refetch)}
            {ladeListe && !liste && <Platzhalter zeilen={4} />}
            {liste && (
              <div style={{ opacity: ladeListe ? 0.6 : 1, transition: `opacity ${motion.fast} ${motion.easing}` }}>
                {liste.abstimmungen.length === 0 ? (
                  <EmptyState text={t('epLeer')} />
                ) : (
                  liste.abstimmungen.map((a) => <EpKarte key={a.id} a={a} />)
                )}
                {liste.gesamt > LIMIT && (
                  <div style={{ marginTop: spacing.lg }}>
                    <Pagination
                      current={seite}
                      total={Math.ceil(liste.gesamt / LIMIT)}
                      onChange={(p) => {
                        setParam('seite', p > 1 ? String(p) : '', false)
                        window.scrollTo({ top: 0 })
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </Section>
        </>
      )}

      {ansicht === 'abgeordnete' && (
        <>
          <FilterToolbar placeholder={t('epAbgSuche')} search={{ value: eingabe, onChange: setEingabe }} filters={[]} />
          <Section
            title={t('epAbgTitel')}
            aside={abgeordnete ? fuelle(t('epAbgAside'), { n: abgeordnete.abgeordnete.length }) : undefined}
            note={t('epAbgNote')}
          >
            {fehlerAbg && !abgeordnete && fehler(refetchAbg)}
            {ladeAbg && !abgeordnete && <Platzhalter zeilen={8} form="zeile" />}
            {abgeordnete && gefunden.length === 0 && <EmptyState text={t('epLeer')} />}
            {abgeordnete && gefunden.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: measure.liste }}>
                {gefunden.map((m) => (
                  <li key={m.id} style={{ borderTop: `1px solid ${c.border}` }}>
                    <Link
                      to={`/europa/parlament/abgeordnete/${m.id}`}
                      className="rp-zeile"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.md,
                        minHeight: 56,
                        padding: `${spacing.sm}px 0`,
                        textDecoration: 'none',
                        color: c.ink,
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: fonts.body, fontSize: fontSize.base, fontWeight: 600 }}>
                          {m.name}
                        </span>
                        <span style={{ display: 'block', fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
                          {[m.partei, m.fraktion_kurz].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      {m.teilnahme != null && (
                        <span style={{ textAlign: 'right', fontFamily: fonts.mono, whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'block', fontSize: fontSize.base, fontWeight: 700 }}>
                            {zahl(m.teilnahme, lang, 1)} %
                          </span>
                          <span style={{ display: 'block', fontSize: fontSize.micro, color: c.muted }}>
                            {t('epAbgTeilnahme')}
                          </span>
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}

      <Section title={t('epMethodikTitel')} last>
        <div style={{ display: 'grid', gap: spacing.md }}>
          <p style={absatz}>{t('epMethodik1')}</p>
          <p style={absatz}>{t('epMethodik2')}</p>
          <QuellenZeile quelle={stand?.quelle} stand={stand?.stand} />
        </div>
      </Section>
    </div>
  )
}
