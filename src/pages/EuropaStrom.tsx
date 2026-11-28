import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Chip,
  EmptyState,
  PageHeader,
  Platzhalter,
  Section,
  Stempel,
  Toolbar,
  useTheme,
  ViewToggle,
} from '../design-system'
import { fonts, fontSize, lineHeight, measure, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSeo } from '../hooks/useSeo'
import {
  datumKurz,
  datumLang,
  einheitWort,
  fuelle,
  heuteInBerlin,
  preis,
  preisWert,
  tagVerschieben,
  zahl,
  type Einheit,
} from '../components/europa/format'
import { EuropaKarte } from '../components/europa/EuropaKarte'
import { Kachelkarte, PreisLegende } from '../components/europa/Kachelkarte'
import { LAENDER, landNameIso2 } from '../components/europa/laender'
import { useKarte } from '../components/europa/useKarte'
import { QuellenZeile, StandStempel } from '../components/europa/QuellenZeile'
import { guenstigstesFenster, nachPreis, negativeStunden, preisFarbe, skalaAus, teuersteStunde } from '../components/europa/strom'
import { Tagesgang } from '../components/europa/Tagesgang'
import { Verlauf } from '../components/europa/Verlauf'
import type { StromKennzahlen, StromTag, StromVerlauf } from '../components/europa/typen'

/**
 * Strombericht: Day-Ahead-Preise der europaeischen Gebotszonen fuer einen
 * Liefertag. Daten: /api/strom/* (respublica-api, Migration 024), Quelle
 * Energy-Charts. Gerechnet wird in EUR/MWh, gezeigt standardmaessig in
 * ct/kWh, weil das die Einheit der Stromrechnung ist.
 *
 * Jede Zahl steht mit Einheit da, auch auf Karte und Diagramm.
 */

const HEIMAT = 'DE-LU'
const TAKT_MS = 700

