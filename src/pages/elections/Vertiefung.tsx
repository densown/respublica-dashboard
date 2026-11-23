import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTheme } from '../../design-system'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
import { useApi } from '../../hooks/useApi'
import { ChangeMap } from './ChangeMap'
import { mitNachfolgern } from './electionUiUtils'
import type { KreiseMapBuild } from './mapGeometry'
import { MAIN_PARTIES, PARTY_LABELS, STATE_NAMES, partyColorsForTheme } from './partyColors'
import { changeToDisplayPp, resolveKreisDisplayName, toDisplayPercent } from './normalizeWahlen'
import type { ChangeRow, ElectionType, MapRow, RankingRow, ScatterRow } from './types'

/**
 * Drei Fragen unter der Karte, jede mit eigener kleiner Grafik:
 * Wo ist eine Partei stark? Wo hat sie gewonnen und verloren? Haengen zwei
 * Werte zusammen? Ersetzt die "Erweiterte Analyse" mit ihren drei Reitern
 * hinter einem Knopf.
 */

type Props = {
  electionType: ElectionType
  year: number
  years: number[]
  mapBuild: KreiseMapBuild | null
  winnersByAgs: Map<string, MapRow>
  kreisNameByAgs: Map<string, string>
  onSelectRegion: (ags: string) => void
}

const ACHSEN = ['turnout', ...MAIN_PARTIES] as const
type Achse = (typeof ACHSEN)[number]

const normAgs = (a: string) => a.replace(/\s/g, '')

