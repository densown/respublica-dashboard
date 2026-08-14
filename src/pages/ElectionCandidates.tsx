import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  EmptyState,
  LoadingSpinner,
  SectionDivider,
  useTheme,
} from '../design-system'
import { fonts, motion, radius, spacing } from '../design-system/tokens'
import { useApi } from '../hooks/useApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { ElectionsSubNav } from './elections/ElectionsSubNav'
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

  const chip = (aktiv: boolean) => ({
    fontFamily: fonts.mono,
    fontSize: '0.72rem',
    padding: '11px 13px',
    minHeight: 44,
    cursor: 'pointer',
    borderRadius: radius.pill,
    border: `1px solid ${aktiv ? c.red : c.border}`,
    background: aktiv ? c.red : 'transparent',
    color: aktiv ? '#FFFFFF' : c.inkSoft,
    fontWeight: aktiv ? 700 : 400,
  })

  return (
    <div style={{ paddingBottom: spacing.xxl }}>
      <ElectionsSubNav />

      <header style={{ marginBottom: spacing.xl }}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: '0.7rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: c.red,
            marginBottom: spacing.sm,
          }}
        >
          {t('electionCandidatesKicker')}
        </div>
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: narrow ? '1.85rem' : '2.6rem',
            lineHeight: 1.12,
            color: c.ink,
            margin: 0,
            maxWidth: '22ch',
          }}
        >
          {wahlName || t('electionCandidatesTitle')}
        </h1>
        {data && data.gesamt > 0 && (
          <p
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.78rem',
              color: c.muted,
              marginTop: spacing.md,
              marginBottom: 0,
              lineHeight: 1.7,
            }}
          >
            {formatDate(data.wahl.datum, lang)} · {data.gesamt}{' '}
            {t('electionCandidatesCount')} · {data.parteien.length}{' '}
            {t('electionCandidatesParties')} · {wahlkreise.length}{' '}
            {t('electionCandidatesConstituencies')}
          </p>
        )}
      </header>

      {/* Wahl-Auswahl */}
      {!listeLoading && wahlen.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: spacing.xs,
            flexWrap: 'wrap',
            marginBottom: spacing.xl,
          }}
        >
          {wahlen.map((w) => (
            <button
              key={w.slug}
              type="button"
              onClick={() => setParam('wahl', w.slug)}
              title={lang === 'de' ? w.name_de : w.name_en}
              style={chip(w.slug === wahlSlug)}
            >
              {w.land ?? (lang === 'de' ? w.name_de : w.name_en)}
            </button>
          ))}
        </div>
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
          {/* Ansicht umschalten */}
          <div
            style={{
              display: 'flex',
              gap: spacing.xs,
              marginBottom: spacing.lg,
              flexWrap: 'wrap',
            }}
          >
            {(['wahlkreis', 'partei'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setParam('ansicht', a === 'wahlkreis' ? null : a)}
                style={chip(ansicht === a)}
              >
                {a === 'wahlkreis'
                  ? t('electionCandidatesByConstituency')
                  : t('electionCandidatesByParty')}
              </button>
            ))}
          </div>

          {ansicht === 'wahlkreis' ? (
            <>
              <SectionDivider label={t('electionCandidatesConstituency')} />
              <div
                style={{
                  display: 'flex',
                  gap: spacing.xs,
                  flexWrap: 'wrap',
                  marginBottom: spacing.lg,
                }}
              >
                {wahlkreise.map(([nr, label]) => (
                  <button
                    key={nr}
                    type="button"
                    onClick={() => setParam('wk', String(nr))}
                    title={label}
                    style={{
                      ...chip(nr === aktiverWk),
                      fontSize: '0.7rem',
                      padding: '10px 11px',
                      minWidth: 40,
                    }}
                  >
                    {nr}
                  </button>
                ))}
              </div>

              <h2
                style={{
                  fontFamily: fonts.display,
                  fontSize: '1.15rem',
                  color: c.ink,
                  margin: `0 0 ${spacing.md}px`,
                }}
              >
                {wahlkreise.find(([nr]) => nr === aktiverWk)?.[1] ?? '—'}
              </h2>

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
            </>
          ) : (
            <>
              {data.parteien.map((g) => (
                <section key={g.partei} style={{ marginBottom: spacing.xl }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background:
                          partyColors[partyLabelToSlug(g.partei)] ?? partyColors.other,
                        flexShrink: 0,
                      }}
                    />
                    <h2
                      style={{
                        fontFamily: fonts.display,
                        fontSize: '1.1rem',
                        color: c.ink,
                        margin: 0,
                      }}
                    >
                      {cleanPartyLabel(g.partei)}
                    </h2>
                    <span
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: '0.74rem',
                        color: c.muted,
                      }}
                    >
                      {g.anzahl}
                    </span>
                  </div>
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
                </section>
              ))}
            </>
          )}

          <p
            style={{
              fontFamily: fonts.mono,
              fontSize: '0.72rem',
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
            borderRadius: 2,
            background: farbe,
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fonts.body, fontSize: '0.95rem', color: c.ink }}>
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
            fontSize: '0.72rem',
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
