import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Chip,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Section,
  Toolbar,
  useTheme,
} from '../design-system'
import {
  fonts,
  fontSize,
  motion,
  radius,
  spacing,
} from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { ElectionsSubNav } from './elections/ElectionsSubNav'
import {
  ConstituencyMap,
  type ConstituencyGeoJson,
} from './elections/ConstituencyMap'
import {
  TopCandidates,
  type Spitzenkandidatur,
} from './elections/TopCandidates'
import { cleanPartyLabel, partyLabelToSlug } from './elections/partyLabel'
import { partyColorsForTheme } from './elections/partyColors'
import type { WahlterminListResponse } from './elections/pollTypes'

type Kandidatur = {
  aw_id: number
  name: string
  wahlkreis: string | null
  wahlkreis_nr: number | null
  listenplatz: number | null
  profil_url: string | null
  foto_url: string | null
}

type ParteiGruppe = {
  partei: string
  anzahl: number
  kandidaturen: Kandidatur[]
}

type KandidaturenResponse = {
  spitzenkandidaturen: Spitzenkandidatur[]
  wahl: {
    slug: string
    name_de: string
    name_en: string
    land: string | null
    datum: string | null
  }
  gesamt: number
  parteien: ParteiGruppe[]
}

type Ansicht = 'wahlkreis' | 'partei'

