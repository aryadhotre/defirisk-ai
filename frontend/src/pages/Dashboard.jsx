// src/pages/Dashboard.jsx
// DeFiRisk AI — Arkham × Dune. Same props/contract as before: { projects, loadingList, kpis }.
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

/* ----------------------------- helpers ----------------------------- */
const fmtCompact = (n) => {
  if (n == null) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtFull = (n) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`);
const fmtPct = (v) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);

// 4-band risk color (≤25 low → ≤50 med → ≤75 high → critical)
const riskHex = (s) => (s <= 25 ? "#3FD98B" : s <= 50 ? "#F5B73E" : s <= 75 ? "#FF8350" : "#FF5D5D");
const riskBand = (s) => (s <= 25 ? "Low" : s <= 50 ? "Medium" : s <= 75 ? "High" : "Critical");

const LEVEL_STYLE = {
  Low: { color: "#3FD98B", bg: "rgba(63,217,139,.10)", border: "rgba(63,217,139,.25)" },
  Medium: { color: "#F5B73E", bg: "rgba(245,183,62,.10)", border: "rgba(245,183,62,.25)" },
  High: { color: "#FF8350", bg: "rgba(255,131,80,.10)", border: "rgba(255,131,80,.25)" },
  Critical: { color: "#FF5D5D", bg: "rgba(255,93,93,.10)", border: "rgba(255,93,93,.25)" },
};

/* count-up that respects reduced-motion */
function useCountUp(target = 0, duration = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let raf, start;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setV(ease(p) * target);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

/* sparkline — uses real series if your payload has p.tvl_sparkline; else a directional glyph */
function Spark({ points, color = "#46E3C2", w = 72, h = 26 }) {
  if (!points || points.length < 2) return <span className="text-faint">—</span>;
  const pad = 2;
  const mn = Math.min(...points), mx = Math.max(...points), rg = mx - mn || 1;
  const pts = points.map((val, i) => [
    pad + (i / (points.length - 1)) * (w - pad * 2),
    h - pad - ((val - mn) / rg) * (h - pad * 2),
  ]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  const id = `sg-${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} className="block">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".26" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* 270° risk arc gauge */
function RiskArc({ score = 0, size = 132, stroke = 9 }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 80);
    return () => clearTimeout(t);
  }, []);
  const r = (size - stroke) / 2 - 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const track = circ * 0.75; // 270°
  const gap = circ - track;
  const frac = Math.max(0, Math.min(1, score / 55)); // visual ceiling
  const filled = track * frac;
  const col = riskHex(score);
  const display = useCountUp(score, 1200);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(135deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${track} ${gap}`} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${on ? filled : 0} ${circ}`}
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-num text-[34px] leading-none" style={{ color: col }}>{display.toFixed(1)}</span>
        <span className="font-mono uppercase mt-1.5" style={{ fontSize: 10, letterSpacing: ".18em", color: col }}>
          {riskBand(score)}
        </span>
      </div>
    </div>
  );
}

/* stagger variants */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

const COLS = "44px minmax(180px,2.2fr) 1fr .9fr .9fr 1.1fr .9fr 60px";

