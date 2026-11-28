import { Link, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState, Erklaerung, PageHeader, Pagination, Platzhalter, Section, useTheme, VoteBar } from '../design-system'
import { fonts, fontSize, measure, motion, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useSeo } from '../hooks/useSeo'
import { EpKarte } from '../components/europa/EpKarte'
import { fuelle, zahl } from '../components/europa/format'
import { QuellenZeile } from '../components/europa/QuellenZeile'
import type { EpAbgeordneter } from '../components/europa/typen'

/** Profil einer oder eines Abgeordneten im EU-Parlament: Kennzahlen und Stimmen. */

const LIMIT = 20

export default function EuropaAbgeordneter() {
  const { id } = useParams()
  const { c, t, lang } = useTheme()
  const [params, setParams] = useSearchParams()
  const seite = Math.max(1, Number(params.get('seite')) || 1)
  const gueltig = /^\d+$/.test(id ?? '')
  const { data, loading, error, refetch } = useApi<EpAbgeordneter>(
    gueltig ? `/api/ep/abgeordnete/${id}?limit=${LIMIT}&offset=${(seite - 1) * LIMIT}&lang=${lang}` : '',
  )
  useSeo({ titel: data ? `${data.name}, ${t('epTitel')}` : t('epTitel'), nichtIndexieren: !gueltig || Boolean(error) })

  const zurueck = (
    <Link
      to="/europa/parlament?ansicht=abgeordnete"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 44,
        fontFamily: fonts.mono,
        fontSize: fontSize.xs,
        color: c.muted,
        textDecoration: 'none',
      }}
    >
      ← {t('epAbgZurueck')}
    </Link>
  )

  if (!gueltig || (error && !data)) {
    return (
      <div>
        {zurueck}
        <PageHeader title={t('epTitel')} />
        <EmptyState
          text={gueltig ? t('europaFehler') : t('epAbgNichtGefunden')}
          action={gueltig ? { label: t('europaNochmal'), onClick: refetch } : undefined}
        />
      </div>
    )
  }
  if (loading && !data) {
    return (
      <div>
        {zurueck}
        <Platzhalter zeilen={3} />
      </div>
    )
  }
  if (!data) return null

  const s = data.stimmen
  const kennzahl = (wert: string, wortKnoten: React.ReactNode) => (
    <div>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: fontSize.xxl, color: c.ink, lineHeight: 1.1 }}>
        {wert}
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, marginTop: spacing.xs }}>{wortKnoten}</div>
    </div>
  )

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      {zurueck}
      <PageHeader
        kicker={fuelle(t('epAbgKicker'), { partei: data.partei ?? '', fraktion: data.fraktion_kurz }).replace(/^ · /, '')}
        title={data.name}
        meta={
          <>
            {data.im_amt ? data.fraktion_name : `${t('epAbgNichtImAmt')} · ${data.fraktion_name}`}
            {' · '}
            <a href={data.profil_url} target="_blank" rel="noopener noreferrer" style={{ color: c.ink }}>
              {t('epAbgProfil')}
            </a>
          </>
        }
      />

      <Section title={t('epAbgStimmen')} aside={fuelle(t('epTreffer'), { n: zahl(data.abstimmungen, lang) })}>
        <div style={{ display: 'grid', gap: spacing.xl, maxWidth: measure.liste }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xxl }}>
            {data.teilnahme != null && kennzahl(`${zahl(data.teilnahme, lang, 1)} %`, t('epAbgTeilnahme'))}
            {data.mit_fraktion != null &&
              kennzahl(
                `${zahl(data.mit_fraktion, lang, 1)} %`,
                <Erklaerung text={t('epAbgMitFraktionErkl')}>{t('epAbgMitFraktion')}</Erklaerung>,
              )}
          </div>
          <VoteBar
            ja={s.ja}
            nein={s.nein}
            enthalten={s.enthaltung}
            abwesend={s.nicht}
            height={32}
            beschriftung="wort"
            ariaLabel={fuelle(t('epStimmenKurz'), { ja: s.ja, nein: s.nein, enth: s.enthaltung })}
          />
        </div>
      </Section>

      <Section title={t('epAbgLetzte')} note={t('epAbgNote')}>
        <div style={{ opacity: loading ? 0.6 : 1, transition: `opacity ${motion.fast} ${motion.easing}` }}>
          {data.letzte.map((a) => (
            <EpKarte key={a.id} a={a} position={a.position} />
          ))}
          {data.abstimmungen > LIMIT && (
            <div style={{ marginTop: spacing.lg }}>
              <Pagination
                current={seite}
                total={Math.ceil(data.abstimmungen / LIMIT)}
                onChange={(p) => {
                  setParams(p > 1 ? { seite: String(p) } : {}, { replace: true })
                  window.scrollTo({ top: 0 })
                }}
              />
            </div>
          )}
        </div>
      </Section>

      <Section last>
        <QuellenZeile quelle={data.quelle} stand={data.stand} />
      </Section>
    </div>
  )
}
