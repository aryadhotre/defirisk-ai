// src/pages/Landing.jsx
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Reveal from "../components/Reveal";
import Magnetic from "../components/Magnetic";

/* ---------- helpers ---------- */
const riskHex = (s) => (s <= 25 ? "#3FD98B" : s <= 50 ? "#F5B73E" : s <= 75 ? "#FF8350" : "#FF5D5D");

function useCountUp(target = 0, duration = 1400) {
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

/* ---------- animated risk topology (generic — no user data) ---------- */
const NODES = [
  { x: 270, y: 235, r: 30, risk: 34, label: "AGGREGATE", center: true },
  { x: 118, y: 116, r: 14, risk: 22, label: "LENDING" },
  { x: 432, y: 132, r: 16, risk: 49, label: "PERPS" },
  { x: 86, y: 300, r: 12, risk: 30, label: "STABLE" },
  { x: 452, y: 330, r: 15, risk: 63, label: "YIELD" },
  { x: 214, y: 408, r: 13, risk: 38, label: "DEX" },
  { x: 384, y: 414, r: 11, risk: 72, label: "BRIDGE" },
  { x: 156, y: 206, r: 10, risk: 18, label: "RWA" },
];
const EDGES = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 7], [2, 4], [5, 6]];

function RiskTopology() {
  return (
    <svg viewBox="0 0 540 480" className="w-full h-auto">
      {/* radar pulses from center */}
      {[0, 1, 2].map((k) => (
        <motion.circle key={`p${k}`} cx={270} cy={235} fill="none" stroke="rgba(255,178,61,0.35)" strokeWidth="1"
          initial={{ r: 34, opacity: 0.4 }} animate={{ r: [34, 168], opacity: [0.4, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeOut", delay: k * 1.13 }} />
      ))}

      {/* connections */}
      {EDGES.map(([a, b], i) => (
        <motion.line key={`e${i}`} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
          stroke="rgba(70,227,194,0.22)" strokeWidth="1" strokeDasharray="3 7"
          animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 1.4 + i * 0.12, repeat: Infinity, ease: "linear" }} />
      ))}

      {/* nodes */}
      {NODES.map((n, i) => {
        const col = riskHex(n.risk);
        return (
          <motion.g key={`n${i}`} animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}>
            <circle cx={n.x} cy={n.y} r={n.r + 9} fill={col} opacity="0.12" />
            <motion.circle cx={n.x} cy={n.y} r={n.r} fill={n.center ? "rgba(15,17,21,0.6)" : col} stroke={col}
              strokeWidth={n.center ? 2 : 1.5} opacity={n.center ? 1 : 0.9}
              animate={{ opacity: n.center ? 1 : [0.65, 1, 0.65] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }} />
            {n.center ? (
              <>
                <text x={n.x} y={n.y + 1} textAnchor="middle" style={{ fontSize: 16, fontWeight: 700, fill: "#ECEDEF", fontFamily: "JetBrains Mono, monospace" }}>{n.risk}</text>
                <text x={n.x} y={n.y + 14} textAnchor="middle" style={{ fontSize: 6.5, letterSpacing: "0.22em", fill: "#8A9099", fontFamily: "JetBrains Mono, monospace" }}>INDEX</text>
              </>
            ) : (
              <text x={n.x} y={n.y - n.r - 7} textAnchor="middle" style={{ fontSize: 8, letterSpacing: "0.14em", fill: "#8A9099", fontFamily: "JetBrains Mono, monospace" }}>{n.label}</text>
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}

const FEATURES = [
  ["01", "Protocol Intelligence", "Detects, classifies, and interprets DeFi protocol data in real time from raw on-chain metadata."],
  ["02", "Liquidity Analysis", "Tracks TVL flow, depth, and chain concentration to surface volatility triggers before they hit."],
  ["03", "Risk Computation", "Volatility, drawdown, concentration, and momentum resolve into one composite score — not manual estimates."],
];

const DIMENSIONS = [
  ["Volatility", "30-day standard deviation of TVL — how violently capital moves in and out.", 0.62, "#F5B73E"],
  ["Drawdown", "Peak-to-trough decline across the window — the worst-case capital flight.", 0.78, "#FF8350"],
  ["Liquidity", "Depth and concentration of TVL — whether positions can actually be exited.", 0.4, "#3FD98B"],
  ["Momentum", "Directional trend of flows across chains — where capital is heading next.", 0.55, "#46E3C2"],
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };

/* ---------- page ---------- */
export default function Landing() {
  const nProto = useCountUp(6000, 1600);
  const nChain = useCountUp(80, 1300);
  const nDim = useCountUp(4, 900);

  return (
    <div className="overflow-x-hidden">
      {/* ===== HERO ===== */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute animate-drift" style={{
            top: "-12%", right: "-10%", width: "62rem", height: "50rem", opacity: 0.5,
            background:
              "radial-gradient(38% 50% at 34% 34%, #FF4D8D, transparent 70%), radial-gradient(46% 52% at 70% 30%, #FFB23D, transparent 72%), radial-gradient(52% 56% at 50% 78%, #FF6A4D, transparent 74%)",
          }} />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 grid lg:grid-cols-[1fr_0.95fr] gap-16 items-center">
          {/* copy */}
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2.5 border border-line-strong rounded-full px-4 py-2 mb-8">
              <span className="live-dot" />
              <span className="label" style={{ fontSize: 11 }}>Onchain Risk Intelligence</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="font-display font-normal leading-[1.04] tracking-[-0.01em] text-[clamp(44px,5.6vw,76px)] text-ink">
              Risk intelligence for onchain finance.
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
              className="text-dim text-[17px] leading-relaxed mt-7 max-w-[520px]">
              DeFiRisk AI reads live on-chain metrics across thousands of protocols and 80+ chains — volatility, drawdown, liquidity, momentum — and resolves them into one real risk profile in seconds.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
              className="flex flex-wrap gap-4 mt-10">
              <Magnetic><Link to="/dashboard" className="btn btn-primary btn-lg">Launch Dashboard →</Link></Magnetic>
              <Magnetic><Link to="/docs" className="btn btn-ghost btn-lg">View API</Link></Magnetic>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="flex items-center gap-2 mt-11">
              <span className="font-mono text-faint" style={{ fontSize: 11, letterSpacing: ".1em" }}>POWERED BY</span>
              <span className="font-mono font-bold" style={{ fontSize: 12, letterSpacing: ".06em", color: "#FFB23D" }}>DEFILLAMA</span>
            </motion.div>
          </div>

          {/* animated risk topology */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="panel p-6 relative">
            <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="label flex items-center gap-2" style={{ fontSize: 10 }}><span className="live-dot" />Live · Risk Topology</span>
              <span className="font-mono text-faint" style={{ fontSize: 10, letterSpacing: ".1em" }}>4 DIMENSIONS</span>
            </div>
            <RiskTopology />
          </motion.div>
        </div>
      </section>

      {/* ===== CAPABILITY STRIP (generic) ===== */}
      <div className="border-y border-line">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-line">
          {[
            [`${Math.round(nProto).toLocaleString()}+`, "Protocols indexed"],
            [`${Math.round(nChain)}+`, "Chains covered"],
            [`${Math.round(nDim)}`, "Risk dimensions"],
            ["LIVE", "DeFiLlama feed"],
          ].map(([big, small], i) => (
            <div key={i} className="px-5 md:px-8 py-7">
              <div className="stat-num text-[clamp(24px,3vw,34px)] leading-none">{big}</div>
              <div className="label mt-2" style={{ fontSize: 10 }}>{small}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== WHAT IT DOES ===== */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Reveal>
          <div className="label mb-3">What it does</div>
          <h2 className="font-display font-normal text-[clamp(30px,4vw,46px)] leading-tight tracking-tight mb-12 max-w-[640px] text-ink">
            Intelligence that reads the chain, so you don't have to.
          </h2>
        </Reveal>
        <motion.div variants={{ show: { transition: { staggerChildren: 0.1 } } }} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map(([n, title, desc]) => (
            <motion.div key={n} variants={fadeUp} className="panel panel-hover p-7 group relative overflow-hidden">
              <span className="absolute top-0 left-0 right-0 h-[2px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                style={{ background: "linear-gradient(90deg,#FFB23D,#FF4D8D)" }} />
              <div className="font-mono text-faint text-sm mb-6 tracking-[0.2em]">{n}</div>
              <h3 className="font-display font-normal text-2xl mb-3 text-ink">{title}</h3>
              <p className="text-dim text-[14px] leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ===== WHAT IT MEASURES ===== */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <Reveal>
            <div className="label mb-3">What it measures</div>
            <h2 className="font-display font-normal text-[clamp(30px,4vw,46px)] leading-tight tracking-tight mb-3 max-w-[640px] text-ink">
              Four signals. One composite score.
            </h2>
            <p className="text-dim text-[15px] max-w-[560px] mb-12">Every protocol is scored across the dimensions that actually move capital — weighted, normalized, and recomputed continuously.</p>
          </Reveal>
          <motion.div variants={{ show: { transition: { staggerChildren: 0.08 } } }} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {DIMENSIONS.map(([name, desc, fill, col]) => (
              <motion.div key={name} variants={fadeUp} className="panel p-7">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="font-display font-normal text-2xl text-ink">{name}</h3>
                  <span className="stat-num text-sm" style={{ color: col }}>{Math.round(fill * 100)}</span>
                </div>
                <div className="rounded-full overflow-hidden mb-5" style={{ height: 5, background: "rgba(255,255,255,.07)" }}>
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} whileInView={{ width: `${fill * 100}%` }} viewport={{ once: true }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} style={{ background: col }} />
                </div>
                <p className="text-dim text-[14px] leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== CTA + FOOTER ===== */}
      <section className="relative overflow-hidden border-t border-line">
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute animate-drift" style={{
            bottom: "-60%", left: "50%", transform: "translateX(-50%)", width: "52rem", height: "32rem", opacity: 0.4,
            background: "radial-gradient(50% 50% at 50% 50%, #FF6A4D, transparent 70%), radial-gradient(40% 50% at 35% 40%, #FF4D8D, transparent 72%)",
          }} />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-28 text-center">
          <Reveal>
            <h2 className="font-display font-normal text-[clamp(34px,5vw,60px)] leading-tight tracking-tight text-ink">
              Start reading risk in real time.
            </h2>
            <div className="flex justify-center mt-8">
              <Magnetic><Link to="/dashboard" className="btn btn-primary btn-lg">Launch Dashboard →</Link></Magnetic>
            </div>
          </Reveal>
        </div>
        <div className="relative z-10 border-t border-line">
          <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between flex-wrap gap-3">
            <span className="font-mono text-faint" style={{ fontSize: 11, letterSpacing: ".12em" }}>DEFIRISK AI · ONCHAIN DATA PLATFORM</span>
            <span className="font-mono text-faint flex items-center gap-2" style={{ fontSize: 11, letterSpacing: ".1em" }}>
              <span className="live-dot" />SYSTEMS LIVE · v2.0.0
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}