/* ----------------------------- page ----------------------------- */
export default function Dashboard({ projects = [], loadingList = false, kpis = {} }) {
  const [selected, setSelected] = useState(null);

  const tvl = useCountUp(kpis.tvl ?? 0, 1300);
  const avg = kpis.avgRisk ?? 0;
  const count = useCountUp(kpis.count ?? 0, 900);

  const sparkFor = (p) =>
    p.tvl_sparkline ??
    // placeholder trend glyph: direction reflects real change_7d, intermediate points illustrative
    Array.from({ length: 8 }, (_, i) =>
      50 + (Number(p.change_7d ?? 0) < 0 ? -1 : 1) * i * 1.7 + Math.sin(i * 1.3 + (p.id || 0)) * 4
    );

  return (
    <div className="relative space-y-12">

      {/* ---------- header ---------- */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <div className="label mb-3"><span className="live-dot mr-2" />Overview · Live</div>
        <h1 className="font-display text-[clamp(38px,5vw,60px)] leading-[0.98] tracking-tight">Dashboard</h1>
        <p className="text-dim mt-2 text-sm">Risk profiles computed continuously from real on-chain metrics.</p>
      </motion.div>

      {/* ---------- focal hero: asymmetric ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-5"
      >
        {/* portfolio TVL — the focal point */}
        <div className="panel p-7 overflow-hidden">
          <div className="absolute inset-0 rounded-panel overflow-hidden pointer-events-none">
            <div className="absolute -right-12 -top-14 w-64 h-64 rounded-full blur-3xl opacity-50"
              style={{ background: "radial-gradient(circle,#FF4D8D,transparent 70%)" }} />
            <div className="absolute -right-2 top-10 w-52 h-52 rounded-full blur-3xl opacity-40"
              style={{ background: "radial-gradient(circle,#FFB23D,transparent 70%)" }} />
          </div>
          <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
          <div className="relative">
            <div className="label">Total Value Locked</div>
            <div className="stat-num text-[clamp(40px,6vw,68px)] leading-none mt-3">{fmtCompact(tvl)}</div>
            <div className="font-mono text-faint text-xs mt-2 tnum">{fmtFull(kpis.tvl)}</div>
            <div className="flex gap-6 mt-7 pt-5 border-t border-line">
              <div>
                <div className="stat-num text-xl">{Math.round(count)}</div>
                <div className="label mt-1" style={{ fontSize: 10 }}>Protocols</div>
              </div>
              <div>
                <div className="stat-num text-xl" style={{ color: riskHex(avg) }}>{avg.toFixed(1)}</div>
                <div className="label mt-1" style={{ fontSize: 10 }}>Avg Risk</div>
              </div>
              <div className="flex items-end">
                <span className="font-mono text-accent" style={{ fontSize: 11, letterSpacing: ".14em" }}>
                  <span className="live-dot mr-2" />SYNCED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* risk index gauge */}
        <div className="panel panel-hover p-7 flex flex-col items-center justify-center">
          <div className="label self-start mb-2">Risk Index</div>
          <RiskArc score={avg} />
          <div className="text-dim text-xs mt-3 text-center max-w-[200px]">Portfolio-weighted across {kpis.count ?? 0} tracked protocols</div>
        </div>
      </motion.div>

      {/* ---------- protocol table ---------- */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="panel overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="label">Protocols</div>
          <span className="font-mono text-faint text-xs">{projects.length} tracked</span>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: 760 }}>
            {/* head */}
            <div className="grid items-center px-6 py-3 border-y border-line" style={{ gridTemplateColumns: COLS }}>
              <div className="label">#</div>
              <div className="label">Protocol</div>
              <div className="label text-right">TVL</div>
              <div className="label text-right">7D</div>
              <div className="label text-right">Trend</div>
              <div className="label text-right">Risk</div>
              <div className="label text-right">Level</div>
              <div />
            </div>

            {/* body */}
            {loadingList ? (
              <div className="px-6 py-6 text-dim font-mono text-sm">Loading…</div>
            ) : projects.length === 0 ? (
              <div className="px-6 py-8 text-dim text-sm">No protocols yet — add one from <span className="text-heat font-medium">Risk Analysis</span>.</div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show">
                {projects.map((p, i) => {
                  const open = selected?.id === p.id;
                  const lvl = LEVEL_STYLE[p.risk_level] || LEVEL_STYLE.Medium;
                  const down = Number(p.change_7d ?? 0) < 0;
                  return (
                    <motion.div
                      key={p.id} variants={item}
                      onClick={() => setSelected(open ? null : p)}
                      className="group grid items-center px-6 py-4 border-b border-line cursor-pointer relative transition-colors"
                      style={{ gridTemplateColumns: COLS }}
                      whileHover={{ backgroundColor: "rgba(255,255,255,.025)" }}
                    >
                      {/* hover heat bar */}
                      <span className="absolute left-0 top-0 bottom-0 w-[2px] origin-top scale-y-0 group-hover:scale-y-100 transition-transform"
                        style={{ background: "linear-gradient(#FFB23D,#FF4D8D)" }} />
                      <div className="font-mono text-faint text-xs">{String(i + 1).padStart(2, "0")}</div>
                      <div>
                        <div className="text-ink font-medium">{p.name}</div>
                        <div className="label mt-0.5" style={{ fontSize: 10 }}>{p.protocol_type}</div>
                      </div>
                      <div className="stat-num text-right text-[15px]">{fmtCompact(p.total_value_locked)}</div>
                      <div className="stat-num text-right text-[14px]" style={{ color: down ? "#FF5D5D" : p.change_7d > 0 ? "#3FD98B" : "#8A9099" }}>
                        {down ? "↓ " : p.change_7d > 0 ? "↑ " : ""}{fmtPct(p.change_7d)}
                      </div>
                      <div className="flex justify-end"><Spark points={sparkFor(p)} /></div>
                      <div className="flex items-center justify-end gap-3">
                        <span className="rounded-[3px] overflow-hidden" style={{ width: 44, height: 4, background: "rgba(255,255,255,.08)" }}>
                          <span className="block h-full" style={{ width: `${Math.min(100, p.risk_score)}%`, background: riskHex(p.risk_score) }} />
                        </span>
                        <span className="stat-num text-[15px]" style={{ minWidth: 34, textAlign: "right", color: riskHex(p.risk_score) }}>{p.risk_score}</span>
                      </div>
                      <div className="flex justify-end">
                        <span className="risk-chip" style={{ color: lvl.color, background: lvl.bg, borderColor: lvl.border }}>{p.risk_level || "N/A"}</span>
                      </div>
                      <div className="flex justify-end">
                        <span className="font-mono text-faint group-hover:text-accent transition-colors" style={{ fontSize: 11, letterSpacing: ".1em" }}>
                          {open ? "−" : "→"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ---------- detail panel ---------- */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="panel p-7 space-y-7"
        >
          <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
          <div className="flex items-center justify-between">
            <div>
              <div className="label"><span className="live-dot mr-2" />Risk Profile</div>
              <h3 className="font-display text-3xl mt-1">{selected.name}</h3>
            </div>
            <span className="risk-chip" style={{ ...{ color: (LEVEL_STYLE[selected.risk_level] || LEVEL_STYLE.Medium).color, background: (LEVEL_STYLE[selected.risk_level] || LEVEL_STYLE.Medium).bg, borderColor: (LEVEL_STYLE[selected.risk_level] || LEVEL_STYLE.Medium).border } }}>
              {selected.risk_level}
            </span>
          </div>

          {/* live signals */}
          <div>
            <div className="label mb-3">Live Signals</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: "TVL Volatility · 30D", v: selected.tvl_volatility != null ? `${selected.tvl_volatility.toFixed(2)}%` : "—", c: "#ECEDEF" },
                { l: "Max Drawdown · 30D", v: selected.max_drawdown != null ? `${selected.max_drawdown.toFixed(2)}%` : "—", c: "#FF8350" },
                { l: "30D Change", v: fmtPct(selected.change_30d), c: Number(selected.change_30d ?? 0) < 0 ? "#FF5D5D" : "#3FD98B" },
                { l: "Chain Concentration", v: selected.top_chain_share != null ? `${selected.top_chain_share.toFixed(0)}%` : "—", c: "#ECEDEF", sub: selected.top_chain ? `${selected.top_chain} · ${selected.chain_count} chains` : null },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-line bg-panel-2/60 p-4">
                  <div className="label" style={{ fontSize: 10 }}>{s.l}</div>
                  <div className="stat-num text-2xl mt-1.5" style={{ color: s.c }}>{s.v}</div>
                  {s.sub && <div className="text-faint text-[11px] mt-1">{s.sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* breakdown bars */}
          {selected.risk_breakdown && (
            <div>
              <div className="label mb-3">Risk Breakdown</div>
              <div className="space-y-3">
                {[
                  { l: "Smart Contract", w: "30%", v: selected.risk_breakdown.smart_contract_risk, note: "Audit status · TVL-at-risk" },
                  { l: "Liquidity", w: "25%", v: selected.risk_breakdown.liquidity_risk, note: "TVL depth · volatility · concentration" },
                  { l: "Financial", w: "25%", v: selected.risk_breakdown.financial_risk, note: "Volatility · drawdown · valuation" },
                  { l: "Operational", w: "20%", v: selected.risk_breakdown.operational_risk, note: "Chain concentration · TVL trend" },
                ].map((b) => (
                  <div key={b.l} className="grid items-center gap-4" style={{ gridTemplateColumns: "200px 1fr 48px" }}>
                    <div>
                      <span className="font-mono text-ink text-sm">{b.l}</span>
                      <span className="font-mono text-faint ml-2" style={{ fontSize: 10 }}>{b.w}</span>
                      <div className="text-faint text-[11px] mt-0.5">{b.note}</div>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,.07)" }}>
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(100, b.v)}%` }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} style={{ background: riskHex(b.v) }} />
                    </div>
                    <span className="stat-num text-right" style={{ color: riskHex(b.v) }}>{b.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}