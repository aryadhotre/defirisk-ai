// src/pages/Analytics.jsx
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3 } from "lucide-react";
import { authFetch } from "../lib/api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://defirisk-ai-backend.onrender.com";

const fmtTVL = (value) => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${(value ?? 0).toFixed(2)}`;
};
const riskHex = (s) => (s <= 25 ? "#3FD98B" : s <= 50 ? "#F5B73E" : s <= 75 ? "#FF8350" : "#FF5D5D");
const fmtPct = (v) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);

function Spark({ points, color = "#46E3C2", w = 96, h = 30 }) {
  if (!points || points.length < 2) return <span className="text-faint">—</span>;
  const pad = 2, mn = Math.min(...points), mx = Math.max(...points), rg = mx - mn || 1;
  const pts = points.map((v, i) => [pad + (i / (points.length - 1)) * (w - pad * 2), h - pad - ((v - mn) / rg) * (h - pad * 2)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  const id = `as-${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} className="block">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TVLAnalytics() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [timeframe, setTimeframe] = useState(30);
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    loadProjects();
    loadTrends();
  }, []);

  useEffect(() => {
    if (selectedProject) loadHistory(selectedProject.id);
  }, [selectedProject, timeframe]);

  const loadProjects = async () => {
    try {
      const res = await authFetch(`${API_BASE}/defi/projects`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setProjects(list);
      if (list.length > 0) setSelectedProject(list[0]);
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      const res = await authFetch(`${API_BASE}/analytics/trends?days=7`);
      const data = await res.json();
      setTrends(data.trends || []);
    } catch (err) {
      console.error("Error loading trends:", err);
    }
  };

  const loadHistory = async (projectId) => {
    try {
      const res = await authFetch(`${API_BASE}/analytics/history/${projectId}?days=${timeframe}`);
      const data = await res.json();
      const chartData = (data.history || []).map((h) => ({
        date: new Date(h.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        tvl: h.tvl / 1000000,
        fullDate: h.timestamp,
      }));
      setHistoryData(chartData);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  const sparkFor = (p) =>
    p.tvl_sparkline ?? Array.from({ length: 8 }, (_, i) => 50 + ((p.change_7d ?? 0) < 0 ? -1 : 1) * i * 1.6 + Math.sin(i * 1.2 + (p.id || 0)) * 4);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="font-mono text-dim text-sm tracking-wide">LOADING ANALYTICS…</div>
      </div>
    );
  }

  const avgRisk = projects.length > 0 ? (projects.reduce((s, p) => s + (p.risk_score || 0), 0) / projects.length).toFixed(1) : "0";
  const totalTVL = projects.reduce((s, p) => s + (p.total_value_locked || 0), 0);

  return (
    <div className="space-y-10">
      {/* header */}
      <div>
        <div className="label mb-3"><span className="live-dot mr-2" />Analytics</div>
        <h1 className="font-display text-[clamp(34px,5vw,52px)] leading-none tracking-tight">Protocol Analytics</h1>
        <p className="text-dim text-sm mt-3">Track TVL movements and market performance across tracked protocols.</p>
      </div>

      {/* overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { icon: DollarSign, label: "Total Market TVL", value: fmtTVL(totalTVL), col: "#ECEDEF" },
          { icon: Activity, label: "Tracked Protocols", value: projects.length, col: "#ECEDEF" },
          { icon: BarChart3, label: "Average Risk Score", value: avgRisk, col: riskHex(Number(avgRisk)) },
        ].map((c) => (
          <div key={c.label} className="panel panel-hover p-6">
            <div className="label flex items-center gap-2" style={{ fontSize: 10 }}><c.icon className="w-3.5 h-3.5" />{c.label}</div>
            <div className="stat-num text-[34px] leading-none mt-3" style={{ color: c.col }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* chart */}
      <div className="panel p-6 relative">
        <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <select
              value={selectedProject?.id || ""}
              onChange={(e) => setSelectedProject(projects.find((p) => p.id === parseInt(e.target.value)))}
              className="bg-canvas border border-line rounded-lg px-4 py-2.5 text-ink font-mono text-sm outline-none focus:border-[#FFB23D]/50 cursor-pointer"
            >
              {projects.map((p) => <option key={p.id} value={p.id} style={{ background: "#0E1116" }}>{p.name}</option>)}
            </select>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(parseInt(e.target.value))}
              className="bg-canvas border border-line rounded-lg px-4 py-2.5 text-ink font-mono text-sm outline-none focus:border-[#FFB23D]/50 cursor-pointer"
            >
              {[7, 14, 30, 90].map((d) => <option key={d} value={d} style={{ background: "#0E1116" }}>{d} days</option>)}
            </select>
          </div>
          {selectedProject && (
            <div className="text-right">
              <div className="label" style={{ fontSize: 10 }}>Current TVL</div>
              <div className="stat-num text-2xl mt-1">{fmtTVL(selectedProject.total_value_locked)}</div>
            </div>
          )}
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="tvlFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#46E3C2" stopOpacity=".25" />
                  <stop offset="1" stopColor="#46E3C2" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
              <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} tickFormatter={(v) => `$${v.toFixed(0)}M`} />
              <Tooltip
                contentStyle={{ background: "#0E1116", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#ECEDEF", fontFamily: "JetBrains Mono", fontSize: 12 }}
                labelStyle={{ color: "#8A9099" }}
                formatter={(v) => [`$${v.toFixed(2)}M`, "TVL"]}
              />
              <Area type="monotone" dataKey="tvl" stroke="#46E3C2" strokeWidth={2} fill="url(#tvlFill)" dot={false} activeDot={{ r: 4, fill: "#46E3C2" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* performance */}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="label">Protocol Performance</div>
          <span className="font-mono text-faint text-xs">{projects.length} tracked</span>
        </div>
        <div className="border-t border-line">
          {projects.map((p) => {
            const down = (p.change_7d ?? 0) < 0;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p)}
                className="group flex items-center justify-between px-6 py-4 border-b border-line last:border-0 cursor-pointer transition-colors hover:bg-white/[0.02] relative"
              >
                <span className="absolute left-0 top-0 bottom-0 w-[2px] origin-top scale-y-0 group-hover:scale-y-100 transition-transform" style={{ background: "linear-gradient(#FFB23D,#FF4D8D)" }} />
                <div className="min-w-0">
                  <div className="text-ink font-medium">{p.name}</div>
                  <div className="label mt-0.5" style={{ fontSize: 10 }}>{p.protocol_type}</div>
                </div>
                <div className="flex items-center gap-7">
                  <div className="hidden md:block"><Spark points={sparkFor(p)} /></div>
                  <div className="text-right">
                    <div className="stat-num text-[15px]">{fmtTVL(p.total_value_locked)}</div>
                    <div className="label" style={{ fontSize: 9 }}>TVL</div>
                  </div>
                  <div className="text-right min-w-[78px]">
                    <div className="stat-num text-sm flex items-center justify-end gap-1" style={{ color: down ? "#FF5D5D" : p.change_7d > 0 ? "#3FD98B" : "#8A9099" }}>
                      {down ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}{fmtPct(p.change_7d)}
                    </div>
                    <div className="label" style={{ fontSize: 9 }}>7D TVL</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="stat-num text-sm">{p.tvl_volatility?.toFixed(1) ?? "—"}%</div>
                    <div className="label" style={{ fontSize: 9 }}>Vol</div>
                  </div>
                  <div className="text-right">
                    <div className="stat-num text-[15px]" style={{ color: riskHex(p.risk_score) }}>{p.risk_score?.toFixed(1)}</div>
                    <div className="label" style={{ fontSize: 9 }}>Risk</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}