function useBreite(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const messen = () => setW(el.clientWidth)
    messen()
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

/** Runde Achsengrenzen und Schritte fuer Prozentwerte */
function achsenTeilung(min: number, max: number): number[] {
  const spanne = Math.max(1, max - min)
  const schritt = spanne > 40 ? 10 : spanne > 16 ? 5 : spanne > 8 ? 2 : 1
  const von = Math.floor(min / schritt) * schritt
  const bis = Math.ceil(max / schritt) * schritt
  const out: number[] = []
  for (let v = von; v <= bis + 1e-9; v += schritt) out.push(v)
  return out
}

function pearson(p: { x: number; y: number }[]): number {
  const n = p.length
  if (n < 3) return Number.NaN
  let sx = 0, sy = 0
  for (const q of p) { sx += q.x; sy += q.y }
  const mx = sx / n, my = sy / n
  let a = 0, bx = 0, by = 0
  for (const q of p) {
    a += (q.x - mx) * (q.y - my)
    bx += (q.x - mx) ** 2
    by += (q.y - my) ** 2
  }
  return bx > 0 && by > 0 ? a / Math.sqrt(bx * by) : Number.NaN
}

export function Vertiefung({
  electionType,
  year,
  years,
  mapBuild,
  winnersByAgs,
  kreisNameByAgs,
  onSelectRegion,
}: Props) {
  const { c, t, lang, theme } = useTheme()
  const farben = useMemo(() => partyColorsForTheme(theme === 'dark'), [theme])
  const komma = (n: number, stellen = 1) => n.toFixed(stellen).replace('.', lang === 'de' ? ',' : '.')
  const partei = (k: string) => PARTY_LABELS[k]?.[lang] ?? k
  const achsenName = (k: Achse) => (k === 'turnout' ? t('turnout') : partei(k))
  const kreisName = (ags: string, api?: string | null) => resolveKreisDisplayName(ags, kreisNameByAgs, api)
  const land = (ags: string) => STATE_NAMES[normAgs(ags).padStart(5, '0').slice(0, 2)] ?? ''

  const wahl: CSSProperties = {
    minHeight: 44,
    padding: '0 12px',
    borderRadius: radius.lg,
    border: `1px solid ${c.border}`,
    background: c.cardBg,
    color: c.text,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    maxWidth: '100%',
  }
  const feld = (name: string, kind: ReactNode) => (
    <label style={{ display: 'grid', gap: 4, minWidth: 0 }}>
      <span style={{ fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted }}>{name}</span>
      {kind}
    </label>
  )
  const abschnitt = (titel: string, vorspann: string, inhalt: ReactNode) => (
    <section style={{ marginTop: spacing.xxl ?? 40 }}>
      <h2
        style={{
          margin: 0,
          paddingBottom: spacing.sm,
          borderBottom: `1px solid ${c.border}`,
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: fontSize.xl,
          color: c.ink,
        }}
      >
        {titel}
      </h2>
      <p
        style={{
          margin: `${spacing.sm}px 0 ${spacing.md}px`,
          maxWidth: 720,
          fontFamily: fonts.body,
          fontSize: fontSize.base,
          lineHeight: 1.5,
          color: c.muted,
        }}
      >
        {vorspann}
      </p>
      {inhalt}
    </section>
  )
  const leer = (text: string) => (
    <p style={{ fontFamily: fonts.body, fontSize: fontSize.base, color: c.muted }}>{text}</p>
  )
  const kreisKnopf: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    textAlign: 'left',
    font: 'inherit',
    color: c.ink,
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationColor: c.border,
    textUnderlineOffset: 3,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  // --- 1. Hochburgen -------------------------------------------------------
  const [hbPartei, setHbPartei] = useState<string>('afd')
  const [hbRichtung, setHbRichtung] = useState<'desc' | 'asc'>('desc')
  const [hbAlle, setHbAlle] = useState(false)
  const { data: rang, loading: rangLaedt, error: rangFehler } = useApi<RankingRow[]>(
    `/api/wahlen/ranking?typ=${encodeURIComponent(electionType)}&year=${year}&party=${encodeURIComponent(hbPartei)}&limit=20&order=${hbRichtung}`,
  )
  const rangZeilen = useMemo(
    () => (rang ?? []).map((r) => ({ ...r, wert: toDisplayPercent(r.value) })),
    [rang],
  )
  const rangMax = Math.max(1, ...rangZeilen.map((r) => r.wert))

  const umschalter = (
    <div role="group" style={{ display: 'inline-flex', border: `1px solid ${c.border}`, borderRadius: radius.lg, overflow: 'hidden' }}>
      {(['desc', 'asc'] as const).map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={hbRichtung === r}
          onClick={() => setHbRichtung(r)}
          style={{
            minHeight: 44,
            padding: '0 14px',
            border: 'none',
            background: hbRichtung === r ? c.ink : c.cardBg,
            color: hbRichtung === r ? c.bg : c.text,
            fontFamily: fonts.body,
            fontSize: fontSize.md,
            cursor: 'pointer',
          }}
        >
          {t(r === 'desc' ? 'electionsStrongest' : 'electionsWeakest')}
        </button>
      ))}
    </div>
  )

  const hochburgen = (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: spacing.md, marginBottom: spacing.md }}>
        {feld(
          t('electionsParty'),
          <select value={hbPartei} onChange={(e) => setHbPartei(e.target.value)} style={wahl}>
            {MAIN_PARTIES.map((p) => (
              <option key={p} value={p}>{partei(p)}</option>
            ))}
          </select>,
        )}
        {umschalter}
      </div>
      {rangFehler ? leer(t('dataLoadError')) : rangLaedt && !rangZeilen.length ? leer(t('loading')) : !rangZeilen.length ? leer(t('noData')) : (
        <>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: 720 }}>
            {rangZeilen.slice(0, hbAlle ? 20 : 10).map((r) => (
              <li
                key={r.ags}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.8em minmax(0, 1fr) 4.4em',
                  columnGap: spacing.sm,
                  alignItems: 'baseline',
                  padding: '8px 0',
                  borderBottom: `1px solid ${c.border}`,
                  fontFamily: fonts.body,
                  fontSize: fontSize.base,
                }}
              >
                <span style={{ fontFamily: fonts.mono, fontSize: fontSize.sm, color: c.muted }}>{r.rank}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: spacing.sm, alignItems: 'baseline', minWidth: 0 }}>
                    <button type="button" style={{ ...kreisKnopf, flex: '0 1 auto' }} onClick={() => onSelectRegion(normAgs(r.ags))}>
                      {kreisName(r.ags, r.name)}
                    </button>
                    <span style={{ flex: '1 100 0', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: fontSize.sm, color: c.muted, whiteSpace: 'nowrap' }}>{land(r.ags)}</span>
                  </span>
                  <span
                    aria-hidden
                    style={{
                      display: 'block',
                      marginTop: 5,
                      height: 6,
                      width: `${Math.max(1, (r.wert / rangMax) * 100)}%`,
                      background: farben[hbPartei] ?? farben.other,
                    }}
                  />
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: fontSize.sm, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {komma(r.wert)}&nbsp;%
                </span>
              </li>
            ))}
          </ol>
          {rangZeilen.length > 10 && (
            <button
              type="button"
              onClick={() => setHbAlle((v) => !v)}
              style={{ ...kreisKnopf, marginTop: spacing.md, minHeight: 44, color: c.muted, fontStyle: 'italic' }}
            >
              {t(hbAlle ? 'electionsShowLess' : 'electionsShowMore')}
            </button>
          )}
        </>
      )}
    </>
  )

  // --- 2. Gewinne und Verluste --------------------------------------------
  const jahre = useMemo(() => [...years].sort((a, b) => b - a), [years])
  const [von, setVon] = useState<number | null>(null)
  const [bis, setBis] = useState<number | null>(null)
  const [gvPartei, setGvPartei] = useState<string>('spd')
  useEffect(() => {
    // Standard: die gewaehlte Wahl gegen die davor
    const i = jahre.indexOf(year)
    if (i >= 0 && i + 1 < jahre.length) {
      setBis(year)
      setVon(jahre[i + 1]!)
    } else if (jahre.length >= 2) {
      setBis(jahre[0]!)
      setVon(jahre[1]!)
    } else {
      setBis(null)
      setVon(null)
    }
  }, [jahre, year])
  const { data: aenderungRoh, loading: gvLaedt, error: gvFehler } = useApi<ChangeRow[]>(
    von != null && bis != null && von !== bis
      ? `/api/wahlen/change?typ=${encodeURIComponent(electionType)}&from=${von}&to=${bis}&party=${encodeURIComponent(gvPartei)}`
      : '',
  )
  const aenderung = useMemo(
    () =>
      (aenderungRoh ?? [])
        .filter((r) => r.change != null && Number.isFinite(Number(r.change)))
        .map((r) => ({
          ...r,
          change: changeToDisplayPp(r.change),
          value_from: toDisplayPercent(r.value_from),
          value_to: toDisplayPercent(r.value_to),
        })),
    [aenderungRoh],
  )
  const aenderungNachAgs = useMemo(() => {
    const m = new Map<string, ChangeRow>()
    for (const r of aenderung) m.set(normAgs(r.ags), r)
    return mitNachfolgern(m)
  }, [aenderung])
  const gvMax = Math.max(1, ...aenderung.map((r) => Math.abs(r.change)))
  const gewinne = [...aenderung].filter((r) => r.change > 0).sort((a, b) => b.change - a.change).slice(0, 5)
  const verluste = [...aenderung].filter((r) => r.change < 0).sort((a, b) => a.change - b.change).slice(0, 5)
  const nPlus = aenderung.filter((r) => r.change > 0).length
  const nMinus = aenderung.filter((r) => r.change < 0).length
  const punkte = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${komma(Math.abs(n))}`

  const liste = (titel: string, zeilen: ChangeRow[], farbe: string) => (
    <div style={{ minWidth: 0 }}>
      <h3 style={{ margin: `0 0 ${spacing.sm}px`, fontFamily: fonts.body, fontWeight: 700, fontSize: fontSize.base, color: c.ink }}>
        {titel}
      </h3>
      {zeilen.length === 0 ? leer(t('electionsNone')) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {zeilen.map((r) => (
            <li
              key={r.ags}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 4.4em',
                columnGap: spacing.sm,
                alignItems: 'baseline',
                padding: '7px 0',
                borderBottom: `1px solid ${c.border}`,
                fontFamily: fonts.body,
                fontSize: fontSize.base,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <button type="button" style={{ ...kreisKnopf, display: 'block', maxWidth: '100%' }} onClick={() => onSelectRegion(normAgs(r.ags))}>
                  {kreisName(r.ags, r.name)}
                </button>
                <span
                  aria-hidden
                  style={{ display: 'block', marginTop: 5, height: 6, width: `${Math.max(2, (Math.abs(r.change) / gvMax) * 100)}%`, background: farbe }}
                />
              </span>
              <span style={{ fontFamily: fonts.mono, fontSize: fontSize.sm, textAlign: 'right', whiteSpace: 'nowrap', color: farbe }}>
                {punkte(r.change)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )

  const jahrWahl = (wert: number | null, setze: (n: number) => void) => (
    <select value={wert ?? ''} onChange={(e) => setze(Number(e.target.value))} style={wahl}>
      {jahre.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  )

  const gewinneVerluste =
    jahre.length < 2 ? leer(t('electionsNeedTwoYears')) : (
      <>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md }}>
          {feld(t('electionsParty'), (
            <select value={gvPartei} onChange={(e) => setGvPartei(e.target.value)} style={wahl}>
              {MAIN_PARTIES.map((p) => (
                <option key={p} value={p}>{partei(p)}</option>
              ))}
            </select>
          ))}
          {feld(t('electionsFrom'), jahrWahl(von, setVon))}
          {feld(t('electionsTo'), jahrWahl(bis, setBis))}
        </div>
        {gvFehler ? leer(t('dataLoadError')) : gvLaedt && !aenderung.length ? leer(t('loading')) : !aenderung.length ? leer(t('electionsNoChangeData')) : (
          <>
            <p style={{ margin: `0 0 ${spacing.md}px`, maxWidth: 720, fontFamily: fonts.body, fontSize: fontSize.base, lineHeight: 1.5, color: c.ink }}>
              {t('electionsChangeSummary')
                .replace('{partei}', partei(gvPartei))
                .replace('{plus}', String(nPlus))
                .replace('{minus}', String(nMinus))
                .replace('{n}', String(aenderung.length))}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: spacing.xl, alignItems: 'start' }}>
              <div style={{ minWidth: 0 }}>
                <ChangeMap
                  mapBuild={mapBuild}
                  changeByAgs={aenderungNachAgs}
                  maxAbs={gvMax}
                  kreisNameByAgs={kreisNameByAgs}
                  onSelectAgs={(ags) => onSelectRegion(normAgs(ags))}
                />
              </div>
              <div style={{ display: 'grid', gap: spacing.lg, minWidth: 0 }}>
                {liste(t('electionsBiggestGains'), gewinne, c.yes ?? '#2F6E4E')}
                {liste(t('electionsBiggestLosses'), verluste, c.red)}
                <p style={{ margin: 0, fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted }}>{t('electionsPointsNote')}</p>
              </div>
            </div>
          </>
        )}
      </>
    )

  // --- 3. Zusammenhang -----------------------------------------------------
  const [xAchse, setXAchse] = useState<Achse>('turnout')
  const [yAchse, setYAchse] = useState<Achse>('afd')
  const { data: punkteRoh, loading: zhLaedt, error: zhFehler } = useApi<ScatterRow[]>(
    xAchse !== yAchse
      ? `/api/wahlen/scatter?typ=${encodeURIComponent(electionType)}&year=${year}&x=${encodeURIComponent(xAchse)}&y=${encodeURIComponent(yAchse)}`
      : '',
  )
  const wolke = useMemo(
    () =>
      (punkteRoh ?? [])
        .filter((p) => p.x != null && p.y != null && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)))
        .map((p) => ({ ags: normAgs(p.ags), name: p.name, x: toDisplayPercent(p.x), y: toDisplayPercent(p.y) })),
    [punkteRoh],
  )
  const r = useMemo(() => pearson(wolke), [wolke])
  const [zhRef, zhBreite] = useBreite()
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  useEffect(() => setGewaehlt(null), [xAchse, yAchse, year, electionType])

  let zhSatz = ''
  if (Number.isFinite(r)) {
    const staerke = Math.abs(r) < 0.2 ? 'electionsCorrNone' : Math.abs(r) < 0.5 ? 'electionsCorrWeak' : Math.abs(r) < 0.7 ? 'electionsCorrClear' : 'electionsCorrStrong'
    zhSatz = t(staerke as 'electionsCorrNone')
      .replace('{x}', achsenName(xAchse))
      .replace('{y}', achsenName(yAchse))
      .replace('{richtung}', t(r > 0 ? 'electionsCorrHigher' : 'electionsCorrLower'))
  }

  const diagramm = () => {
    const W = Math.max(280, zhBreite)
    const H = Math.round(Math.min(460, Math.max(300, W * 0.72)))
    const m = { l: 44, r: 12, t: 10, b: 40 }
    const xs = achsenTeilung(Math.min(...wolke.map((p) => p.x)), Math.max(...wolke.map((p) => p.x)))
    const ys = achsenTeilung(Math.min(...wolke.map((p) => p.y)), Math.max(...wolke.map((p) => p.y)))
    const x0 = xs[0]!, x1 = xs[xs.length - 1]!, y0 = ys[0]!, y1 = ys[ys.length - 1]!
    const px = (v: number) => m.l + ((v - x0) / (x1 - x0 || 1)) * (W - m.l - m.r)
    const py = (v: number) => H - m.b - ((v - y0) / (y1 - y0 || 1)) * (H - m.t - m.b)
    const schrift = { fontFamily: fonts.mono, fontSize: 11, fill: c.muted } as const
    const gew = gewaehlt ? wolke.find((p) => p.ags === gewaehlt) : undefined
    return (
      <>
        <svg width={W} height={H} role="img" aria-label={`${achsenName(xAchse)} / ${achsenName(yAchse)}`} style={{ display: 'block', maxWidth: '100%' }}>
          {ys.map((v) => (
            <g key={`y${v}`}>
              <line x1={m.l} x2={W - m.r} y1={py(v)} y2={py(v)} stroke={c.border} strokeWidth={1} />
              <text x={m.l - 6} y={py(v) + 4} textAnchor="end" {...schrift}>{v}</text>
            </g>
          ))}
          {xs.map((v) => (
            <text key={`x${v}`} x={px(v)} y={H - m.b + 16} textAnchor="middle" {...schrift}>{v}</text>
          ))}
          <text x={W - m.r} y={H - 6} textAnchor="end" style={{ fontFamily: fonts.body, fontSize: 12, fill: c.inkSoft }}>
            {achsenName(xAchse)} (%) →
          </text>
          <text x={m.l} y={m.t + 2} textAnchor="start" dominantBaseline="hanging" style={{ fontFamily: fonts.body, fontSize: 12, fill: c.inkSoft }}>
            ↑ {achsenName(yAchse)} (%)
          </text>
          {wolke.map((p) => {
            const sieger = winnersByAgs.get(p.ags)?.winning_party
            return (
              <circle
                key={p.ags}
                cx={px(p.x)}
                cy={py(p.y)}
                r={4}
                fill={(sieger && farben[sieger]) || farben.other}
                fillOpacity={0.8}
                stroke={c.bg}
                strokeWidth={0.75}
                style={{ cursor: 'pointer' }}
                onClick={() => setGewaehlt(p.ags)}
              >
                <title>{`${kreisName(p.ags, p.name)}: ${komma(p.x)} % / ${komma(p.y)} %`}</title>
              </circle>
            )
          })}
          {gew && <circle cx={px(gew.x)} cy={py(gew.y)} r={7} fill="none" stroke={c.ink} strokeWidth={2} pointerEvents="none" />}
        </svg>
        <p aria-live="polite" style={{ margin: `${spacing.sm}px 0 0`, minHeight: 24, fontFamily: fonts.body, fontSize: fontSize.sm, color: c.muted }}>
          {gew ? (
            <>
              <button type="button" style={{ ...kreisKnopf, display: 'inline', whiteSpace: 'normal' }} onClick={() => onSelectRegion(gew.ags)}>
                {kreisName(gew.ags, gew.name)}
              </button>
              {`: ${achsenName(xAchse)} ${komma(gew.x)} %, ${achsenName(yAchse)} ${komma(gew.y)} %`}
            </>
          ) : (
            t('electionsScatterHint')
          )}
        </p>
      </>
    )
  }

  const achsenWahl = (wert: Achse, setze: (a: Achse) => void) => (
    <select value={wert} onChange={(e) => setze(e.target.value as Achse)} style={wahl}>
      {ACHSEN.map((a) => (
        <option key={a} value={a}>{achsenName(a)}</option>
      ))}
    </select>
  )

  const zusammenhang = (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md }}>
        {feld(t('electionsAxisX'), achsenWahl(xAchse, setXAchse))}
        {feld(t('electionsAxisY'), achsenWahl(yAchse, setYAchse))}
      </div>
      <div ref={zhRef} style={{ maxWidth: 720 }}>
        {xAchse === yAchse ? leer(t('electionsPickTwo')) : zhFehler ? leer(t('dataLoadError')) : zhLaedt && !wolke.length ? leer(t('loading')) : wolke.length < 3 ? leer(t('noData')) : (
          <>
            {zhSatz && (
              <p style={{ margin: `0 0 ${spacing.md}px`, fontFamily: fonts.body, fontSize: fontSize.base, lineHeight: 1.5, color: c.ink }}>
                {zhSatz} <span style={{ color: c.muted }}>{t('electionsCorrCaveat').replace('{r}', komma(r, 2).replace('-', '\u2212'))}</span>
              </p>
            )}
            {zhBreite > 0 && diagramm()}
          </>
        )}
      </div>
    </>
  )

  return (
    <>
      {abschnitt(t('electionsStrongholdsTitle'), t('electionsStrongholdsIntro'), hochburgen)}
      {abschnitt(t('electionsChangeTitle'), t('electionsChangeIntro'), gewinneVerluste)}
      {abschnitt(t('electionsRelationTitle'), t('electionsRelationIntro'), zusammenhang)}
    </>
  )
}