/** Token-Farben liegen als Hex vor; fuer Flaechenabstufungen braucht es Alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const v =
    h.length === 3
      ? h.split('').map((x) => parseInt(x + x, 16))
      : [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return `rgba(${v[0]}, ${v[1]}, ${v[2]}, ${alpha})`
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export default function ElectionCandidates() {
  const { c, t, lang, theme } = useTheme()
  const narrow = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()

  const ansicht: Ansicht =
    searchParams.get('ansicht') === 'partei' ? 'partei' : 'wahlkreis'
  const wkParam = searchParams.get('wk')

  const setParam = (key: string, value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key === 'wahl') {
          next.delete('wk')
          next.delete('ansicht')
        }
        return next
      },
      { replace: key !== 'wahl' },
    )
  }

  const { data: liste, loading: listeLoading } =
    useApi<WahlterminListResponse>('/api/wahltermine')

  // Nur kommende Wahlen anbieten — fuer abgeschlossene fuehrt
  // abgeordnetenwatch zwar Daten, aber Kandidaturen sind dann Geschichte.
  const wahlen = useMemo(() => {
    const all = liste?.wahltermine ?? []
    return all
      .filter((w) => w.status === 'kommend' && w.datum)
      .sort((a, b) => (a.datum ?? '').localeCompare(b.datum ?? ''))
  }, [liste])

  const wahlSlug = searchParams.get('wahl') || wahlen[0]?.slug || ''

  const endpoint = wahlSlug
    ? `/api/wahltermine/${encodeURIComponent(wahlSlug)}/kandidaturen`
    : ''
  const { data, loading, error } = useApi<KandidaturenResponse>(endpoint)

  const partyColors = useMemo(
    () => partyColorsForTheme(theme === 'dark'),
    [theme],
  )

  // Wahlkreisgeometrie liegt je Wahl unter public/data und wird ueber den Slug
  // gefunden. Fehlt die Datei, faellt die Seite auf die Nummernliste zurueck —
  // fuer die meisten Wahlen gibt es (noch) keine Geodaten.
  const [geo, setGeo] = useState<ConstituencyGeoJson | null>(null)
  useEffect(() => {
    if (!wahlSlug) {
      setGeo(null)
      return
    }
    let abgebrochen = false
    const url = `${import.meta.env.BASE_URL}data/wahlkreise-${wahlSlug}.geojson`
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!abgebrochen) setGeo(j)
      })
      .catch(() => {
        if (!abgebrochen) setGeo(null)
      })
    return () => {
      abgebrochen = true
    }
  }, [wahlSlug])

  const ersteLadung = (loading || listeLoading) && !data
  const laedtNach = loading && Boolean(data)

  const alle = useMemo(
    () =>
      (data?.parteien ?? []).flatMap((g) =>
        g.kandidaturen.map((k) => ({ ...k, partei: g.partei })),
      ),
    [data],
  )

  // Wahlkreise aus den Kandidaturen ableiten statt separat zu laden
  const wahlkreise = useMemo(() => {
    const map = new Map<number, string>()
    for (const k of alle) {
      if (k.wahlkreis_nr != null && !map.has(k.wahlkreis_nr)) {
        map.set(k.wahlkreis_nr, k.wahlkreis ?? String(k.wahlkreis_nr))
      }
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [alle])

  const aktiverWk = wkParam != null ? Number(wkParam) : (wahlkreise[0]?.[0] ?? null)

  const imWahlkreis = useMemo(
    () =>
      alle
        .filter((k) => k.wahlkreis_nr === aktiverWk)
        .sort((a, b) => a.partei.localeCompare(b.partei)),
    [alle, aktiverWk],
  )

  const wahlName = data?.wahl
    ? lang === 'de'
      ? data.wahl.name_de
      : data.wahl.name_en
    : ''

  useEffect(() => {
    if (wahlName) document.title = `${t('electionCandidatesTitle')} — ${wahlName}`
  }, [wahlName, t])

  // --- Einfaerbung der Karte ------------------------------------------------
  // Zwei Modi: Dichte des Bewerberfelds, oder wo eine bestimmte Partei einen
  // Direktkandidaten stellt. Beides kommt aus den Kandidaturen selbst — die
  // Ergebnisse der Wahl 2021 liegen nur auf Kreisebene vor und waeren auf
  // Wahlkreise umgelegt schlicht falsch.
  const farbePartei = searchParams.get('farbe')

  const proWahlkreis = useMemo(() => {
    const m = new Map<number, { anzahl: number; parteien: Set<string> }>()
    for (const k of alle) {
      if (k.wahlkreis_nr == null) continue
      let e = m.get(k.wahlkreis_nr)
      if (!e) m.set(k.wahlkreis_nr, (e = { anzahl: 0, parteien: new Set() }))
      e.anzahl += 1
      e.parteien.add(k.partei)
    }
    return m
  }, [alle])

  const colorByNr = useMemo(() => {
    const raus: Record<number, string> = {}
    if (farbePartei) {
      const farbe =
        partyColors[partyLabelToSlug(farbePartei)] ?? partyColors.other
      for (const [nr, e] of proWahlkreis) {
        if (e.parteien.has(farbePartei)) raus[nr] = farbe
      }
      return raus
    }
    // Dichte: von wenig (blass) nach viel (kraeftig), neutral in c.ink statt
    // in Rot — Rot ist im Designsystem der Akzent und keine Datenfarbe.
    const werte = [...proWahlkreis.values()].map((e) => e.anzahl)
    if (!werte.length) return raus
    const min = Math.min(...werte)
    const max = Math.max(...werte)
    for (const [nr, e] of proWahlkreis) {
      const t = max === min ? 0.5 : (e.anzahl - min) / (max - min)
      raus[nr] = hexToRgba(c.ink, 0.08 + t * 0.34)
    }
    return raus
  }, [proWahlkreis, farbePartei, partyColors, c.ink])

  const dichteBereich = useMemo(() => {
    const werte = [...proWahlkreis.values()].map((e) => e.anzahl)
    return werte.length
      ? { min: Math.min(...werte), max: Math.max(...werte) }
      : null
  }, [proWahlkreis])

  const wkIndex = wahlkreise.findIndex(([nr]) => nr === aktiverWk)
  const schritt = (d: number) => {
    const ziel = wahlkreise[wkIndex + d]
    if (ziel) setParam('wk', String(ziel[0]))
  }
  const pfeilStil = (aus: boolean) => ({
    fontFamily: fonts.mono,
    fontSize: fontSize.base,
    lineHeight: 1,
    width: 40,
    minHeight: 44,
    borderRadius: radius.md,
    border: `1px solid ${c.border}`,
    background: 'transparent',
    color: aus ? c.subtle : c.inkSoft,
    cursor: aus ? 'default' : 'pointer',
    opacity: aus ? 0.5 : 1,
  })

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <ElectionsSubNav />

      <PageHeader
        kicker={t('electionCandidatesKicker')}
        title={wahlName || t('electionCandidatesTitle')}
        meta={
          data && data.gesamt > 0 ? (
            <>
              {formatDate(data.wahl.datum, lang)} · {data.gesamt}{' '}
              {t('electionCandidatesCount')} · {data.parteien.length}{' '}
              {t('electionCandidatesParties')} · {wahlkreise.length}{' '}
              {t('electionCandidatesConstituencies')}
            </>
          ) : undefined
        }
      />

      {/* Wahl-Auswahl */}
      {!listeLoading && wahlen.length > 1 && (
        <Toolbar label={t('electionCandidatesElection')}>
          {wahlen.map((w) => (
            <Chip
              key={w.slug}
              label={w.land ?? (lang === 'de' ? w.name_de : w.name_en)}
              title={lang === 'de' ? w.name_de : w.name_en}
              active={w.slug === wahlSlug}
              onClick={() => setParam('wahl', w.slug)}
            />
          ))}
        </Toolbar>
      )}

      {ersteLadung && <LoadingSpinner />}
      {error && !data && <EmptyState text={t('electionCandidatesError')} />}

      {data && data.gesamt === 0 && (
        <EmptyState text={t('electionCandidatesNone')} />
      )}

      {data && data.gesamt > 0 && (
        <div
          style={{
            opacity: laedtNach ? 0.6 : 1,
            transition: `opacity ${motion.fast} ${motion.easing}`,
          }}
          aria-busy={laedtNach}
        >
          {/*
            Spitzenkandidaturen zuerst: das ist die Frage, mit der die meisten
            auf diese Seite kommen. Die Wahlkreis- und Parteiansicht darunter
            beantwortet dann die genauere.
          */}
          {data.spitzenkandidaturen?.length > 0 && (
            <Section
              title={t('electionCandidatesTop')}
              note={t('electionCandidatesTopHint')}
            >
              <TopCandidates
                kandidaturen={data.spitzenkandidaturen}
                constituencyLabel={t('electionCandidatesConstituency')}
              />
            </Section>
          )}

          {/* Ansicht umschalten */}
          <Toolbar label={t('electionCandidatesView')}>
            {(['wahlkreis', 'partei'] as const).map((a) => (
              <Chip
                key={a}
                label={
                  a === 'wahlkreis'
                    ? t('electionCandidatesByConstituency')
                    : t('electionCandidatesByParty')
                }
                active={ansicht === a}
                onClick={() => setParam('ansicht', a === 'wahlkreis' ? null : a)}
              />
            ))}
          </Toolbar>

          {ansicht === 'wahlkreis' ? (
            <>
              {geo && (
                <Toolbar label={t('electionCandidatesColorBy')} tight>
                  <Chip
                    dense
                    label={t('electionCandidatesColorDensity')}
                    active={!farbePartei}
                    onClick={() => setParam('farbe', null)}
                  />
                  {(data.parteien ?? []).slice(0, 8).map((g) => (
                    <Chip
                      key={g.partei}
                      dense
                      label={cleanPartyLabel(g.partei)}
                      title={`${cleanPartyLabel(g.partei)} — ${g.anzahl}`}
                      dot={
                        partyColors[partyLabelToSlug(g.partei)] ?? partyColors.other
                      }
                      active={farbePartei === g.partei}
                      onClick={() =>
                        setParam('farbe', farbePartei === g.partei ? null : g.partei)
                      }
                    />
                  ))}
                </Toolbar>
              )}

              {/* Karte und Auswahl nebeneinander: das Land ist hoeher als breit,
                  untereinander schiebt die Karte die Liste aus dem Bild. */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: narrow ? '1fr' : '320px 1fr',
                  gap: spacing.xl,
                  alignItems: 'start',
                  marginBottom: spacing.lg,
                }}
              >
                {geo && (
                  <div>
                    <ConstituencyMap
                      geo={geo}
                      selected={aktiverWk}
                      onSelect={(nr) => setParam('wk', String(nr))}
                      colorByNr={colorByNr}
                      ariaLabel={t('electionCandidatesMapLabel')}
                      maxWidth={narrow ? 280 : 320}
                    />
                    <p
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: fontSize.micro,
                        color: c.muted,
                        marginTop: spacing.sm,
                        lineHeight: 1.6,
                      }}
                    >
                      {farbePartei
                        ? t('electionCandidatesLegendParty').replace(
                            '{partei}',
                            cleanPartyLabel(farbePartei),
                          )
                        : dichteBereich
                          ? t('electionCandidatesLegendDensity')
                              .replace('{min}', String(dichteBereich.min))
                              .replace('{max}', String(dichteBereich.max))
                          : ''}
                    </p>
                  </div>
                )}

                <div>
              {/* Auswahlfeld statt 41 Nummernknoepfen: die Karte ist der
                  eigentliche Selektor, die Liste war Dopplung. Bleibt als
                  Rueckfallebene fuer Wahlen ohne Geodaten und fuer Tastatur
                  und Screenreader. */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  marginBottom: spacing.lg,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  aria-label={t('electionCandidatesPrev')}
                  disabled={wkIndex <= 0}
                  onClick={() => schritt(-1)}
                  style={pfeilStil(wkIndex <= 0)}
                >
                  ‹
                </button>
                <select
                  value={aktiverWk ?? ''}
                  onChange={(e) => setParam('wk', e.target.value)}
                  aria-label={t('electionCandidatesConstituency')}
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSize.sm,
                    padding: '10px 12px',
                    minHeight: 44,
                    flex: 1,
                    minWidth: 180,
                    maxWidth: 340,
                    borderRadius: radius.md,
                    border: `1px solid ${c.border}`,
                    background: c.inputBg,
                    color: c.ink,
                    cursor: 'pointer',
                  }}
                >
                  {wahlkreise.map(([nr, label]) => (
                    <option key={nr} value={nr}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={t('electionCandidatesNext')}
                  disabled={wkIndex < 0 || wkIndex >= wahlkreise.length - 1}
                  onClick={() => schritt(1)}
                  style={pfeilStil(wkIndex < 0 || wkIndex >= wahlkreise.length - 1)}
                >
                  ›
                </button>
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSize.xs,
                    color: c.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {wkIndex + 1}/{wahlkreise.length}
                </span>
              </div>

              <Section
                title={wahlkreise.find(([nr]) => nr === aktiverWk)?.[1] ?? '—'}
                aside={`${imWahlkreis.length} ${t('electionCandidatesCount')}`}
                last
              >

              <div style={{ display: 'grid', gap: 0 }}>
                {imWahlkreis.map((k) => (
                  <CandidateRow
                    key={k.aw_id}
                    name={k.name}
                    partei={k.partei}
                    listenplatz={k.listenplatz}
                    profilUrl={k.profil_url}
                    colors={partyColors}
                    listLabel={t('electionCandidatesListPos')}
                  />
                ))}
              </div>
              </Section>
                </div>
              </div>
            </>
          ) : (
            <>
              {data.parteien.map((g) => (
                <Section
                  key={g.partei}
                  title={cleanPartyLabel(g.partei)}
                  aside={
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: radius.xs,
                          background:
                            partyColors[partyLabelToSlug(g.partei)] ??
                            partyColors.other,
                        }}
                      />
                      {g.anzahl}
                    </span>
                  }
                >
                  <div style={{ display: 'grid', gap: 0 }}>
                    {g.kandidaturen.map((k) => (
                      <CandidateRow
                        key={k.aw_id}
                        name={k.name}
                        wahlkreis={k.wahlkreis}
                        listenplatz={k.listenplatz}
                        profilUrl={k.profil_url}
                        colors={partyColors}
                        listLabel={t('electionCandidatesListPos')}
                      />
                    ))}
                  </div>
                </Section>
              ))}
            </>
          )}

          <p
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSize.xs,
              color: c.muted,
              marginTop: spacing.xl,
              lineHeight: 1.6,
            }}
          >
            {t('electionCandidatesSource')}
          </p>
        </div>
      )}
    </div>
  )
}