export default function EuropaStrom() {
  const { c, t, lang } = useTheme()
  const schmal = useIsMobile()
  const [params, setParams] = useSearchParams()
  useSeo({ titel: t('stTitel'), beschreibung: t('stSeoBeschreibung'), pfad: '/europa/strom' })

  const [einheit, setEinheit] = useLocalStorage<Einheit>('rp-strom-einheit', 'ct')
  const [zone, setZone] = useLocalStorage<string>('rp-strom-zone', HEIMAT)
  const [stunde, setStunde] = useState<number | null>(null)
  const [ansicht, setAnsicht] = useLocalStorage<'karte' | 'kacheln'>('rp-strom-ansicht', 'karte')
  const karte = useKarte()
  const [laeuft, setLaeuft] = useState(false)

  const heute = heuteInBerlin()
  const gewuenscht = /^\d{4}-\d{2}-\d{2}$/.test(params.get('datum') ?? '') ? (params.get('datum') as string) : ''
  // Ohne Wunsch: heute. Liegt fuer heute noch nichts vor, der juengste Tag.
  const [juengster, setJuengster] = useState(false)
  const tagUrl = `/api/strom/tag?lang=${lang}${gewuenscht ? `&datum=${gewuenscht}` : juengster ? '' : `&datum=${heute}`}`
  const { data: tag, loading, error, refetch } = useApi<StromTag>(tagUrl)
  const { data: kenn } = useApi<StromKennzahlen>('/api/strom/kennzahlen')

  const zonen = useMemo(() => tag?.zonen ?? [], [tag])
  const leer = zonen.length > 0 && zonen.every((z) => z.mittel == null)
  useEffect(() => {
    if (leer && !gewuenscht && !juengster) setJuengster(true)
  }, [leer, gewuenscht, juengster])

  const gewaehlt = zonen.find((z) => z.code === zone) ?? zonen.find((z) => z.code === HEIMAT) ?? zonen[0]
  const { data: verlauf } = useApi<StromVerlauf>(gewaehlt ? `/api/strom/zone/${gewaehlt.code}?tage=30&lang=${lang}` : '')

  // Tag abspielen: eine Stunde je Takt, am Ende stehen bleiben
  useEffect(() => {
    if (!laeuft) return
    const id = window.setInterval(() => {
      setStunde((h) => {
        if (h == null) return 0
        if (h >= 23) {
          setLaeuft(false)
          return h
        }
        return h + 1
      })
    }, TAKT_MS)
    return () => window.clearInterval(id)
  }, [laeuft])

  const skalaMittel = useMemo(() => skalaAus(zonen.map((z) => z.mittel)), [zonen])
  const skalaStunden = useMemo(() => skalaAus(zonen.flatMap((z) => z.stunden)), [zonen])
  // Landkarte: ein Wert je Land, das Mittel seiner Zonen mit Preisen (Tag oder gewaehlte Stunde)
  const preisJeLand = useMemo(() => {
    const m = new Map<string, number>()
    for (const land of LAENDER) {
      const werte = land.zonen
        .map((code) => zonen.find((x) => x.code === code))
        .map((z) => (z == null ? null : stunde == null ? z.mittel : (z.stunden[stunde] ?? null)))
        .filter((v): v is number => v != null)
      if (werte.length) m.set(land.iso2, werte.reduce((a, b) => a + b, 0) / werte.length)
    }
    return m
  }, [zonen, stunde])

  const p = (v: number) => preis(v, einheit, lang)
  const absatz = {
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    lineHeight: lineHeight.relaxed,
    color: c.inkSoft,
    maxWidth: '68ch',
    margin: 0,
  } as const

  const datum = tag?.datum ?? ''
  const tagWort = (iso: string) =>
    iso === heute
      ? t('stTagHeute')
      : iso === tagVerschieben(heute, 1)
        ? t('stTagMorgen')
        : iso === tagVerschieben(heute, -1)
          ? t('stTagGestern')
          : fuelle(t('stTagAm'), { datum: datumKurz(iso, lang) })
  const chipWort = (iso: string) =>
    iso === heute
      ? t('stHeute')
      : iso === tagVerschieben(heute, 1)
        ? t('stMorgen')
        : iso === tagVerschieben(heute, -1)
          ? t('stGestern')
          : datumKurz(iso, lang)

  // Auswahl: die drei juengsten Liefertage, dazu der gezeigte, falls aelter
  const bis = tag?.verfuegbar.bis ?? ''
  const tage = useMemo(() => {
    if (!bis) return []
    const liste = [tagVerschieben(bis, -2), tagVerschieben(bis, -1), bis]
    return datum && !liste.includes(datum) && datum < bis ? [datum, ...liste] : liste
  }, [bis, datum])

  const setzeDatum = (iso: string) => {
    setLaeuft(false)
    setParams(iso === heute ? {} : { datum: iso }, { replace: true })
  }

  const sortiert = useMemo(() => nachPreis(zonen), [zonen])
  const billigste = sortiert[0]
  const teuerste = sortiert[sortiert.length - 1]
  const fenster = gewaehlt ? guenstigstesFenster(gewaehlt.stunden) : null
  const spitze = gewaehlt ? teuersteStunde(gewaehlt.stunden) : null
  const negativ = gewaehlt ? negativeStunden(gewaehlt.stunden) : 0
  const diff = gewaehlt?.mittel != null && gewaehlt.vortag_mittel != null ? gewaehlt.mittel - gewaehlt.vortag_mittel : null

  const k = kenn?.kennzahlen
  const negJahr = k && gewaehlt ? k.negativ[gewaehlt.code] : undefined

  const kennzahl = (wert: string, wort: string, text: string) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: fontSize.hero, lineHeight: 1.05, color: c.ink }}>
        {wert}
      </div>
      <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: fontSize.md, color: c.ink, marginTop: spacing.xs }}>
        {wort}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted, lineHeight: lineHeight.normal }}>{text}</div>
    </div>
  )

  const zelle = { fontFamily: fonts.mono, fontSize: fontSize.sm, fontVariantNumeric: 'tabular-nums', textAlign: 'right' } as const
  const spalten = schmal ? 'minmax(0, 1fr) 4.5rem 4.5rem' : 'minmax(0, 1fr) 5.5rem 6rem 5rem 5rem'

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <PageHeader
        kicker={t('stKicker')}
        title={t('stTitel')}
        subtitle={t('stSubtitle')}
        meta={
          tag && !leer ? (
            <>
              {fuelle(t('stMeta'), { datum: datumLang(tag.datum, lang) })}
              {' · '}
              <StandStempel stand={tag.stand} />
            </>
          ) : undefined
        }
      />

      <Toolbar label={t('stTag')}>
        {tage.map((iso) => (
          <Chip key={iso} dense label={chipWort(iso)} active={iso === datum} onClick={() => setzeDatum(iso)} />
        ))}
      </Toolbar>
      <Toolbar label={t('stEinheit')} tight>
        <ViewToggle<Einheit>
          ariaLabel={t('stEinheit')}
          value={einheit}
          onChange={setEinheit}
          options={[
            { value: 'ct', label: t('stEinheitCt') },
            { value: 'eur', label: t('stEinheitEur') },
          ]}
        />
      </Toolbar>

      {error && !tag && <EmptyState text={t('europaFehler')} action={{ label: t('europaNochmal'), onClick: refetch }} />}
      {loading && !tag && <Platzhalter zeilen={3} />}
      {tag && leer && (gewuenscht || juengster) && <EmptyState text={t('stKeinTag')} />}

      {tag && !leer && gewaehlt && gewaehlt.mittel != null && (
        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }}>
          <Section
            title={t('stBerichtTitel')}
            aside={negativ > 0 ? <Stempel wort={t('stStempelNegativ')} art="ja" groesse={11} /> : undefined}
            note={t('stHinweisPreis')}
          >
            <p
              style={{
                ...absatz,
                fontSize: schmal ? fontSize.lg : fontSize.xl,
                lineHeight: lineHeight.normal,
                color: c.ink,
                maxWidth: '40ch',
              }}
            >
              {fuelle(t('stSatzPreis'), { land: gewaehlt.name, tag: tagWort(datum), preis: p(gewaehlt.mittel) })}{' '}
              {diff != null &&
                (Math.abs(diff) < 0.5
                  ? t('stSatzGleich')
                  : fuelle(t(diff > 0 ? 'stSatzMehr' : 'stSatzWeniger'), { diff: p(Math.abs(diff)) }))}
            </p>
            <div style={{ display: 'grid', gap: spacing.sm, marginTop: spacing.lg }}>
              {fenster && (
                <p style={absatz}>
                  {fuelle(t('stSatzFenster'), { von: fenster.von, bis: fenster.bis, preis: p(fenster.mittel) })}{' '}
                  {spitze && fuelle(t('stSatzSpitze'), { stunde: spitze.stunde, preis: p(spitze.wert) })}
                </p>
              )}
              {negativ > 0 && <p style={absatz}>{fuelle(t('stSatzNegativ'), { n: negativ })}</p>}
              {billigste && teuerste && billigste.code !== teuerste.code && (
                <p style={absatz}>
                  {fuelle(t('stSatzEuropa'), {
                    billig: billigste.name,
                    billigPreis: p(billigste.mittel as number),
                    teuer: teuerste.name,
                    teuerPreis: p(teuerste.mittel as number),
                  })}
                </p>
              )}
            </div>
          </Section>

          <div style={schmal ? undefined : { display: 'grid', gridTemplateColumns: 'minmax(0, 520px) minmax(0, 1fr)', columnGap: spacing.xxxl, alignItems: 'start' }}>
          <Section
            title={t('stKarteTitel')}
            aside={
              stunde == null ? t('stKarteMittel') : fuelle(t('stKarteUhr'), { von: stunde, bis: stunde + 1 })
            }
            note={t(ansicht === 'karte' ? 'stKarteNoteKarte' : 'stKarteNote')}
          >
            <Toolbar tight>
              <ViewToggle<'karte' | 'kacheln'>
                ariaLabel={t('stAnsicht')}
                value={ansicht}
                onChange={setAnsicht}
                options={[
                  { value: 'karte', label: t('stAnsichtKarte') },
                  { value: 'kacheln', label: t('stAnsichtKacheln') },
                ]}
              />
            </Toolbar>
            <Toolbar tight>
              <ViewToggle<'mittel' | 'stunde'>
                ariaLabel={t('stKarteTitel')}
                value={stunde == null ? 'mittel' : 'stunde'}
                onChange={(v) => {
                  setLaeuft(false)
                  setStunde(v === 'mittel' ? null : (fenster?.von ?? 12))
                }}
                options={[
                  { value: 'mittel', label: t('stKarteMittel') },
                  { value: 'stunde', label: t('stKarteStunde') },
                ]}
              />
              <Chip
                dense
                label={t(laeuft ? 'stKarteAnhalten' : 'stKarteAbspielen')}
                active={laeuft}
                onClick={() => {
                  if (!laeuft && (stunde == null || stunde >= 23)) setStunde(0)
                  setLaeuft((v) => !v)
                }}
              />
            </Toolbar>
            {stunde != null && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  maxWidth: 520,
                  minHeight: 44,
                  fontFamily: fonts.mono,
                  fontSize: fontSize.sm,
                  color: c.ink,
                }}
              >
                <span style={{ whiteSpace: 'nowrap', minWidth: '9.5em', fontWeight: 700 }}>
                  {fuelle(t('stKarteUhr'), { von: stunde, bis: stunde + 1 })}
                </span>
                <input
                  type="range"
                  min={0}
                  max={23}
                  step={1}
                  value={stunde}
                  aria-label={t('stKarteRegler')}
                  onChange={(e) => {
                    setLaeuft(false)
                    setStunde(Number(e.target.value))
                  }}
                  style={{ flex: 1, minWidth: 0, height: 44, accentColor: c.red }}
                />
              </label>
            )}
            <div style={{ marginTop: spacing.md }}>
              {ansicht === 'karte' && karte ? (
                <>
                  <EuropaKarte
                    karte={karte}
                    schmal={schmal}
                    ariaLabel={t('stLandkarteAria')}
                    kopf={
                      <>
                        <strong>{stunde == null ? t('stKarteMittel') : fuelle(t('stKarteUhr'), { von: stunde, bis: stunde + 1 })}</strong>
                        <br />
                        {einheitWort(einheit)}
                      </>
                    }
                    farbe={(iso2) => {
                      const v = preisJeLand.get(iso2)
                      return v == null ? null : preisFarbe(v, stunde == null ? skalaMittel : skalaStunden, c)
                    }}
                    beschriftung={(iso2) => {
                      const v = preisJeLand.get(iso2)
                      return v == null ? null : preisWert(v, einheit, lang)
                    }}
                    ariaText={(iso2) => {
                      const v = preisJeLand.get(iso2)
                      return `${landNameIso2(iso2, lang)}${v == null ? '' : `: ${p(v)}`}`
                    }}
                    gewaehlt={LAENDER.find((l) => l.zonen.includes(gewaehlt.code))?.iso2}
                    onWahl={(iso2) => {
                      const land = LAENDER.find((l) => l.iso2 === iso2)
                      const code = land?.zonen.find((z) => zonen.some((x) => x.code === z))
                      if (code) setZone(code)
                    }}
                  />
                  <PreisLegende skala={stunde == null ? skalaMittel : skalaStunden} einheit={einheit} />
                </>
              ) : ansicht === 'karte' ? (
                <Platzhalter zeilen={3} />
              ) : (
                <Kachelkarte
                  zonen={zonen}
                  wert={(z) => (stunde == null ? z.mittel : z.stunden[stunde] ?? null)}
                  skala={stunde == null ? skalaMittel : skalaStunden}
                  einheit={einheit}
                  gewaehlt={gewaehlt.code}
                  onWahl={setZone}
                />
              )}
            </div>
          </Section>

          <Section
            title={fuelle(t('stGangTitel'), { land: gewaehlt.name })}
            note={fuelle(t('stGangNote'), { einheit: einheitWort(einheit) })}
          >
            <Tagesgang
              stunden={gewaehlt.stunden}
              skala={skalaStunden}
              einheit={einheit}
              stunde={stunde}
              ariaLabel={fuelle(t('stGangAria'), { land: gewaehlt.name })}
            />
          </Section>
          </div>

          <Section
            title={t('stZettelTitel')}
            aside={fuelle(t('stZettelAside'), { einheit: einheitWort(einheit) })}
            note={t('stZettelNote')}
          >
            <div role="table" style={{ maxWidth: measure.liste }}>
              <div
                role="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: spalten,
                  gap: spacing.sm,
                  padding: `${spacing.sm}px 0`,
                  fontFamily: fonts.mono,
                  fontSize: fontSize.micro,
                  color: c.muted,
                  borderBottom: `1px solid ${c.ink}`,
                }}
              >
                <span role="columnheader">{t('stZettelZone')}</span>
                <span role="columnheader" style={{ textAlign: 'right' }}>
                  {t('stZettelMittel')}
                </span>
                <span role="columnheader" style={{ textAlign: 'right' }}>
                  {t('stZettelVortag')}
                </span>
                {!schmal && (
                  <>
                    <span role="columnheader" style={{ textAlign: 'right' }}>
                      {t('stZettelMin')}
                    </span>
                    <span role="columnheader" style={{ textAlign: 'right' }}>
                      {t('stZettelMax')}
                    </span>
                  </>
                )}
              </div>
              {sortiert.map((z) => {
                const d = z.mittel != null && z.vortag_mittel != null ? z.mittel - z.vortag_mittel : null
                const aktiv = z.code === gewaehlt.code
                return (
                  <button
                    key={z.code}
                    type="button"
                    role="row"
                    aria-pressed={aktiv}
                    onClick={() => setZone(z.code)}
                    className="rp-zeile"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: spalten,
                      gap: spacing.sm,
                      alignItems: 'center',
                      width: '100%',
                      minHeight: 44,
                      padding: `${spacing.xs}px 0`,
                      background: 'none',
                      border: 'none',
                      borderBottom: `1px solid ${c.border}`,
                      color: c.ink,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      role="cell"
                      style={{
                        fontFamily: fonts.body,
                        fontSize: fontSize.md,
                        fontWeight: aktiv ? 700 : 400,
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{ width: 6, height: 6, borderRadius: 999, background: aktiv ? c.red : 'transparent', flexShrink: 0 }}
                      />
                      {z.name}
                    </span>
                    <span role="cell" style={{ ...zelle, fontWeight: 700 }}>
                      {preisWert(z.mittel as number, einheit, lang)}
                    </span>
                    <span role="cell" style={{ ...zelle, color: d == null || Math.abs(d) < 0.5 ? c.muted : c.ink }}>
                      {d == null ? '·' : `${d > 0 ? '▲' : d < 0 ? '▼' : ''} ${preisWert(Math.abs(d), einheit, lang)}`}
                    </span>
                    {!schmal && (
                      <>
                        <span role="cell" style={{ ...zelle, color: c.inkSoft }}>
                          {z.min != null ? preisWert(z.min, einheit, lang) : '·'}
                        </span>
                        <span role="cell" style={{ ...zelle, color: c.inkSoft }}>
                          {z.max != null ? preisWert(z.max, einheit, lang) : '·'}
                        </span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </Section>

          {verlauf && verlauf.tage.length > 1 && (
            <Section
              title={fuelle(t('stVerlaufTitel'), { land: gewaehlt.name })}
              note={fuelle(t('stVerlaufNote'), { einheit: einheitWort(einheit) })}
            >
              <Verlauf
                tage={verlauf.tage}
                einheit={einheit}
                ariaLabel={fuelle(t('stVerlaufAria'), { land: gewaehlt.name })}
              />
            </Section>
          )}

          {k && (
            <Section
              title={fuelle(t('stJahrTitel'), { jahr: k.jahr })}
              note={
                k.einheitspreis
                  ? fuelle(t('stJahrNote'), {
                      s: zahl(k.einheitspreis.schwelle_eur_mwh, lang),
                      von: datumKurz(k.von, lang),
                      bis: datumKurz(k.bis, lang),
                    })
                  : undefined
              }
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: schmal ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                  gap: spacing.xl,
                  maxWidth: 900,
                }}
              >
                {negJahr &&
                  kennzahl(
                    zahl(negJahr.stunden, lang),
                    t('stJahrNegativ'),
                    fuelle(t('stJahrNegativText'), { land: gewaehlt.name, tage: zahl(negJahr.tage, lang) }),
                  )}
                {k.einheitspreis && kennzahl(`${zahl(k.einheitspreis.anteil, lang, 1)} %`, t('stJahrGleich'), t('stJahrGleichText'))}
                {k.einheitspreis &&
                  kennzahl(p(k.einheitspreis.mittlere_spanne_eur_mwh), t('stJahrSpanne'), t('stJahrSpanneText'))}
              </div>
            </Section>
          )}
        </div>
      )}

      <Section title={t('stMethodikTitel')} last>
        <div style={{ display: 'grid', gap: spacing.md }}>
          <p style={absatz}>{t('stMethodik1')}</p>
          <p style={absatz}>{t('stMethodik2')}</p>
          <p style={absatz}>{t('stMethodik3')}</p>
          <QuellenZeile quelle={tag?.quelle} stand={tag?.stand} />
        </div>
      </Section>
    </div>
  )
}
