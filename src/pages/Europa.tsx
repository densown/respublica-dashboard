import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader, Platzhalter, Section, Toolbar, useTheme, ViewToggle } from '../design-system'
import { Piktogramm, type PiktogrammName } from '../design-system/components/Piktogramm'
import { fonts, fontSize, lineHeight, measure, radius, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSeo } from '../hooks/useSeo'
import { EuropaKarte } from '../components/europa/EuropaKarte'
import { datumKurz, einheitWort, fuelle, heuteInBerlin, preis, preisWert, zahl, type Einheit } from '../components/europa/format'
import { laenderSortiert, landPfad, LAENDER } from '../components/europa/laender'
import { QuellenZeile } from '../components/europa/QuellenZeile'
import { preisFarbe, skalaAus } from '../components/europa/strom'
import type { EpDetail, EpListe, EpStand, QuellenStand, Stimmen, StromTag } from '../components/europa/typen'
import { useKarte } from '../components/europa/useKarte'

/**
 * Einstieg in den Bereich Europa: die Karte. Zwei Ebenen, beide von heute:
 * der Strompreis je Land und die juengste Abstimmung im EU-Parlament. Ein
 * Tipp auf ein Land oeffnet dessen Seite. Unter der Karte stehen alle Laender
 * als Liste, weil Luxemburg oder Malta auf dem Handy kein Finger trifft.
 */

type Ebene = 'strom' | 'abstimmung'

