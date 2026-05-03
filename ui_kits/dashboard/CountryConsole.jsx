/* global React, useTheme, FONTS, SPACE,
   MonoLabel, SectionDivider, InfoToggle, TrendArrow,
   Sparkline, PercentileBar, StatTile, HBar,
   LineChart, RadarChart, CompareBar, TradeBalance */

/**
 * CountryConsole – Production version
 *
 * Komplett auf echte API-Endpoints umgestellt:
 *   - GET /api/world/country/:iso3       → region, income_level, indicators[]
 *   - GET /api/world/map?indicator&year  → Perzentil-Berechnung
 *   - GET /api/world/ranking?indicator&year&limit
 *   - GET /api/world/trade/:iso3?year    → top_exports, top_imports, totals
 *   - GET /api/world/categories
 *
 * Keine Hardcoded-Daten mehr. Alle Werte werden aus Props oder
 * Live-Fetches geladen. Beim Portieren in CountrySidebar.tsx
 * werden hooks (useApi/useEffect) und props übergeben.
 *
 * V-Dem-Codes (alle in DB unter category="democracy"):
 *   v2x_libdem, v2x_polyarchy, v2x_civlib, v2x_freexp,
 *   v2x_frassoc_thick, v2xel_frefair, v2x_rule, v2x_corr
 *
 * Weltbank-Kerncodes:
 *   NY.GDP.PCAP.CD     BIP pro Kopf
 *   SP.POP.TOTL        Bevölkerung
 *   SP.DYN.LE00.IN     Lebenserwartung
 *   SI.POV.GINI        Gini
 *   FP.CPI.TOTL.ZG     Inflation
 *   SL.UEM.TOTL.ZS     Arbeitslosigkeit
 */

const { useState: useStateCS, useEffect: useEffectCS, useMemo: useMemoCS } = React;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const VDEM_CODES = [
  'v2x_libdem', 'v2x_polyarchy', 'v2x_civlib', 'v2x_freexp',
  'v2x_frassoc_thick', 'v2xel_frefair', 'v2x_rule', 'v2x_corr',
];

const VDEM_LABELS_DE = {
  v2x_libdem:        'Liberale Demokratie',
  v2x_polyarchy:     'Elektorale Demokratie',
  v2x_civlib:        'Bürgerrechte',
  v2x_freexp:        'Meinungsfreiheit',
  v2x_frassoc_thick: 'Vereinigungsfreiheit',
  v2xel_frefair:     'Freie Wahlen',
  v2x_rule:          'Rechtsstaatlichkeit',
  v2x_corr:          'Korruption (invertiert)',
};

const VDEM_RADAR_AXES_DE = [
  { code: 'v2x_libdem',        label: 'Liberal' },
  { code: 'v2x_polyarchy',     label: 'Elektoral' },
  { code: 'v2x_civlib',        label: 'Bürger' },
  { code: 'v2x_freexp',        label: 'Meinung' },
  { code: 'v2x_frassoc_thick', label: 'Vereinig.' },
  { code: 'v2xel_frefair',     label: 'Wahlen' },
];

// Latest non-null value from indicator.values[] (already sorted asc by year in API)
function latestValue(indicator) {
  if (!indicator?.values?.length) return null;
  for (let i = indicator.values.length - 1; i >= 0; i--) {
    const v = indicator.values[i];
    if (v?.value != null && !isNaN(v.value)) return v;
  }
  return null;
}

// Get last N years as [{y, v}] for charts
function tailSeries(indicator, n = 20) {
  if (!indicator?.values?.length) return [];
  const filtered = indicator.values.filter(v => v?.value != null && !isNaN(v.value));
  return filtered.slice(-n).map(v => ({ y: v.year, v: v.value }));
}

// Trend over last 3 values: percent change from first to last
function trendFromValues(indicator, n = 3) {
  const tail = tailSeries(indicator, n);
  if (tail.length < 2) return null;
  const first = tail[0].v, last = tail[tail.length - 1].v;
  if (first === 0) return null;
  return (last - first) / Math.abs(first);
}

// Find indicator by code
function findInd(detail, code) {
  return detail?.indicators?.find(i => i.indicator_code === code);
}

// Format helpers
function fmtNumber(v, digits = 0) {
  if (v == null) return '—';
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
}

