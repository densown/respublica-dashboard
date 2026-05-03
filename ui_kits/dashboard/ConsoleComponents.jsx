/* global React, useTheme, FONTS, SPACE */
/* Reusable primitives for the Country Console */
const { useState: useStateCC, useEffect: useEffectCC, useRef: useRefCC } = React;

// ─── Mono label ──────────────────────────────────────────────────────────────
window.MonoLabel = function MonoLabel({ children, style }) {
  const { c } = useTheme();
  return (
    <span style={{
      display: 'block',
      fontFamily: FONTS.mono,
      fontSize: 9,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: c.muted,
      lineHeight: 1.2,
      ...style,
    }}>
      {children}
    </span>
  );
};

// ─── Section divider ─────────────────────────────────────────────────────────
window.SectionDivider = function SectionDivider({ label }) {
  const { c } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: `${SPACE.lg}px 0 ${SPACE.md}px` }}>
      <span style={{ fontFamily: FONTS.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.muted, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: c.border }} />
    </div>
  );
};

// ─── Info toggle (ⓘ popup) ───────────────────────────────────────────────────
window.InfoToggle = function InfoToggle({ text }) {
  const { c } = useTheme();
  const [open, setOpen] = useStateCC(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 4 }}>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: FONTS.mono, fontSize: 11, color: c.muted, padding: 0, lineHeight: 1,
      }}>ⓘ</button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
          background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 6,
          padding: `${SPACE.sm}px ${SPACE.md}px`, width: 220, zIndex: 20,
          fontFamily: FONTS.body, fontSize: 12, color: c.inkSoft, lineHeight: 1.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}>
          {text}
        </div>
      )}
    </span>
  );
};

// ─── Trend arrow ─────────────────────────────────────────────────────────────
window.TrendArrow = function TrendArrow({ value, inverted = false }) {
  const { c } = useTheme();
  if (value == null) return null;
  const positive = inverted ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.005;
  const color = neutral ? c.muted : positive ? c.yes : c.no;
  const arrow = neutral ? '→' : value > 0 ? '↑' : '↓';
  const pct = (Math.abs(value) * 100).toFixed(1);
  return (
    <span style={{ fontFamily: FONTS.mono, fontSize: 11, color, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {arrow} {pct}%
    </span>
  );
};

// ─── Sparkline with optional peak/trough markers ─────────────────────────────
window.Sparkline = function Sparkline({ data, color, height = 48, showMarkers = false, width = 260 }) {
  const { c } = useTheme();
  const col = color || c.red;
  if (!data || data.length < 2) return null;
  const vals = data.map(d => typeof d === 'object' ? d.v : d);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const W = width, H = height;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return { x, y, v };
  });
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const maxIdx = vals.indexOf(max), minIdx = vals.indexOf(min);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke={c.border} strokeWidth={1} />
      <polyline points={polyline} fill="none" stroke={col} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3} fill={col} />
      {showMarkers && (
        <>
          <circle cx={pts[maxIdx].x} cy={pts[maxIdx].y} r={3.5} fill="none" stroke={c.yes} strokeWidth={1.5} />
          <circle cx={pts[minIdx].x} cy={pts[minIdx].y} r={3.5} fill="none" stroke={c.no} strokeWidth={1.5} />
        </>
      )}
    </svg>
  );
};