export default function Europa() {
  const { c, t, lang } = useTheme()
  const schmal = useIsMobile()
  const [params, setParams] = useSearchParams()
  useSeo({ titel: t('europaTitel'), beschreibung: t('europaSeoBeschreibung'), pfad: '/europa' })

  const ebene: Ebene = params.get('ebene') === 'abstimmung' ? 'abstimmung' : 'strom'
  const [einheit] = useLocalStorage<Einheit>('rp-strom-einheit', 'ct')
  const karte = useKarte()
  const { data: strom } = useApi<StromTag>(`/api/strom/tag?datum=${heuteInBerlin()}&lang=${lang}`)
  const { data: ep } = useApi<EpStand>('/api/ep/stand')
  const { data: juengste } = useApi<EpListe>(ebene === 'abstimmung' ? `/api/ep/abstimmungen?limit=1&lang=${lang}` : '')
  const abstimmungId = juengste?.abstimmungen[0]?.id
  const { data: abstimmung } = useApi<EpDetail>(abstimmungId ? `/api/ep/abstimmungen/${abstimmungId}?lang=${lang}` : '')
  const { data: quellen } = useApi<{ quellen: QuellenStand[] }>('/api/quellen?bereich=europa')

  // Strompreis je Land: Mittel der Zonen, fuer die Preise vorliegen
  const preisJeLand = useMemo(() => {
    const m = new Map<string, number>()
    for (const land of LAENDER) {
      const werte = land.zonen
        .map((z) => strom?.zonen.find((x) => x.code === z)?.mittel)
        .filter((v): v is number => v != null)
      if (werte.length) m.set(land.iso2, werte.reduce((a, b) => a + b, 0) / werte.length)
    }
    return m
  }, [strom])
  const skala = useMemo(() => skalaAus([...preisJeLand.values()]), [preisJeLand])

  const stimmenJeLand = useMemo(() => {
    const m = new Map<string, Stimmen>()
    for (const l of abstimmung?.laender ?? []) {
      const land = LAENDER.find((x) => x.iso3 === l.land)
      if (land) m.set(land.iso2, l)
    }
    return m
  }, [abstimmung])

  const stimmFarbe = (s: Stimmen | undefined) => {
    if (!s) return null
    const abgegeben = s.ja + s.nein + s.enthaltung
    if (!abgegeben) return null
    const [farbe, anteil] =
      s.ja > s.nein && s.ja >= s.enthaltung
        ? [c.yes, s.ja / abgegeben]
        : s.nein > s.ja && s.nein >= s.enthaltung
          ? [c.no, s.nein / abgegeben]
          : [c.abstain, 0.6]
    return `color-mix(in srgb, ${farbe} ${Math.round(25 + anteil * 55)}%, ${c.bg})`
  }

  const wertText = (iso2: string): string | null => {
    if (ebene === 'strom') {
      const v = preisJeLand.get(iso2)
      return v == null ? null : preis(v, einheit, lang)
    }
    const s = stimmenJeLand.get(iso2)
    return s ? fuelle(t('epStimmenKurz'), { ja: s.ja, nein: s.nein, enth: s.enthaltung }) : null
  }
  const laender = useMemo(() => laenderSortiert(lang), [lang])
  const z = strom?.zonen.find((x) => x.code === 'DE-LU')

  const eintrag = (pfad: string, icon: PiktogrammName, titel: string, text: string, zahlZeile?: string) => (
    <Link
      to={pfad}
      className="rp-zeile"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.lg,
        padding: `${spacing.lg}px 0`,
        borderTop: `1px solid ${c.border}`,
        textDecoration: 'none',
        minHeight: 44,
      }}
    >
      <span style={{ color: c.red, marginTop: 2 }}>
        <Piktogramm name={icon} size={26} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: fonts.display, fontWeight: 700, fontSize: fontSize.lg, lineHeight: lineHeight.tight, color: c.ink }}>
          {titel}
        </span>
        <span style={{ display: 'block', marginTop: spacing.xs, fontFamily: fonts.body, fontSize: fontSize.md, lineHeight: lineHeight.normal, color: c.muted }}>
          {text}
        </span>
        {zahlZeile && (
          <span style={{ display: 'block', marginTop: spacing.xs, fontFamily: fonts.mono, fontSize: fontSize.sm, fontWeight: 700, color: c.ink }}>
            {zahlZeile}
          </span>
        )}
      </span>
      <span className="rp-pfeil" style={{ color: c.subtle, alignSelf: 'center' }}>
        <Piktogramm name="pfeil" size={18} />
      </span>
    </Link>
  )

  const kopf =
    ebene === 'strom' ? (
      <>
        <strong>{t('ekKopfStrom')}</strong>
        <br />
        {einheitWort(einheit)}
      </>
    ) : (
      <>
        <strong>{t('ekKopfAbstimmung')}</strong>
        <br />
        {t('ekKopfAbstimmungZahl')}
      </>
    )

  const legende =
    ebene === 'strom' ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
        <span>{preis(skala.lo, einheit, lang)}</span>
        <span
          aria-hidden
          style={{
            width: 140,
            height: 10,
            borderRadius: radius.xs,
            border: `1px solid ${c.cardBorder}`,
            background: `linear-gradient(to right, ${preisFarbe(skala.lo, skala, c)}, ${preisFarbe(skala.hi, skala, c)})`,
          }}
        />
        <span>{preis(skala.hi, einheit, lang)}</span>
      </div>
    ) : (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.lg, fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted }}>
        {(
          [
            [c.yes, t('ekLegendeJa')],
            [c.no, t('ekLegendeNein')],
            [c.abstain, t('ekLegendeGeteilt')],
          ] as const
        ).map(([farbe, wort]) => (
          <span key={wort} style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.sm }}>
            <span aria-hidden style={{ width: 12, height: 12, background: `color-mix(in srgb, ${farbe} 70%, ${c.bg})` }} />
            {wort}
          </span>
        ))}
      </div>
    )

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <PageHeader kicker={t('europaKicker')} title={t('europaTitel')} subtitle={t('europaIntro')} />

      <Toolbar label={t('ekEbene')}>
        <ViewToggle<Ebene>
          ariaLabel={t('ekEbene')}
          value={ebene}
          onChange={(v) => setParams(v === 'strom' ? {} : { ebene: v }, { replace: true })}
          options={[
            { value: 'strom', label: t('ekEbeneStrom') },
            { value: 'abstimmung', label: t('ekEbeneAbstimmung') },
          ]}
        />
      </Toolbar>

      <div
        style={
          schmal
            ? undefined
            : { display: 'grid', gridTemplateColumns: 'minmax(0, 620px) minmax(260px, 1fr)', columnGap: spacing.xxxl, alignItems: 'start' }
        }
      >
        <div style={{ marginBottom: spacing.xl }}>
          {ebene === 'abstimmung' && abstimmung && (
            <p style={{ margin: `0 0 ${spacing.md}px`, fontFamily: fonts.body, fontSize: fontSize.md, lineHeight: lineHeight.normal, color: c.inkSoft }}>
              {datumKurz(abstimmung.datum, lang)}:{' '}
              <Link to={`/europa/parlament/${abstimmung.id}`} style={{ color: c.ink, fontWeight: 600 }}>
                {abstimmung.titel}
              </Link>
            </p>
          )}
          {karte ? (
            <EuropaKarte
              karte={karte}
              schmal={schmal}
              ariaLabel={t('ekKarteAria')}
              kopf={kopf}
              farbe={(iso2) =>
                ebene === 'strom'
                  ? preisJeLand.has(iso2)
                    ? preisFarbe(preisJeLand.get(iso2) as number, skala, c)
                    : null
                  : stimmFarbe(stimmenJeLand.get(iso2))
              }
              beschriftung={(iso2) => {
                if (ebene === 'strom') {
                  const v = preisJeLand.get(iso2)
                  return v == null ? null : preisWert(v, einheit, lang)
                }
                const s = stimmenJeLand.get(iso2)
                return s ? `${s.ja}:${s.nein}` : null
              }}
              ariaText={(iso2) => {
                const name = laender.find((l) => l.iso2 === iso2)?.name ?? iso2
                const w = wertText(iso2)
                return w ? `${name}: ${w}` : name
              }}
            />
          ) : (
            <Platzhalter zeilen={2} />
          )}
          <div style={{ marginTop: spacing.md, display: 'grid', gap: spacing.sm }}>
            {legende}
            <p style={{ margin: 0, fontFamily: fonts.body, fontSize: fontSize.sm, lineHeight: lineHeight.normal, color: c.muted, maxWidth: '62ch' }}>
              {t(ebene === 'strom' ? 'ekNoteStrom' : 'ekNoteAbstimmung')}
            </p>
            <QuellenZeile
              quelle={ebene === 'strom' ? strom?.quelle : abstimmung?.quelle}
              stand={ebene === 'strom' ? strom?.stand : abstimmung?.stand}
            />
          </div>
        </div>

        <Section title={t('ekListeTitel')} aside={t(ebene === 'strom' ? 'ekListeAsideStrom' : 'ekListeAsideAbstimmung')}>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: schmal ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
              columnGap: spacing.xl,
            }}
          >
            {laender.map((l) => {
              const st = stimmenJeLand.get(l.iso2)
              // In der Liste kurz: der ausgeschriebene Satz sprengt zwei Spalten
              const w = ebene === 'strom' ? wertText(l.iso2) : st ? `${st.ja} : ${st.nein}` : null
              return (
                <li key={l.iso2} style={{ borderTop: `1px solid ${c.border}` }}>
                  <Link
                    to={landPfad(l.iso2)}
                    className="rp-zeile"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: spacing.md,
                      minHeight: 44,
                      textDecoration: 'none',
                      color: c.ink,
                    }}
                  >
                    <span style={{ fontFamily: fonts.body, fontSize: fontSize.md, fontWeight: 600 }}>{l.name}</span>
                    <span style={{ fontFamily: fonts.mono, fontSize: fontSize.xs, color: w ? c.inkSoft : c.subtle, whiteSpace: 'nowrap' }}>
                      {w ?? '·'}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      </div>

      <Section title={t('ekMehrTitel')}>
        <div style={{ maxWidth: measure.liste, borderBottom: `1px solid ${c.border}` }}>
          {eintrag(
            '/europa/strom',
            'strom',
            t('europaStromTitel'),
            t('europaStromText'),
            z?.mittel != null ? fuelle(t('europaStromZahl'), { land: z.name, preis: preis(z.mittel, einheit, lang) }) : undefined,
          )}
          {eintrag(
            '/europa/parlament',
            'europa',
            t('europaParlamentTitel'),
            t('europaParlamentText'),
            ep?.letzte_abstimmung
              ? fuelle(t('europaParlamentZahl'), { n: zahl(ep.abstimmungen, lang), datum: datumKurz(ep.letzte_abstimmung, lang) })
              : undefined,
          )}
          {eintrag('/europa/vergleich', 'welt', t('evTitel'), t('evTeaser'))}
        </div>
      </Section>

      <Section title={t('europaKommtTitel')}>
        <p style={{ margin: 0, fontFamily: fonts.body, fontSize: fontSize.base, lineHeight: lineHeight.relaxed, color: c.inkSoft, maxWidth: '68ch' }}>
          {t('europaKommtText')}
        </p>
      </Section>

      {quellen && quellen.quellen.length > 0 && (
        <Section title={t('europaStandTitel')} note={t('europaStandNote')} last>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: measure.liste }}>
            {quellen.quellen.map((q) => (
              <li
                key={q.slug}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.xs}px 0`,
                  borderTop: `1px solid ${c.border}`,
                  fontFamily: fonts.mono,
                  fontSize: fontSize.xs,
                  color: c.muted,
                }}
              >
                <a
                  href={q.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: c.ink, fontWeight: 700, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
                >
                  {q.name}
                </a>
                <span>
                  {q.lizenz ? `${q.lizenz} · ` : ''}
                  <span style={{ color: q.zustand === 'veraltet' ? c.red : c.muted, fontWeight: q.zustand === 'veraltet' ? 700 : 400 }}>
                    {q.zustand === 'veraltet'
                      ? t('quelleZustandVeraltet')
                      : q.zustand === 'unbekannt'
                        ? t('quelleZustandUnbekannt')
                        : t('quelleZustandAktuell')}
                  </span>
                  {q.letzter_erfolg
                    ? ` · ${new Date(q.letzter_erfolg).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
