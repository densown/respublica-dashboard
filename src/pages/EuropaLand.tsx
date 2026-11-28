import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Chip, EmptyState, PageHeader, Platzhalter, Section, Sparkline, Stempel, Toolbar, useTheme, VoteBar } from '../design-system'
import { fonts, fontSize, lineHeight, measure, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSeo } from '../hooks/useSeo'
import { EuropaKarte } from '../components/europa/EuropaKarte'
import { datumKurz, einheitWort, fuelle, heuteInBerlin, preis, zahl, type Einheit } from '../components/europa/format'
import { kennzahlText, landNameIso2, landVon } from '../components/europa/laender'
import { QuellenZeile } from '../components/europa/QuellenZeile'
import { guenstigstesFenster, skalaAus } from '../components/europa/strom'
import { Tagesgang } from '../components/europa/Tagesgang'
import type { EpLand, Steckbrief, StromTag, StromVergleich } from '../components/europa/typen'
import { useKarte } from '../components/europa/useKarte'
import { Zeitreihe } from '../components/europa/Zeitreihe'

/**
 * Seite eines Landes: oben, was heute gilt (Strompreis, juengste
 * Abstimmungen im EU-Parlament), darunter der Steckbrief mit Kennzahlen, die
 * sich nur jaehrlich aendern. Jeder Abschnitt nennt seine Quelle.
 */

const ZEITRAEUME = [30, 90, 365] as const