function fmtUsd(v) {
  if (v == null) return '—';
  if (v >= 1e9) return `${fmtNumber(v / 1e9, 1)} Mrd. $`;
  if (v >= 1e6) return `${fmtNumber(v / 1e6, 1)} Mio. $`;
  return `${fmtNumber(v, 0)} $`;
}

function fmtPopulation(v) {
  if (v == null) return '—';
  if (v >= 1e9) return `${fmtNumber(v / 1e9, 2)} Mrd.`;
  if (v >= 1e6) return `${fmtNumber(v / 1e6, 1)} Mio.`;
  if (v >= 1e3) return `${fmtNumber(v / 1e3, 0)} Tsd.`;
  return fmtNumber(v, 0);
}

// ─── Global view (no country selected) ───────────────────────────────────────
// Receives top/bottom/median/mean as props from parent
function GlobalView({ activeIndicatorLabel, ranking, stats, totalCountries }) {
  const { c } = useTheme();
  const top5 = (ranking || []).slice(0, 5);
  const bot5 = (ranking || []).slice(-5).reverse();
  return (
    <div style={{ padding: `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xxl}px` }}>
      <div style={{ marginBottom: SPACE.lg }}>
        <MonoLabel>Globale Übersicht</MonoLabel>
        <h2 style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 22, color: c.ink, lineHeight: 1.1, marginTop: SPACE.xs }}>
          {activeIndicatorLabel || 'Indikator wählen'}<span style={{ color: c.red }}>.</span>
        </h2>
        <p style={{ fontFamily: FONTS.body, fontStyle: 'italic', fontSize: 12, color: c.muted, marginTop: SPACE.xs }}>
          {totalCountries ? `${totalCountries} Länder mit Daten` : 'Lade…'}
        </p>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.md, marginBottom: SPACE.lg }}>
          <StatTile label="Globaler Median" value={fmtNumber(stats.median, 2)} sub="Mittlerer Wert" icon="◉" />
          <StatTile label="Globaler Ø" value={fmtNumber(stats.mean, 2)} sub="Arithmet. Mittel" icon="◆" />
        </div>
      )}

      {top5.length > 0 && (
        <>
          <SectionDivider label="Top 5" />
          {top5.map((row, i) => (
            <div key={row.country_code} style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.sm}px 0`, borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.muted, width: 16 }}>{i + 1}</span>
              <span style={{ fontFamily: FONTS.body, fontSize: 13, color: c.ink, flex: 1 }}>{row.country_name}</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.ink }}>{fmtNumber(row.value, 2)}</span>
            </div>
          ))}
        </>
      )}

      {bot5.length > 0 && (
        <>
          <SectionDivider label="Bottom 5" />
          {bot5.map((row, i) => (
            <div key={row.country_code} style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.sm}px 0`, borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.muted, width: 16 }}>{(totalCountries || 0) - i}</span>
              <span style={{ fontFamily: FONTS.body, fontSize: 13, color: c.ink, flex: 1 }}>{row.country_name}</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.no }}>{fmtNumber(row.value, 2)}</span>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: SPACE.xl, padding: SPACE.lg, border: `1px dashed ${c.border}`, borderRadius: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 20, marginBottom: SPACE.sm }}>⊕</div>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: c.muted, lineHeight: 1.5 }}>
          Klicke ein Land auf der Karte<br />um die Detail-Console zu öffnen
        </p>
      </div>
    </div>
  );
}

