// src/pages/SavedProjects.jsx
import { useState, useEffect } from "react";
import { Trash2, AlertCircle, CheckCircle, Trash, TrendingUp, TrendingDown, Activity, Layers } from "lucide-react";
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
const LEVEL = { Low: "#3FD98B", Medium: "#F5B73E", High: "#FF8350", Critical: "#FF5D5D" };
const levelStyle = (lvl) => { const c = LEVEL[lvl] || LEVEL.Medium; return { color: c, background: `${c}1a`, borderColor: `${c}40` }; };

function RiskArc({ score = 0, size = 92, stroke = 7 }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 120); return () => clearTimeout(t); }, []);
  const r = (size - stroke) / 2 - 2, c = size / 2, circ = 2 * Math.PI * r, track = circ * 0.75, gap = circ - track;
  const filled = track * Math.max(0, Math.min(1, score / 55)), col = riskHex(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(135deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${track} ${gap}`} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${on ? filled : 0} ${circ}`} style={{ transition: "stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="stat-num text-lg" style={{ color: col }}>{Number(score ?? 0).toFixed(1)}</span>
      </div>
    </div>
  );
}

export default function SavedProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/defi/projects`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading projects:", err);
      showNotification("Failed to load protocols", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId, projectName) => {
    setDeleting(projectId);
    try {
      const res = await authFetch(`${API_BASE}/defi/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await res.json();
      setProjects(projects.filter((p) => p.id !== projectId));
      showNotification(`Successfully deleted ${projectName}`, "success");
      setShowConfirm(null);
    } catch (err) {
      console.error("Error deleting project:", err);
      showNotification("Failed to delete protocol", "error");
    } finally {
      setDeleting(null);
    }
  };

  const deleteAllProjects = async () => {
    setDeleting("all");
    try {
      const projectIds = projects.map((p) => p.id);
      const res = await authFetch(`${API_BASE}/defi/projects/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_ids: projectIds }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      const data = await res.json();
      setProjects([]);
      showNotification(`Successfully deleted all ${data.deleted_projects.length} protocols`, "success");
      setShowDeleteAll(false);
    } catch (err) {
      console.error("Error deleting all projects:", err);
      showNotification("Failed to delete all protocols", "error");
    } finally {
      setDeleting(null);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="font-mono text-dim text-sm tracking-wide">LOADING PROTOCOLS…</div>
      </div>
    );
  }

  const totalTVL = projects.reduce((s, p) => s + (p.total_value_locked || 0), 0);
  const avgRisk = projects.length > 0 ? (projects.reduce((s, p) => s + (p.risk_score || 0), 0) / projects.length).toFixed(1) : "0";

  return (
    <div className="space-y-10">
      {/* toast */}
      {notification && (
        <div
          className="fixed top-24 right-6 z-50 px-5 py-4 rounded-xl border backdrop-blur-xl flex items-center gap-3"
          style={notification.type === "success"
            ? { color: "#3FD98B", background: "rgba(63,217,139,.12)", borderColor: "rgba(63,217,139,.3)" }
            : { color: "#FF5D5D", background: "rgba(255,93,93,.12)", borderColor: "rgba(255,93,93,.3)" }}
        >
          {notification.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-mono text-sm">{notification.message}</span>
        </div>
      )}

      {/* delete-all modal */}
      {showDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(7,8,10,.72)", backdropFilter: "blur(6px)" }}>
          <div className="panel p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,93,93,.12)" }}>
              <Trash className="w-8 h-8" style={{ color: "#FF5D5D" }} />
            </div>
            <h3 className="font-display text-2xl text-ink mb-2">Delete All Protocols?</h3>
            <p className="text-dim text-sm mb-6">This permanently deletes all {projects.length} protocols and their historical data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteAll(false)} disabled={deleting === "all"} className="btn btn-ghost btn-sm flex-1 justify-center">Cancel</button>
              <button onClick={deleteAllProjects} disabled={deleting === "all"} className="btn btn-sm flex-1 justify-center" style={{ color: "#fff", background: "#FF5D5D" }}>
                {deleting === "all" ? "Deleting…" : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="label mb-3"><span className="live-dot mr-2" />Saved</div>
          <h1 className="font-display text-[clamp(34px,5vw,52px)] leading-none tracking-tight">Saved Projects</h1>
          <p className="text-dim text-sm mt-3">Live risk profiles computed from real on-chain metrics.</p>
        </div>
        {projects.length > 0 && (
          <button
            onClick={() => setShowDeleteAll(true)}
            className="btn btn-sm"
            style={{ color: "#FF5D5D", border: "1px solid rgba(255,93,93,.25)", background: "rgba(255,93,93,.08)" }}
          >
            <Trash className="w-4 h-4" />Delete All
          </button>
        )}
      </div>

      {/* stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="panel p-6"><div className="label" style={{ fontSize: 10 }}>Total Protocols</div><div className="stat-num text-[34px] leading-none mt-3">{projects.length}</div></div>
        <div className="panel p-6"><div className="label" style={{ fontSize: 10 }}>Total TVL</div><div className="stat-num text-[34px] leading-none mt-3">{fmtTVL(totalTVL)}</div></div>
        <div className="panel p-6"><div className="label" style={{ fontSize: 10 }}>Average Risk</div><div className="stat-num text-[34px] leading-none mt-3" style={{ color: riskHex(Number(avgRisk)) }}>{avgRisk}</div></div>
      </div>

      {/* cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {projects.map((project) => (
          <div key={project.id} className="panel panel-hover p-6 relative">
            <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />

            {showConfirm === project.id && (
              <div className="absolute inset-0 rounded-panel flex items-center justify-center z-10 p-6" style={{ background: "rgba(7,8,10,.92)", backdropFilter: "blur(4px)" }}>
                <div className="text-center">
                  <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: "#FF5D5D" }} />
                  <h3 className="font-display text-xl text-ink mb-2">Delete {project.name}?</h3>
                  <p className="text-dim text-sm mb-6">This removes all historical data for this protocol.</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setShowConfirm(null)} className="btn btn-ghost btn-sm">Cancel</button>
                    <button onClick={() => deleteProject(project.id, project.name)} disabled={deleting === project.id} className="btn btn-sm" style={{ color: "#fff", background: "#FF5D5D" }}>
                      {deleting === project.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-5">
              {/* header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-2xl text-ink leading-none">{project.name}</h3>
                  <div className="label mt-1.5" style={{ fontSize: 10 }}>{project.protocol_type}</div>
                </div>
                <span className="risk-chip" style={levelStyle(project.risk_level)}>{project.risk_level}</span>
              </div>

              {/* gauge + tvl */}
              <div className="flex items-center gap-5">
                <RiskArc score={project.risk_score ?? 0} />
                <div className="flex-1">
                  <div className="label" style={{ fontSize: 10 }}>Total Value Locked</div>
                  <div className="stat-num text-2xl mt-1">{fmtTVL(project.total_value_locked)}</div>
                  <div className="label mt-3" style={{ fontSize: 10 }}>Audit</div>
                  <div className="stat-num text-sm mt-1" style={{ color: project.audit_status === "Audited" ? "#3FD98B" : "#FF8350" }}>{project.audit_status}</div>
                </div>
              </div>

              {/* signals */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Activity, label: "Volatility", value: project.tvl_volatility != null ? `${project.tvl_volatility.toFixed(1)}%` : "—", col: "#46E3C2" },
                  { icon: TrendingDown, label: "Max Drawdown", value: project.max_drawdown != null ? `${project.max_drawdown.toFixed(1)}%` : "—", col: "#FF8350" },
                  { icon: (project.change_7d ?? 0) >= 0 ? TrendingUp : TrendingDown, label: "7D Change", value: fmtPct(project.change_7d), col: (project.change_7d ?? 0) < 0 ? "#FF5D5D" : "#3FD98B" },
                  { icon: Layers, label: "Chains", value: `${project.chain_count ?? "—"}`, sub: project.top_chain && project.top_chain !== "Unknown" ? `${project.top_chain_share?.toFixed(0)}% ${project.top_chain}` : null, col: "#46E3C2" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-line bg-panel-2/50">
                    <s.icon className="w-4 h-4 shrink-0" style={{ color: s.col }} />
                    <div className="min-w-0">
                      <div className="label" style={{ fontSize: 9 }}>{s.label}</div>
                      <div className="stat-num text-sm">{s.value}{s.sub && <span className="text-faint ml-1" style={{ fontSize: 10 }}>({s.sub})</span>}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* breakdown */}
              {project.risk_breakdown && (
                <div>
                  <div className="label mb-2" style={{ fontSize: 10 }}>Risk Breakdown</div>
                  <div className="space-y-2">
                    {[
                      ["Smart Contract", project.risk_breakdown.smart_contract_risk],
                      ["Liquidity", project.risk_breakdown.liquidity_risk],
                      ["Financial", project.risk_breakdown.financial_risk],
                      ["Operational", project.risk_breakdown.operational_risk],
                    ].map(([name, val]) => (
                      <div key={name} className="grid items-center gap-3" style={{ gridTemplateColumns: "112px 1fr 30px" }}>
                        <span className="font-mono text-dim" style={{ fontSize: 11 }}>{name}</span>
                        <span className="rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,.07)" }}>
                          <span className="block h-full rounded-full" style={{ width: `${Math.min(100, val ?? 0)}%`, background: riskHex(val ?? 0) }} />
                        </span>
                        <span className="stat-num text-right" style={{ fontSize: 12, color: riskHex(val ?? 0) }}>{val ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* delete */}
              <div className="pt-2 border-t border-line">
                <button
                  onClick={() => setShowConfirm(project.id)}
                  disabled={deleting === project.id}
                  className="w-full py-2.5 rounded-lg border flex items-center justify-center gap-2 font-mono uppercase transition-colors disabled:opacity-50 hover:brightness-125"
                  style={{ fontSize: 11, letterSpacing: ".1em", color: "#FF5D5D", borderColor: "rgba(255,93,93,.25)", background: "rgba(255,93,93,.08)" }}
                >
                  <Trash2 className="w-4 h-4" />Delete Protocol
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-24">
          <div className="font-display text-2xl text-ink mb-2">No protocols yet</div>
          <p className="text-dim text-sm">Add your first protocol from the <span className="text-heat font-medium">Risk Analysis</span> page.</p>
        </div>
      )}
    </div>
  );
}