export default function EuropaLand() {
  const { code } = useParams()
  const { c, t, lang } = useTheme()
  const schmal = useIsMobile()
  const land = landVon(code)
  const name = land ? landNameIso2(land.iso2, lang) : ''
  useSeo({
    titel: land ? fuelle(t('elSeoTitel'), { land: name }) : t('europaTitel'),
    beschreibung: land ? fuelle(t('elSeoBeschreibung'), { land: name }) : undefined,
    nichtIndexieren: !land,
  })

  const [einheit] = useLocalStorage<Einheit>('rp-strom-einheit', 'ct')
  const [tage, setTage] = useState<number>(90)
  const karte = useKarte()
  const zonen = land?.zonen ?? []
  const { data: strom } = useApi<StromTag>(zonen.length ? `/api/strom/tag?datum=${heuteInBerlin()}&lang=${lang}` : '')
  const { data: verlauf } = useApi<StromVergleich>(
    zonen.length ? `/api/strom/verlauf?zonen=${zonen.join(',')}&tage=${tage}&lang=${lang}` : '',
  )
  const { data: ep, loading: ladeEp } = useApi<EpLand>(land?.beitritt ? `/api/ep/land/${land.iso3}?lang=${lang}` : '')
  const { data: steckbrief } = useApi<Steckbrief>(land ? `/api/world/steckbrief/${land.iso3}?lang=${lang}` : '')

  const zurueck = (
    <Link
      to="/europa"
      style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, textDecoration: 'none' }}
    >
      ← {t('elZurueck')}
    </Link>
  )

  if (!land) {
    return (
      <div>
        {zurueck}
        <PageHeader title={t('europaTitel')} />
        <EmptyState text={t('elNichtGefunden')} />
      </div>
    )
  }

  const p = (v: number) => preis(v, einheit, lang)
  const absatz = { margin: 0, fontFamily: fonts.body, fontSize: fontSize.base, lineHeight: lineHeight.relaxed, color: c.inkSoft, maxWidth: '68ch' } as const
  const klein = { fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted } as const
  const weiter = (ziel: string, wort: string) => (
    <Link
      to={ziel}
      className="rp-zeile"
      style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs, minHeight: 44, fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.md, color: c.ink, textDecoration: 'none' }}
    >
      {wort} <span aria-hidden style={{ color: c.red }}>→</span>
    </Link>
  )

  const meineZonen = (strom?.zonen ?? []).filter((z) => zonen.includes(z.code) && z.mittel != null)
  const skala = skalaAus((strom?.zonen ?? []).flatMap((z) => z.stunden))
  const fakten = [
    land.beitritt ? fuelle(t('elFaktBeitritt'), { jahr: land.beitritt }) : t('elFaktKeinMitglied'),
    land.euro ? fuelle(t('elFaktEuro'), { jahr: land.euro }) : t('elFaktKeinEuro'),
    t(land.schengen ? 'elFaktSchengen' : 'elFaktKeinSchengen'),
  ]
  const groessteFraktion = Math.max(1, ...(ep?.fraktionen ?? []).map((f) => f.sitze))
  const partner = land.iso2 === 'DE' ? 'fr' : 'de'

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      {zurueck}
      <div style={{ display: 'flex', gap: spacing.xl, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <PageHeader
            kicker={fuelle(t('elKicker'), { hauptstadt: land.hauptstadt[lang] })}
            title={name}
            meta={fakten.join(' · ')}
          />
        </div>
        {karte && (
          <div style={{ width: schmal ? 84 : 150, flexShrink: 0, marginTop: spacing.sm }}>
            <EuropaKarte karte={karte} still hervor={land.iso2} ariaLabel={fuelle(t('elLageAria'), { land: name })} />
          </div>
        )}
      </div>

      <Section title={t('elStromTitel')} aside={t('elLive')} note={zonen.length ? t('stHinweisPreis') : undefined}>
        {zonen.length === 0 && <p style={absatz}>{fuelle(t('elStromKeine'), { land: name })}</p>}
        {zonen.length > 0 && !strom && <Platzhalter zeilen={1} />}
        {strom && zonen.length > 0 && meineZonen.length === 0 && <p style={absatz}>{t('stKeinTag')}</p>}
        {meineZonen.map((z) => {
          const fenster = guenstigstesFenster(z.stunden)
          const diff = z.vortag_mittel != null ? (z.mittel as number) - z.vortag_mittel : null
          return (
            <div key={z.code} style={{ marginBottom: spacing.xl }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: `${spacing.xs}px ${spacing.lg}px` }}>
                <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: fontSize.hero, lineHeight: 1.05, color: c.ink }}>
                  {p(z.mittel as number)}
                </span>
                <span style={klein}>
                  {fuelle(t('elStromZone'), { zone: z.name })}
                  {diff != null && Math.abs(diff) >= 0.5 ? ` · ${diff > 0 ? '▲' : '▼'} ${p(Math.abs(diff))} ${t('stZettelVortag')}` : ''}
                </span>
              </div>
              {fenster && (
                <p style={{ ...absatz, marginTop: spacing.sm }}>
                  {fuelle(t('stSatzFenster'), { von: fenster.von, bis: fenster.bis, preis: p(fenster.mittel) })}
                </p>
              )}
              <Tagesgang
                stunden={z.stunden}
                skala={skala}
                einheit={einheit}
                stunde={null}
                ariaLabel={fuelle(t('stGangAria'), { land: z.name })}
              />
            </div>
          )
        })}
        {zonen.length > 0 && (
          <div style={{ display: 'grid', gap: spacing.sm }}>
            {weiter('/europa/strom', t('europaTeaserWeiter'))}
            <QuellenZeile quelle={strom?.quelle} stand={strom?.stand} />
          </div>
        )}
      </Section>

      {zonen.length > 0 && (
        <Section
          title={t('elVerlaufTitel')}
          aside={fuelle(t('stZettelAside'), { einheit: einheitWort(einheit) })}
          note={t('elVerlaufNote')}
        >
          <Toolbar label={t('evZeitraum')} tight>
            {ZEITRAEUME.map((n) => (
              <Chip key={n} dense label={t(n === 365 ? 'evJahr' : n === 90 ? 'ev90' : 'ev30')} active={tage === n} onClick={() => setTage(n)} />
            ))}
          </Toolbar>
          {verlauf ? (
            <Zeitreihe
              achse={verlauf.tage.map((d) => datumKurz(d, lang))}
              reihen={verlauf.zonen.map((z, i) => ({ name: z.name, farbe: i === 0 ? c.red : c.ink, werte: z.werte }))}
              format={p}
              abNull
              ariaLabel={fuelle(t('stVerlaufAria'), { land: name })}
            />
          ) : (
            <Platzhalter zeilen={1} />
          )}
          <div style={{ marginTop: spacing.sm }}>
            {weiter(`/europa/vergleich?laender=${land.iso2.toLowerCase()},${partner}`, t('elVergleichen'))}
          </div>
        </Section>
      )}

      {land.beitritt != null && (
        <Section title={t('elParlamentTitel')} aside={t('elLive')}>
          {ladeEp && !ep && <Platzhalter zeilen={2} />}
          {ep && (
            <div style={{ display: 'grid', gap: spacing.xl, maxWidth: measure.liste }}>
              <div>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: fontSize.hero, lineHeight: 1.05, color: c.ink }}>
                  {zahl(ep.sitze, lang)}
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: fontSize.md, color: c.muted }}>{t('elSitze')}</div>
              </div>
              <div>
                {ep.fraktionen.map((f) => (
                  <div
                    key={f.code}
                    title={f.name}
                    style={{ display: 'grid', gridTemplateColumns: '6.5rem 1fr 2rem', gap: spacing.md, alignItems: 'center', padding: `${spacing.xs}px 0` }}
                  >
                    <span style={{ fontFamily: fonts.body, fontSize: fontSize.sm, color: c.ink }}>{f.kurz}</span>
                    <span aria-hidden style={{ height: 14, width: `${(f.sitze / groessteFraktion) * 100}%`, minWidth: 2, background: c.ink }} />
                    <span style={{ ...klein, color: c.ink, fontWeight: 700, textAlign: 'right' }}>{f.sitze}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{ margin: `0 0 ${spacing.sm}px`, fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.base, color: c.ink }}>
                  {fuelle(t('elLetzteTitel'), { land: name })}
                </h3>
                {ep.letzte.map((a) => (
                  <div key={a.id} style={{ borderTop: `1px solid ${c.border}`, padding: `${spacing.md}px 0`, display: 'grid', gap: spacing.sm }}>
                    <div style={{ ...klein, display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
                      <span>{datumKurz(a.datum, lang)}</span>
                      {a.ergebnis && (
                        <Stempel
                          wort={t(a.ergebnis === 'angenommen' ? 'accepted' : 'rejected')}
                          art={a.ergebnis === 'angenommen' ? 'ja' : 'nein'}
                          groesse={10}
                          ruhig
                          style={{ marginLeft: 'auto' }}
                        />
                      )}
                    </div>
                    <Link
                      to={`/europa/parlament/${a.id}`}
                      style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.md, lineHeight: lineHeight.tight, color: c.ink, textDecoration: 'none', minHeight: 44, display: 'block' }}
                    >
                      {a.titel}
                    </Link>
                    <VoteBar
                      ja={a.land.ja}
                      nein={a.land.nein}
                      enthalten={a.land.enthaltung}
                      abwesend={a.land.nicht}
                      height={22}
                      animiert={false}
                      ariaLabel={fuelle(t('epStimmenKurz'), { ja: a.land.ja, nein: a.land.nein, enth: a.land.enthaltung })}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gap: spacing.sm }}>
                {weiter(land.iso2 === 'DE' ? '/europa/parlament?ansicht=abgeordnete' : '/europa/parlament', t(land.iso2 === 'DE' ? 'epAnsichtAbgeordnete' : 'epZurueck'))}
                <QuellenZeile quelle={ep.quelle} stand={ep.stand} />
              </div>
            </div>
          )}
        </Section>
      )}

      {steckbrief && steckbrief.kennzahlen.length > 0 && (
        <Section title={t('elSteckbriefTitel')} aside={t('elJaehrlich')} note={t('elSteckbriefNote')} last>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: schmal ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))',
              gap: `${spacing.xl}px ${spacing.lg}px`,
              maxWidth: 900,
            }}
          >
            {steckbrief.kennzahlen.map((k) => (
              <Link
                key={k.code}
                to={`/europa/vergleich?laender=${land.iso2.toLowerCase()},${partner}&reihe=${encodeURIComponent(k.code)}`}
                style={{ textDecoration: 'none', color: c.ink, display: 'block', minHeight: 44 }}
              >
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: fontSize.xl, lineHeight: 1.15 }}>
                  {kennzahlText(k, k.wert, lang)}
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: fontSize.sm, color: c.inkSoft }}>{k.name}</div>
                <div style={klein}>{k.jahr}</div>
                {k.reihe.length > 2 && (
                  <Sparkline data={k.reihe.map((r) => r.wert)} width={110} height={26} color={c.red} style={{ marginTop: spacing.xs }} />
                )}
              </Link>
            ))}
          </div>
          <p style={{ ...klein, margin: `${spacing.lg}px 0 0`, lineHeight: 1.7 }}>
            {t('quelleWort')}:{' '}
            {[...new Map(steckbrief.kennzahlen.filter((k) => k.quelle.name).map((k) => [k.quelle.name, k.quelle])).values()].map((q, i) => (
              <span key={q.name}>
                {i > 0 && ', '}
                {q.url ? (
                  <a href={q.url} target="_blank" rel="noopener noreferrer" style={{ color: c.ink }}>
                    {q.name}
                  </a>
                ) : (
                  q.name
                )}
                {q.lizenz ? ` (${q.lizenz})` : ''}
              </span>
            ))}
            {' · '}
            <Link to="/weltkarte" style={{ color: c.ink }}>
              {t('elWeltkarte')}
            </Link>
          </p>
        </Section>
      )}
    </div>
  )
}
