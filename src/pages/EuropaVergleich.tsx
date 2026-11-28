import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Chip, EmptyState, FilterToolbar, PageHeader, Platzhalter, Section, Toolbar, useTheme } from '../design-system'
import { SERIES } from '../design-system/palettes'
import { fonts, fontSize, lineHeight, measure, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useSeo } from '../hooks/useSeo'
import { datumKurz, fuelle, preis, type Einheit } from '../components/europa/format'
import { kennzahlText, laenderSortiert, landPfad, landVon } from '../components/europa/laender'
import { QuellenZeile } from '../components/europa/QuellenZeile'
import type { Steckbrief, StromVergleich } from '../components/europa/typen'
import { Zeitreihe, type ZeitreihenReihe } from '../components/europa/Zeitreihe'

/**
 * Laendervergleich: bis zu vier Laender, eine Reihe, eine Zeitachse. Die
 * Reihe ist entweder der Strompreis (taeglich) oder eine Kennzahl aus dem
 * Steckbrief (jaehrlich). Auswahl steht in der Adresse und laesst sich teilen.
 */

const MAX = 4
const ZEITRAEUME = [30, 90, 365] as const
type Jahreswert = { year: number; value: number | null }

export default function EuropaVergleich() {
  const { c, t, lang } = useTheme()
  const [params, setParams] = useSearchParams()
  useSeo({ titel: t('evTitel'), beschreibung: t('evSeoBeschreibung'), pfad: '/europa/vergleich' })
  const [einheit] = useLocalStorage<Einheit>('rp-strom-einheit', 'ct')

  const gewaehlt = useMemo(() => {
    const codes = (params.get('laender') ?? 'de,fr,pl').split(',').map((x) => x.trim().toUpperCase())
    return [...new Set(codes)].map((x) => landVon(x)).filter((x) => x != null).slice(0, MAX)
  }, [params])
  const reihe = params.get('reihe') || 'strom'
  const tage = ZEITRAEUME.find((n) => String(n) === params.get('tage')) ?? 90
  const alle = useMemo(() => laenderSortiert(lang), [lang])
  const nameVon = (iso2: string) => alle.find((l) => l.iso2 === iso2)?.name ?? iso2

  const setze = (neu: Record<string, string>) =>
    setParams(
      (alt) => {
        const p = new URLSearchParams(alt)
        for (const [k, v] of Object.entries(neu)) {
          if (v) p.set(k, v)
          else p.delete(k)
        }
        return p
      },
      { replace: true },
    )
  const setzeLaender = (liste: string[]) => setze({ laender: liste.map((x) => x.toLowerCase()).join(',') })

  // Welche Kennzahlen es gibt (Name, Einheit), steht im Steckbrief des ersten Landes
  const { data: steckbrief } = useApi<Steckbrief>(gewaehlt[0] ? `/api/world/steckbrief/${gewaehlt[0].iso3}?lang=${lang}` : '')
  const kennzahl = steckbrief?.kennzahlen.find((k) => k.code === reihe)
  const istStrom = reihe === 'strom'

  // Strom: eine Zone je Land, die erste mit freien Daten
  const mitZone = gewaehlt.filter((l) => l.zonen.length > 0)
  const ohneZone = gewaehlt.filter((l) => l.zonen.length === 0)
  const zonen = [...new Set(mitZone.map((l) => l.zonen[0]))]
  const { data: strom, loading: ladeStrom, error: fehlerStrom, refetch } = useApi<StromVergleich>(
    istStrom && zonen.length ? `/api/strom/verlauf?zonen=${zonen.join(',')}&tage=${tage}&lang=${lang}` : '',
  )

  // Kennzahl: ein Abruf je Land, vier feste Plaetze (Hooks duerfen nicht in Schleifen)
  const url = (i: number) =>
    !istStrom && gewaehlt[i] ? `/api/world/timeseries?country=${gewaehlt[i].iso3}&indicator=${encodeURIComponent(reihe)}` : ''
  const r0 = useApi<Jahreswert[]>(url(0))
  const r1 = useApi<Jahreswert[]>(url(1))
  const r2 = useApi<Jahreswert[]>(url(2))
  const r3 = useApi<Jahreswert[]>(url(3))

  const { achse, reihen } = useMemo((): { achse: string[]; reihen: ZeitreihenReihe[] } => {
    if (istStrom) {
      if (!strom) return { achse: [], reihen: [] }
      return {
        achse: strom.tage.map((d) => datumKurz(d, lang)),
        reihen: mitZone
          .map((l, i) => {
            const z = strom.zonen.find((x) => x.code === l.zonen[0])
            return z ? { name: z.name, farbe: SERIES[i % SERIES.length], werte: z.werte } : null
          })
          .filter((x) => x != null),
      }
    }
    const daten = [r0.data, r1.data, r2.data, r3.data]
    const jahre = [...new Set(daten.flatMap((d) => (d ?? []).filter((p) => p.year >= 2000 && p.value != null).map((p) => p.year)))].sort()
    return {
      achse: jahre.map(String),
      reihen: gewaehlt
        .map((l, i) => {
          const d = daten[i]
          if (!d) return null
          const nach = new Map(d.map((p) => [p.year, p.value]))
          return { name: nameVon(l.iso2), farbe: SERIES[i % SERIES.length], werte: jahre.map((j) => nach.get(j) ?? null) }
        })
        .filter((x) => x != null),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [istStrom, strom, r0.data, r1.data, r2.data, r3.data, gewaehlt, lang])

  const format = (v: number) => (istStrom ? preis(v, einheit, lang) : kennzahl ? kennzahlText(kennzahl, v, lang) : String(v))
  const laedt = istStrom ? ladeStrom : [r0, r1, r2, r3].some((r) => r.loading)
  const titelReihe = istStrom ? t('evReiheStrom') : (kennzahl?.name ?? reihe)
  const absatz = { margin: 0, fontFamily: fonts.body, fontSize: fontSize.sm, lineHeight: lineHeight.normal, color: c.muted, maxWidth: '68ch' } as const
  const frei = alle.filter((l) => !gewaehlt.some((g) => g.iso2 === l.iso2))

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <Link
        to="/europa"
        style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, fontFamily: fonts.mono, fontSize: fontSize.xs, color: c.muted, textDecoration: 'none' }}
      >
        ← {t('elZurueck')}
      </Link>
      <PageHeader kicker={t('europaKicker')} title={t('evTitel')} subtitle={t('evSubtitle')} />

      <FilterToolbar
        search={false}
        filters={[
          {
            label: t('evReihe'),
            value: reihe,
            onChange: (v) => setze({ reihe: v === 'strom' ? '' : v }),
            options: [
              { value: 'strom', label: t('evReiheStrom') },
              ...(steckbrief?.kennzahlen ?? []).map((k) => ({ value: k.code, label: fuelle(t('evReiheJahr'), { name: k.name }) })),
            ],
          },
          {
            label: fuelle(t('evLandDazu'), { n: gewaehlt.length, max: MAX }),
            value: '',
            onChange: (v) => v && gewaehlt.length < MAX && setzeLaender([...gewaehlt.map((g) => g.iso2), v]),
            options: [{ value: '', label: gewaehlt.length >= MAX ? t('evVoll') : t('evLandWaehlen') }, ...(gewaehlt.length >= MAX ? [] : frei.map((l) => ({ value: l.iso2, label: l.name })))],
          },
        ]}
      />
      <Toolbar label={t('evLaender')}>
        {gewaehlt.map((l, i) => (
          <Chip
            key={l.iso2}
            dense
            dot={SERIES[i % SERIES.length]}
            label={`${nameVon(l.iso2)} ×`}
            title={t('evEntfernen')}
            active
            disabled={gewaehlt.length <= 1}
            onClick={() => setzeLaender(gewaehlt.filter((g) => g.iso2 !== l.iso2).map((g) => g.iso2))}
          />
        ))}
      </Toolbar>
      {istStrom && (
        <Toolbar label={t('evZeitraum')} tight>
          {ZEITRAEUME.map((n) => (
            <Chip key={n} dense label={t(n === 365 ? 'evJahr' : n === 90 ? 'ev90' : 'ev30')} active={tage === n} onClick={() => setze({ tage: n === 90 ? '' : String(n) })} />
          ))}
        </Toolbar>
      )}

      <Section title={titelReihe} aside={istStrom ? t('evAsideStrom') : t('elJaehrlich')} note={istStrom ? t('stHinweisPreis') : t('elSteckbriefNote')}>
        {istStrom && fehlerStrom && !strom && <EmptyState text={t('europaFehler')} action={{ label: t('europaNochmal'), onClick: refetch }} />}
        {laedt && reihen.length === 0 && <Platzhalter zeilen={2} />}
        {!laedt && reihen.length === 0 && !(istStrom && fehlerStrom) && <EmptyState text={t('evLeer')} />}
        {reihen.length > 0 && (
          <div style={{ opacity: laedt ? 0.6 : 1, transition: 'opacity 0.15s' }}>
            <Zeitreihe achse={achse} reihen={reihen} format={format} abNull={istStrom} hoehe={260} ariaLabel={titelReihe} />
          </div>
        )}
        {istStrom && ohneZone.length > 0 && (
          <p style={{ ...absatz, marginTop: spacing.md }}>
            {fuelle(t('evOhneStrom'), { laender: ohneZone.map((l) => nameVon(l.iso2)).join(', ') })}
          </p>
        )}
      </Section>

      {reihen.length > 0 && (
        <Section title={t('evTabelleTitel')} aside={achse[achse.length - 1]}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: measure.liste }}>
            {(istStrom ? mitZone : gewaehlt).map((l, i) => {
              const r = reihen[i]
              const letzter = r ? [...r.werte].reverse().find((v) => v != null) : null
              return (
                <li key={l.iso2} style={{ borderTop: `1px solid ${c.border}` }}>
                  <Link
                    to={landPfad(l.iso2)}
                    className="rp-zeile"
                    style={{ display: 'flex', alignItems: 'center', gap: spacing.md, minHeight: 44, textDecoration: 'none', color: c.ink }}
                  >
                    <span aria-hidden style={{ width: 14, height: 3, background: r?.farbe ?? c.border }} />
                    <span style={{ flex: 1, fontFamily: fonts.body, fontSize: fontSize.md, fontWeight: 600 }}>{r?.name ?? nameVon(l.iso2)}</span>
                    <span style={{ fontFamily: fonts.mono, fontSize: fontSize.sm, fontWeight: 700 }}>{letzter != null ? format(letzter) : '·'}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      <Section last>
        {istStrom ? (
          <QuellenZeile quelle={strom?.quelle} stand={strom?.stand} />
        ) : (
          kennzahl?.quelle.name && (
            <p style={{ ...absatz, fontFamily: fonts.mono, fontSize: fontSize.xs }}>
              {t('quelleWort')}:{' '}
              {kennzahl.quelle.url ? (
                <a href={kennzahl.quelle.url} target="_blank" rel="noopener noreferrer" style={{ color: c.ink }}>
                  {kennzahl.quelle.name}
                </a>
              ) : (
                kennzahl.quelle.name
              )}
              {kennzahl.quelle.lizenz ? ` · ${t('quelleLizenz')}: ${kennzahl.quelle.lizenz}` : ''}
              {' · '}
              <Link to="/quellen" style={{ color: c.ink }}>
                {t('quelleAlleQuellen')}
              </Link>
            </p>
          )
        )}
      </Section>
    </div>
  )
}