// ─── Tab: Übersicht ───────────────────────────────────────────────────────────
// Props: countryDetail, selectedRow (active map row), activeIndicator {code, name, category},
//        percentile (number 0-100), lowerIsBetter (bool)
function TabUebersicht({ countryDetail, selectedRow, activeIndicator, percentile, lowerIsBetter }) {
  const { c } = useTheme();

  // Active indicator data – primary from selectedRow (already loaded for map),
  // fall back to countryDetail if needed
  const activeInd = activeIndicator?.code ? findInd(countryDetail, activeIndicator.code) : null;
  const activeLatest = latestValue(activeInd) || (selectedRow?.value != null ? { value: selectedRow.value, year: selectedRow.year } : null);
  const activeTrend = trendFromValues(activeInd, 3);
  const activeSpark = tailSeries(activeInd, 10).map(p => p.v);

  // Core tiles – pulled from indicators
  const popInd = findInd(countryDetail, 'SP.POP.TOTL');
  const gdpPcInd = findInd(countryDetail, 'NY.GDP.PCAP.CD');
  const lifeInd = findInd(countryDetail, 'SP.DYN.LE00.IN');
  const ldiInd = findInd(countryDetail, 'v2x_libdem');

  const popLatest = latestValue(popInd);
  const gdpPcLatest = latestValue(gdpPcInd);
  const lifeLatest = latestValue(lifeInd);
  const ldiLatest = latestValue(ldiInd);

  const tiles = [
    { label: 'Bevölkerung',  value: popLatest ? fmtPopulation(popLatest.value) : '—',     sub: popLatest ? `Stand ${popLatest.year}` : '', icon: '⬡' },
    { label: 'BIP / Kopf',   value: gdpPcLatest ? `$ ${fmtNumber(gdpPcLatest.value, 0)}` : '—', sub: gdpPcLatest ? `Weltbank ${gdpPcLatest.year}` : '', icon: '◆' },
    { label: 'Lebenserw.',   value: lifeLatest ? `${fmtNumber(lifeLatest.value, 1)} J.` : '—', sub: lifeLatest ? `Stand ${lifeLatest.year}` : '', icon: '◈' },
    { label: 'Demokratie',   value: ldiLatest ? fmtNumber(ldiLatest.value, 2) : '—',  sub: ldiLatest ? `V-Dem LDI ${ldiLatest.year}` : '', icon: '◉' },
  ];

  return (
    <div style={{ padding: `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xxl}px` }}>
      {/* Active indicator hero */}
      <div style={{ marginBottom: SPACE.lg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <MonoLabel>{activeIndicator?.name || 'Aktiver Indikator'}</MonoLabel>
          {activeTrend != null && <TrendArrow value={activeTrend} inverted={lowerIsBetter} />}
        </div>
        <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 40, color: c.ink, lineHeight: 1, marginTop: SPACE.xs, letterSpacing: '-0.02em' }}>
          {activeLatest ? fmtNumber(activeLatest.value, 2) : '—'}
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: c.muted, marginTop: SPACE.xs }}>
          {activeIndicator?.code} · {activeLatest?.year || '—'}
        </div>
        {activeSpark.length >= 2 && (
          <div style={{ marginTop: SPACE.md }}>
            <Sparkline data={activeSpark} height={52} showMarkers />
          </div>
        )}
      </div>

      {/* Percentile */}
      {percentile != null && (
        <div style={{ marginBottom: SPACE.lg }}>
          <PercentileBar pct={percentile} label={`Position · ${activeIndicator?.name || 'Indikator'}`} inverted={lowerIsBetter} />
          <div style={{ marginTop: SPACE.sm, fontFamily: FONTS.body, fontSize: 12, color: c.muted, fontStyle: 'italic', lineHeight: 1.5 }}>
            {countryDetail?.country_name || 'Dieses Land'} liegt im {Math.round(lowerIsBetter ? 100 - percentile : percentile)}. Perzentil aller erfassten Länder.
            <InfoToggle text="Das Perzentil zeigt die relative Position im globalen Länder-Ranking. 100. Perzentil = höchster Wert weltweit." />
          </div>
        </div>
      )}

      <SectionDivider label="Kerndaten" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.sm, marginBottom: SPACE.lg }}>
        {tiles.map((t, i) => (
          <StatTile key={i} {...t} />
        ))}
      </div>

      <SectionDivider label="Profil" />
      {[
        ['ISO-Code', countryDetail?.country_code || '—'],
        ['Region', countryDetail?.region || '—'],
        ['Einkommensgruppe', countryDetail?.income_level || '—'──────────────────────────────────────
function TabDemokratie({ countryDetail }) {
  const { c } = useTheme();

  // V-Dem indicators from countryDetail
  const vdemIndicators = useMemoCS(() => {
    const result = {};
    for (const code of VDEM_CODES) {
      result[code] = findInd(countryDetail, code);
    }
    return result;
  }, [countryDetail]);

  const ldiInd = vdemIndicators['v2x_libdem'];
  const ldiLatest = latestValue(ldiInd);
  const ldiSeries = tailSeries(ldiInd, 75); // bis zu 1950–2024

  // 10-year trend on LDI
  const ldiSeries10 = tailSeries(ldiInd, 10);
  let trend10 = null;
  if (ldiSeries10.length >= 2) {
    trend10 = ldiSeries10[ldiSeries10.length - 1].v - ldiSeries10[0].v;
  }

  // Radar axes – take 6 dimensions
  const radarAxes = VDEM_RADAR_AXES_DE.map(({ code, label }) => {
    const ind = vdemIndicators[code];
    const latest = latestValue(ind);
    return { label, value: latest?.value ?? 0 };
  });

  // Bars for all 8 V-Dem codes
  const bars = VDEM_CODES.map(code => {
    const ind = vdemIndicators[code];
    const latest = latestValue(ind);
    const v = latest?.value;
    // v2x_corr: lower = better → invert for display
    const displayV = code === 'v2x_corr' && v != null ? 1 - v : v;
    return {
      label: VDEM_LABELS_DE[code],
      value: displayV ?? 0,
      formatted: v != null ? v.toFixed(2) : '—',
    };
  });

  if (!ldiInd) {
    return (
      <div style={{ padding: SPACE.lg }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          Keine V-Dem Daten für dieses Land verfügbar.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xxl}px` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: SPACE.md }}>
        <div>
          <MonoLabel>Liberal Democracy Index</MonoLabel>
          <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 30, color: c.ink, lineHeight: 1.1, marginTop: SPACE.xs }}>
            {ldiLatest ? ldiLatest.value.toFixed(2) : '—'}<span style={{ color: c.red }}>.</span>
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: c.muted, marginTop: 2 }}>
            V-Dem · {ldiLatest?.year || '—'}
          </div>
        </div>
        {trend10 != null && (
          <div style={{ textAlign: 'right' }}>
            <MonoLabel>10-Jahres-Trend</MonoLabel>
            <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: trend10 >= 0 ? c.yes : c.no }}>
              {trend10 >= 0 ? '↑' : '↓'} {trend10 >= 0 ? '+' : ''}{trend10.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {ldiSeries.length >= 2 && (
        <>
          <SectionDivider label="Liberal Democracy Index – Zeitreihe" />
          <LineChart data={ldiSeries} yLabel="LDI · 0–1" height={90} />
        </>
      )}

      <SectionDivider label="V-Dem Dimensionen" />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: SPACE.md }}>
        <RadarChart axes={radarAxes} />
      </div>

      <SectionDivider label="Alle V-Dem Indikatoren" />
      {bars.map((b, i) => (
        <HBar key={i} label={b.label} value={b.value} max={1}
          formatted={b.formatted} color={c.red} />
      ))}
    </div>
  );
}

// ─── Tab: Wirtschaft ─────────────────────────────────────────────────────────
function TabWirtschaft({ countryDetail }) {
  const { c } = useTheme();

  const gdpPcInd = findInd(countryDetail, 'NY.GDP.PCAP.CD');
  const inflationInd = findInd(countryDetail, 'FP.CPI.TOTL.ZG');
  const unempInd = findInd(countryDetail, 'SL.UEM.TOTL.ZS');
  const giniInd = findInd(countryDetail, 'SI.POV.GINI');

  const gdpSeries = tailSeries(gdpPcInd, 14).map(p => ({ y: p.y, v: p.v / 1000 })); // in tsd $
  const inflationSeries = tailSeries(inflationInd, 12);
  const unempSeries = tailSeries(unempInd, 12);

  const giniLatest = latestValue(giniInd);

  if (!gdpPcInd && !inflationInd && !unempInd) {
    return (
      <div style={{ padding: SPACE.lg }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          Keine Wirtschaftsdaten für dieses Land verfügbar.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xxl}px` }}>
      {gdpSeries.length >= 2 && (
        <>
          <SectionDivider label="BIP pro Kopf (Tsd. $)" />
          <LineChart data={gdpSeries} yLabel="$ Tausend" height={90} />
        </>
      )}

      {inflationSeries.length >= 2 && (
        <>
          <SectionDivider label="Inflation (%)" />
          <LineChart data={inflationSeries} color={c.no} height={70} showArea={false} />
        </>
      )}

      {unempSeries.length >= 2 && (
        <>
          <SectionDivider label="Arbeitslosigkeit (%)" />
          <LineChart data={unempSeries} color={c.yes} height={70} showArea={false} />
        </>
      )}

      {giniLatest && (
        <>
          <SectionDivider label="Ungleichheit" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE.lg, marginBottom: SPACE.sm }}>
            <div>
              <MonoLabel>Gini-Koeffizient</MonoLabel>
              <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 28, color: c.ink, lineHeight: 1.1, marginTop: 4 }t.year} · niedriger = gleicher
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Handel ─────────────────────────────────────────────────────────────
// Receives tradeData prop: { iso3, year, total_export_usd, total_import_usd, top_exports, top_imports }
function TabHandel({ tradeData, loading }) {
  const { c } = useTheme();

  if (loading) {
    return (
      <div style={{ padding: SPACE.lg }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          Lade Handelsdaten…
        </p>
      </div>
    );
  }

  if (!tradeData || (!tradeData.top_exports?.length && !tradeData.top_imports?.length)) {
    return (
      <div style={{ padding: SPACE.lg }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: c.muted, fontStyle: 'italic' }}>
          Keine UN Comtrade Daten für dieses Land verfügbar.
        </p>
      </div>
    );
  }

  const exports = Number(tradeData.total_export_usd || 0);
  const imports = Number(tradeData.total_import_usd || 0);
  // Convert to billions for display
  const expBn = exports / 1e9;
  const impBn = imports / 1e9;

  const topExp = tradeData.top_exports || [];
  const topImp = tradeData.top_imports || [];
  const maxExp = topExp.length ? Math.max(...topExp.map(x => Number(x.value_usd))) : 1;
  const maxImp = topImp.length ? Math.max(...topImp.map(x => Number(x.value_usd))) : 1;

  return (
    <div style={{ padding: `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xxl}px` }}>
      <SectionDivider label={`Handelsbilanz ${tradeData.year}`} />
      <TradeBalance
        exports={Math.round(expBn)}
        imports={Math.round(impBn)}
        currency="Mrd. $"
      />

      {topExp.length > 0 && (
        <>
          <SectionDivider label="Top Exportpartner" />
          {topExp.map((p, i) => (
            <HBar key={i}
              label={p.partner_name}
              value={Number(p.value_usd)}
              max={maxExp}
              formatted={fmtUsd(Number(p.value_usd))}
              color={c.yes} />
          ))}
        </>
      )}

      {topImp.length > 0 && (
        <>
          <SectionDivider label="Top Importpartner" />
          {topImp.map((p, i) => (
            <HBar key={i}
              label={p.partner_name}
              value={Number(p.value_usd)}
              max={maxImp}
              formatted={fmtUsd(Number(p.value_usd))}
              color={c.no} />
          ))}
        </>
      )}
    </div>
  );
}

// ─── Tab: Vergleich ──────────────────────────────────────────────────────────
// Stub – wird in Phase 2 mit /api/world/compare echte Daten bekommen
function TabVergleich({ countryDetail }) {
  const { c } = useTheme();
  const [q, setQ] = useStateCS('');

  return (
    <div style={{ padding: `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xxl}px` }}>
      <div style={{ marginBottom: SPACE.lg }}>
        <MonoLabel style={{ marginBottom: SPACE.xs }}>Vergleichsland</MonoLabel>
        <input
          type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Land suchen…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: `${SPACE.sm}px ${SPACE.md}px`,
            border: `1px solid ${c.inputBorder || c.border}`, borderRadius: 6,
       nter' }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: c.muted, lineHeight: 1.5 }}>
          Wähle ein Land zum Vergleich.<br />
          <span style={{ fontStyle: 'italic', fontSize: 12 }}>(Volle Implementierung folgt: /api/world/compare)</span>
        </p>
      </div>
    </div>
  );
}

// ─── Tab: Kontext ────────────────────────────────────────────────────────────
// Receives articles prop (from optional Res.Publica WP API in future)
function TabKontext({ countryDetail, articles }) {
  const { c } = useTheme();

  // Data sources actually used in the dashboard
  const dataSources = [
    { source: 'Weltbank WDI',         desc: 'Wirtschaft, Bevölkerung, Bildung' },
    { source: 'V-Dem Institute v16',  desc: 'Demokratie-Indikatoren (8 Codes)' },
    { source: 'UN Comtrade',          desc: 'Handelsflüsse (Export/Import)' },
  ];

  return (
    <div style={{ padding: `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xxl}px` }}>
      {articles && articles.length > 0 && (
        <>
          <SectionDivider label="Res.Publica Artikel" />
          {articles.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', padding: `${SPACE.md}px 0`, borderBottom: `1px solid ${c.border}`, textDecoration: 'none' }}>
              {a.tag && (
                <div style={{ display: 'flex', gap: SPACE.sm, marginBottom: SPACE.xs }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: c.badgeBg || c.red, borderRadius: 3, padding: '2px 6px' }}>{a.tag}</span>
                </div>
              )}
              <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 13, color: c.ink, lineHeight: 1.45 }}>{a.title}</div>
              {a.date && <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.muted, marginTop: SPACE.xs }}>{a.date}</div>}
              <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.red, marginTop: SPACE.xs }}>Artikel lesen →</div>
            </a>
          ))}
        </>
      )}

      <SectionDivider label="Datenquellen" />
      {dataSources.map((u, i) => (
        <div key={i} style={{ padding: `${SPACE.sm}px 0`, borderBottom: `1px solid ${c.border}` }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: c.ink, fontWeight: 500 }}>{u.source}</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: c.muted, marginTop: 2 }}>{u.desc}</div>
        </div>
      ))}

      <SectionDivider label="Methodische Hinweise" />
      <p style={{ fontFamily: FONTS.body, fontSize: 12, color: c.muted, lineHeight: 1.6 }}>
        Alle Werte stammen aus öffentlich zugänglichen, verifizierbaren Quellen.
        Zeitreihen können durch methodische Änderungen der Quellen Sprünge aufweisen.
        Bei Indikatoren wie Gini oder Korruption gilt: niedriger = besser.
      </p>
      <a href="https://respublica.media" target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONTS.mono, fontSize: 11, color: c.red, marginTop: SPACE.md, cursor: 'pointer', textDecoration: 'none' }}>
        Res.Publica besuchen <span>→</span>
      </a>
    </div>
  );
}