// ─── Percentile bar ───────────────────────────────────────────────────────────
// "Deutschland ist besser als 74% aller Länder"
window.PercentileBar = function PercentileBar({ pct, label, inverted = false }) {
  const { c } = useTheme();
  const displayed = inverted ? 100 - pct : pct;
  const color = displayed > 66 ? c.yes : displayed > 33 ? c.red : c.no;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACE.xs }}>
        <MonoLabel>{label || 'Perzentil'}</MonoLabel>
        <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.ink, fontWeight: 500 }}>
          {Math.round(displayed)}. Pz.
        </span>
      </div>
      <div style={{ height: 6, background: c.bgHover, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${displayed}%`, background: color,
          borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <div style={{ marginTop: SPACE.xs, fontFamily: FONTS.body, fontSize: 11, color: c.muted, fontStyle: 'italic' }}>
        Besser als {Math.round(displayed)} % aller Länder
      </div>
    </div>
  );
};

// ─── Stat tile (KPI card) ─────────────────────────────────────────────────────
window.StatTile = function StatTile({ label, value, sub, icon }) {
  const { c } = useTheme();
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6,
      padding: `${SPACE.sm}px ${SPACE.md}px`, minWidth: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <MonoLabel>{label}</MonoLabel>
        {icon && <span style={{ color: c.subtle, fontSize: 11, fontFamily: FONTS.mono }}>{icon}</span>}
      </div>
      <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 20, color: c.ink, lineHeight: 1.1, marginTop: SPACE.xs }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
};

// ─── Horizontal bar row ──────────────────────────────────────────────────────
window.HBar = function HBar({ label, value, max, formatted, color, icon }) {
  const { c } = useTheme();
  const col = color || c.red;
  return (
    <div style={{ marginBottom: SPACE.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.xs }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, minWidth: 0, flex: 1 }}>
          {icon && <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>}
          <span style={{ fontFamily: FONTS.body, fontSize: 13, color: c.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        </div>
        <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.muted, flexShrink: 0, marginLeft: SPACE.sm }}>
          {formatted}
        </span>
      </div>
      <div style={{ height: 5, background: c.bgHover, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${Math.min(100, (value / max) * 100)}%`,
          background: col, borderRadius: 2,
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
};

// ─── Line chart (SVG, single series) ─────────────────────────────────────────
window.LineChart = function LineChart({ data, color, yLabel, height = 100, showArea = true, annotations = [] }) {
  const { c } = useTheme();
  const col = color || c.red;
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.v);
  const years = data.map(d => d.y);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const W = 260, H = height;
  const toX = i => (i / (data.length - 1)) * W;
  const toY = v => H - 4 - ((v - min) / range) * (H - 12);
  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.v).toFixed(1)}`).join(' ');
  const areaBottom = `${toX(data.length - 1)},${H} 0,${H}`;
  const firstY = years[0], lastY = years[years.length - 1];
  const minY = Math.min(...vals), maxY = Math.max(...vals);
  return (
    <div>
      {yLabel && <MonoLabel style={{ marginBottom: SPACE.xs }}>{yLabel}</MonoLabel>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
        {/* Area fill */}
        {showArea && (
          <polygon
            points={`0,${toY(data[0].v)} ${pts} ${areaBottom}`}
            fill={col} fillOpacity={0.07}
          />
        )}
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f}
            x1={0} y1={toY(min + range * f)} x2={W} y2={toY(min + range * f)}
            stroke={c.border} strokeWidth={0.5} strokeDasharray="3 3"
          />
        ))}
        {/* Line */}
        <polyline points={pts} fill="none" stroke={col} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        <circle cx={toX(data.length - 1)} cy={toY(vals[vals.length - 1])} r={3} fill={col} />
        {/* Annotations (vertical event lines) */}
        {annotations.map((a, i) => {
          const idx = data.findIndex(d => d.y >= a.year);
          if (idx < 0) return null;
          const x = toX(idx);
          return (
            <g key={i}>
              <line x1={x} y1={0} x2={x} y2={H} stroke={c.subtle} strokeWidth={1} strokeDasharray="2 2" />
              <text x={x + 3} y={10} fontFamily={FONTS.mono} fontSize={8} fill={c.muted}>{a.label}</text>
            </g>
          );
        })}
        {/* X axis labels */}
        <text x={0} y={H + 12} fontFamily={FONTS.mono} fontSize={8} fill={c.muted}>{firstY}</text>
        <text x={W} y={H + 12} fontFamily={FONTS.mono} fontSize={8} fill={c.muted} textAnchor="end">{lastY}</text>
      </svg>
    </div>
  );
};

// ─── Radar chart (SVG, 6 axes) ───────────────────────────────────────────────
window.RadarChart = function RadarChart({ axes, color }) {
  const { c } = useTheme();
  const col = color || c.red;
  const N = axes.length;
  const CX = 120, CY = 100, R = 72;
  const angle = i => (i / N) * 2 * Math.PI - Math.PI / 2;
  cons <circle key={i} cx={p.x} cy={p.y} r={3} fill={col} />
      ))}
      {/* Labels */}
      {axes.map((a, i) => {
        const lp = pt(R + 18, i);
        return (
          <text key={i} x={lp.x} y={lp.y}
            textAnchor="middle" dominantBaseline="middle"
            fontFamily={FONTS.mono} fontSize={8.5} fill={c.muted} letterSpacing="0.06em"
          >
            {a.label.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
};

// ─── Comparison bar (Land vs Region vs Welt) ─────────────────────────────────
window.CompareBar = function CompareBar({ label, countryVal, regionVal, worldVal, fmt, inverted = false }) {
  const { c } = useTheme();
  const items = [
    { l: 'Land', v: countryVal, col: c.red },
    { l: 'Region', v: regionVal, col: c.inkSoft },
    { l: 'Welt', v: worldVal, col: c.subtle },
  ];
  const max = Math.max(...items.map(x => x.v));
  return (
    <div style={{ marginBottom: SPACE.lg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: SPACE.sm }}>
        <span style={{ fontFamily: FONTS.body, fontSize: 13, color: c.ink, fontWeight: 600 }}>{label}</span>
      </div>
      {items.map(item => (
        <div key={item.l} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px', gap: SPACE.sm, alignItems: 'center', marginBottom: SPACE.xs }}>
          <MonoLabel style={{ margin: 0 }}>{item.l}</MonoLabel>
          <div style={{ height: 8, background: c.bgHover, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(item.v / max) * 100}%`, background: item.col, borderRadius: 2 }} />
          </div>
          <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.ink, textAlign: 'right' }}>{fmt(item.v)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Trade balance bar ────────────────────────────────────────────────────────
window.TradeBalance = function TradeBalance({ exports, imports, currency = 'Mrd. $' }) {
  const { c } = useTheme();
  const total = exports + imports;
  const expPct = (exports / total) * 100;
  const impPct = (imports / total) * 100;
  const balance = exports - imports;
  return (
    <div>
      <div style={{ display: 'flex', height: 20, borderRadius: 3, overflow: 'hidden', marginBottom: SPACE.sm }}>
        <div style={{ width: `${expPct}%`, background: c.yes, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: '#fff', letterSpacing: '0.06em' }}>EXP</span>
        </div>
        <div style={{ width: `${impPct}%`, background: c.no, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: '#fff', letterSpacing: '0.06em' }}>IMP</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONTS.mono, fontSize: 11 }}>
        <span style={{ color: c.yes }}>Exporte: {exports} {currency}</span>
        <span style={{ color: balance >= 0 ? c.yes : c.no }}>
          {balance >= 0 ? '+' : ''}{balance} {currency}
        </span>
        <span style={{ color: c.no }}>Importe: {imports} {currency}</span>
      </div>
    </div>
  );
};