/** Eine Kandidatur als Zeile — je nach Ansicht mit Partei oder Wahlkreis. */
function CandidateRow({
  name,
  partei,
  wahlkreis,
  listenplatz,
  profilUrl,
  colors,
  listLabel,
}: {
  name: string
  partei?: string
  wahlkreis?: string | null
  listenplatz: number | null
  profilUrl: string | null
  colors: Record<string, string>
  listLabel: string
}) {
  const { c } = useTheme()
  const farbe = partei
    ? (colors[partyLabelToSlug(partei)] ?? colors.other)
    : null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: `${spacing.md}px 0`,
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      {farbe && (
        <span
          style={{
            width: 4,
            alignSelf: 'stretch',
            minHeight: 26,
            borderRadius: radius.xs,
            background: farbe,
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fonts.body, fontSize: fontSize.base, color: c.ink }}>
          {profilUrl ? (
            <a
              href={profilUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: c.ink, textDecoration: 'none' }}
            >
              {name}
            </a>
          ) : (
            name
          )}
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSize.xs,
            color: c.muted,
            marginTop: 2,
          }}
        >
          {partei ? cleanPartyLabel(partei) : wahlkreis}
          {listenplatz != null && ` · ${listLabel} ${listenplatz}`}
        </div>
      </div>
    </div>
  )
}