// ─── Tab strip ───────────────────────────────────── },
  { id: 'vergleich',   short: 'VERGLEICH' },
  { id: 'kontext',     short: 'KONTEXT' },
];

// ─── Main Country Console ─────────────────────────────────────────────────────
//
// PROPS (when ported to CountrySidebar.tsx):
//   iso3:               selected country code, null = global view
//   countryDetail:      full /api/world/country/:iso3 response
//   selectedRow:        active row from /api/world/map
//   activeIndicator:    { code, name, category, lowerIsBetter }
//   percentile:         0-100 from countryPercentileFromMapRows()
//   tradeData:          /api/world/trade/:iso3 response (lazy loaded when tab opened)
//   tradeLoading:       boolean
//   onLoadTrade:        callback to trigger trade fetch when handel tab opened
//   ranking:            /api/world/ranking response (for global view)
//   globalStats:        { median, mean, total } for global view
//   articles:           optional [{ title, url, date, tag }]
//   sheetLayout:        true on mobile (bottom sheet)
//   onClose:            callback for X button
//   onMinimize:         callback for ◁ button (sets dock to 32px strip)
//
window.CountryConsole = function CountryConsole({
  iso3,
  countryDetail,
  selectedRow,
  activeIndicator,
  percentile,
  tradeData,
  tradeLoading,
  onLoadTrade,
  ranking,
  globalStats,
  articles,
  sheetLayout = false,
  onClose,
  onMinimize,
  minimized = false,
}) {
  const { c } = useTheme();
  const [activeTab, setActiveTab] = useStateCS('uebersicht');

  const hasCountry = !!iso3;
  const lowerIsBetter = activeIndicator?.lowerIsBetter || false;

  // Lazy-load trade data when handel tab opened
  useEffectCS(() => {
    if (activeTab === 'handel' && hasCountry && !tradeData && !tradeLoading && onLoadTrade) {
      onLoadTrade(iso3);
    }
  }, [activeTab, hasCountry, iso3, tradeData, tradeLoading, onLoadTrade]);

  // Minimized strip (Desktop only)
  if (!sheetLayout && minimized) {
    return (
      <aside style={{
        width: 32, flexShrink: 0, background: c.cardBg,
        borderLeft: `1px solid ${c.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: `${SPACE.md}px 0`, cursor: 'pointer', gap: SPACE.md,
      }} onClick={() => onMinimize && onMinimize(false)} title="Console öffnen">
        <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: c.muted, writingMode: 'vertical-rl', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {iso3 || 'Welt'}
        </span>
        <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.muted }}>▸</span>
      </aside>
    );
  }

  // Body content
  const content = !hasCountry
    ? <GlobalView
        activeIndicatorLabel={activeIndicator?.name}
        ranking={ranking}
        stats={globalStats}
        totalCountries={globalStats?.total} />
    : (() => {
        switch (activeTab) {
          case 'uebersicht':  return <TabUebersicht countryDetail={countryDetail} selectedRow={selectedRow} activeIndicator={activeIndicator} percentile={percentile} lowerIsBetter={lowerIsBetter} />;
          case 'demokratie':  return <TabDemokratie countryDetail={countryDetail} />;
          case 'wirtschaft':  return <TabWirtschaft countryDetail={countryDetail} />;
          case 'handel':      return <TabHandel tradeData={tradeData} loading={tradeLoading} />;
          case 'vergleich':   return <TabVergleich countryDetail={countryDetail} />;
          case 'kontext':     return <TabKoryDetail={countryDetail} selectedRow={selectedRow} activeIndicator={activeIndicator} percentile={percentile} lowerIsBetter={lowerIsBetter} />;
        }
      })();

  const asideStyle = sheetLayout
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '56vh', maxHeight: '56vh',
        borderRadius: '14px 14px 0 0',
        background: c.cardBg, color: c.ink,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -6px 32px rgba(0,0,0,0.16)',
        zIndex: 200, overflow: 'hidden',
      }
    : {
        width: 320, flexShrink: 0, background: c.cardBg,
        borderLeft: `1px solid ${c.border}`,
        display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden',
      };

  // Country display name from detail
  const countryName = countryDetail?.country_name || iso3 || 'Weltkarte';
  const countryRegion = countryDetail?.region;
  const countryIncome = countryDetail?.income_level;

  return (
    <aside style={asideStyle}>
      {/* Sticky header */}
      <div style={{
        background: c.cardBg, borderBottom: `1px solid ${c.border}`,
        flexShrink: 0, zIndex: 2,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: `${SPACE.md}px ${SPACE.lg}px ${SPACE.sm}px`,
          gap: SPACE.sm,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{
              fontFamily: FONTS.display, fontWeight: 900,
              fontSize: hasCountry ? 20 : 16,
              color: c.ink, lineHeight: 1.1, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {countryName}<span style={{ color: c.red }}>.</span>
            </h2>
            {hasCountry && (countryRegion || countryIncome) && (
              <p style={{ fontFamily: FONTS.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.muted, margin: 0, marginTop: 2 }}>
                {[countryRegion, countryIncome].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: SPACE.xs, flexShrink: 0 }}>
            {!sheetLayout && onMinimize && (
              <button type="button" onClick={() => onMinimize(true)}
                style={{ width: 28, height: 28, border: `1px solid ${c.border}`, borderRadius: 4, background: 'transparent', color: c.muted, cursor: 'pointer', fontFamily: FONTS.mono, fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Minimieren"
              >◁</button>
            )}
            {onClose && (
              <button type="button" onClick={onClose}
                style={{ width: 28, height: 28, border: `1px solid ${c.border}`, borderRadius: 4, background: 'transparent', color: c.muted, cursor: 'pointer', fontFamily: FONTS.mono, fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Schließen"
              >✕</button>
            )}
          </div>
        </div>

        {/* Tab strip – only with country */}
        {hasCountry && (
          <div style={{
            display: 'flex', overflowX: 'auto', gap: 0,
            borderTop: `1px solid ${c.border}`,
            scrollbarWidth: 'none',
          }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={()ctiveTab(tab.id)}
                  style={{
                    flexShrink: 0, padding: `${SPACE.sm}px ${SPACE.md}px`,
                    border: 'none',
                    borderBottom: `2px solid ${active ? c.red : 'transparent'}`,
                    background: 'transparent',
                    color: active ? c.red : c.muted,
                    fontFamily: FONTS.mono, fontSize: 9,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}>
                  {tab.short}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, scrollbarWidth: 'thin' }}>
        {content}
      </div>
    </aside>
  );
};
