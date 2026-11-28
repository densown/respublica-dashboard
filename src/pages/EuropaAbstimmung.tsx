import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Chip,
  EmptyState,
  Erklaerung,
  Fundstelle,
  PageHeader,
  Platzhalter,
  Section,
  Stempel,
  Toolbar,
  useTheme,
  VoteBar,
} from '../design-system'
import { fonts, fontSize, lineHeight, measure, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSeo } from '../hooks/useSeo'
import { StimmMarke } from '../components/bundestag/StimmMarke'
import { artErklaerung, artWort } from '../components/europa/epArt'
import { EpKarte } from '../components/europa/EpKarte'
import { datumLang, fuelle, landName, STIMME } from '../components/europa/format'
import { QuellenZeile } from '../components/europa/QuellenZeile'
import type { EpDetail, Position, Stimmen } from '../components/europa/typen'

/**
 * Eine Abstimmung des EU-Parlaments, Schritt fuer Schritt wie die Seite einer
 * Bundestagsabstimmung: Ergebnis, Fraktionen, deutsche Abgeordnete, Laender.
 */

const POSITIONEN: Position[] = ['ja', 'nein', 'enthaltung', 'nicht']
const LAENDER_KURZ = 8

export default function EuropaAbstimmung() {
  const { id } = useParams()
  const { c, t, lang } = useTheme()
  const schmal = useIsMobile()
  const gueltig = /^\d+$/.test(id ?? '')
  const { data, loading, error, refetch } = useApi<EpDetail>(gueltig ? `/api/ep/abstimmungen/${id}?lang=${lang}` : '')
  const [auswahl, setAuswahl] = useState<Position | 'alle'>('alle')
  const [alleLaender, setAlleLaender] = useState(false)

  useSeo({
    titel: data ? data.titel : t('epTitel'),
    beschreibung: data
      ? `${t(artWort(data.art))}, ${datumLang(data.datum, lang)}: ${fuelle(t('epStimmenKurz'), {
          ja: data.stimmen.ja,
          nein: data.stimmen.nein,
          enth: data.stimmen.enthaltung,
        })}.`
      : undefined,
    nichtIndexieren: !gueltig || Boolean(error),
  })

  const kurz = (s: Stimmen) => fuelle(t('epStimmenKurz'), { ja: s.ja, nein: s.nein, enth: s.enthaltung })
  const wort: Record<Position, string> = { ja: t('yes'), nein: t('no'), enthaltung: t('abstain'), nicht: t('absentL') }

  const groessteFraktion = useMemo(
    () => Math.max(1, ...(data?.fraktionen ?? []).map((f) => f.ja + f.nein + f.enthaltung + f.nicht)),
    [data],
  )
  const laender = useMemo(() => {
    const alle = [...(data?.laender ?? [])].sort(
      (a, b) => b.ja + b.nein + b.enthaltung + b.nicht - (a.ja + a.nein + a.enthaltung + a.nicht),
    )
    return alleLaender ? alle : alle.slice(0, LAENDER_KURZ)
  }, [data, alleLaender])
  const deutsche = useMemo(
    () => (data?.deutsche ?? []).filter((m) => auswahl === 'alle' || m.position === auswahl),
    [data, auswahl],
  )

  const zurueck = (
    <Link
      to="/europa/parlament"
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
      ← {t('epZurueck')}
    </Link>
  )

  if (!gueltig || (error && !data)) {
    return (
      <div>
        {zurueck}
        <PageHeader title={t('epTitel')} />
        <EmptyState
          text={gueltig ? t('europaFehler') : t('epNichtGefunden')}
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

  const zeile = {
    display: 'grid',
    gridTemplateColumns: schmal ? '1fr' : '11rem 1fr',
    gap: schmal ? spacing.xs : spacing.lg,
    alignItems: 'center',
    padding: `${spacing.sm}px 0`,
  } as const
  const name = { fontFamily: fonts.body, fontSize: fontSize.md, color: c.ink, fontWeight: 600 } as const
  const klein = { fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted } as const

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      {zurueck}
      <PageHeader
        kicker={`${t(artWort(data.art))}, ${datumLang(data.datum, lang)}`}
        title={data.titel}
        meta={
          <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' }}>
            {data.verfahren && <Fundstelle title={t('epVerfahren')}>{data.verfahren}</Fundstelle>}
            {data.referenz && <Fundstelle>{data.referenz}</Fundstelle>}
            {data.lesung != null && <span>{fuelle(t('epLesung'), { n: data.lesung })}</span>}
          </span>
        }
      />

      <div style={{ display: 'grid', gap: spacing.md, maxWidth: '68ch', marginBottom: spacing.xl }}>
        {data.titel_uebersetzt && (
          <p style={{ margin: 0, fontFamily: fonts.body, fontSize: fontSize.sm, fontStyle: 'italic', color: c.muted }}>
            {fuelle(t('epUebersetzt'), { titel: data.titel_original })}
          </p>
        )}
        <p style={{ margin: 0, fontFamily: fonts.body, fontSize: fontSize.base, lineHeight: lineHeight.relaxed, color: c.inkSoft }}>
          <Erklaerung text={t(artErklaerung(data.art))}>{t(artWort(data.art))}</Erklaerung>
          {data.art === 'ablehnungsantrag' ? `: ${t('epErkl_ablehnungsantrag')}` : ''}
        </p>
      </div>

      <Section
        number={1}
        title={t('epErgebnisTitel')}
        aside={
          data.ergebnis ? (
            <Stempel
              wort={t(data.ergebnis === 'angenommen' ? 'accepted' : 'rejected')}
              art={data.ergebnis === 'angenommen' ? 'ja' : 'nein'}
              groesse={13}
            />
          ) : undefined
        }
      >
        <div style={{ maxWidth: measure.liste }}>
          <VoteBar
            ja={data.stimmen.ja}
            nein={data.stimmen.nein}
            enthalten={data.stimmen.enthaltung}
            abwesend={data.stimmen.nicht}
            height={40}
            beschriftung="wort"
            ariaLabel={kurz(data.stimmen)}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.md }}>
            {POSITIONEN.map((p) => (
              <span key={p} style={{ display: 'inline-flex', gap: spacing.sm, alignItems: 'center' }}>
                <StimmMarke stimme={STIMME[p]} />
                <strong style={{ fontFamily: fonts.mono, fontSize: fontSize.sm, color: c.ink }}>{data.stimmen[p]}</strong>
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section number={2} title={t('epFraktionenTitel')} note={t('epFraktionenNote')}>
        <div style={{ maxWidth: measure.liste }}>
          {data.fraktionen.map((f) => (
            <div key={f.code} style={{ ...zeile, borderTop: `1px solid ${c.border}` }}>
              <span style={name} title={f.name}>
                {f.kurz}
              </span>
              <VoteBar
                ja={f.ja}
                nein={f.nein}
                enthalten={f.enthaltung}
                abwesend={f.nicht}
                bezug={groessteFraktion}
                height={24}
                ariaLabel={`${f.kurz}: ${kurz(f)}`}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section number={3} title={t('epDeutscheTitel')} aside={kurz(data.deutschland)}>
        <Toolbar tight>
          <Chip dense label={`${t('epDeutscheAlle')} ${data.deutsche.length}`} active={auswahl === 'alle'} onClick={() => setAuswahl('alle')} />
          {POSITIONEN.map((p) => (
            <Chip
              key={p}
              dense
              label={`${wort[p]} ${data.deutschland[p]}`}
              active={auswahl === p}
              onClick={() => setAuswahl(p)}
            />
          ))}
        </Toolbar>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: schmal ? '1fr' : '1fr 1fr',
            columnGap: spacing.xxl,
            maxWidth: 2 * measure.liste,
          }}
        >
          {deutsche.map((m) => (
            <li key={m.id} style={{ borderTop: `1px solid ${c.border}` }}>
              <Link
                to={`/europa/parlament/abgeordnete/${m.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  minHeight: 44,
                  padding: `${spacing.xs}px 0`,
                  textDecoration: 'none',
                }}
              >
                <StimmMarke stimme={STIMME[m.position]} ohneWort />
                <span style={{ ...name, flex: 1, minWidth: 0 }}>{m.name}</span>
                <span style={klein}>{[m.partei, m.fraktion_kurz].filter(Boolean).join(' · ')}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section number={4} title={t('epLaenderTitel')} note={t('epLaenderNote')}>
        <div style={{ maxWidth: measure.liste }}>
          {laender.map((l) => (
            <div key={l.land} style={{ ...zeile, borderTop: `1px solid ${c.border}` }}>
              <span style={name}>{landName(l.land, lang)}</span>
              <VoteBar
                ja={l.ja}
                nein={l.nein}
                enthalten={l.enthaltung}
                abwesend={l.nicht}
                height={20}
                animiert={false}
                ariaLabel={`${landName(l.land, lang)}: ${kurz(l)}`}
              />
            </div>
          ))}
          {data.laender.length > LAENDER_KURZ && (
            <div style={{ marginTop: spacing.md }}>
              <Chip
                label={t(alleLaender ? 'epLaenderWeniger' : 'epLaenderMehr')}
                active={false}
                onClick={() => setAlleLaender((v) => !v)}
              />
            </div>
          )}
        </div>
      </Section>

      {data.verwandt.length > 0 && (
        <Section number={5} title={t('epVerwandtTitel')}>
          {data.verwandt.map((a) => (
            <EpKarte key={a.id} a={a} />
          ))}
        </Section>
      )}

      <Section last>
        <QuellenZeile quelle={data.quelle} stand={data.stand} original={data.url} />
      </Section>
    </div>
  )
}
