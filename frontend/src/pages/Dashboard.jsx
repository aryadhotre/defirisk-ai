// src/pages/Dashboard.jsx
import { motion } from "framer-motion";
import { useState } from "react";
import KPICard from "../components/KPICard";
import Th from "../components/Th";
import Td from "../components/Td";

export default function Dashboard({ projects, loadingList, kpis }) {
  const [selectedProject, setSelectedProject] = useState(null);

  const getRiskColor = (score) => {
    if (score <= 25) return "text-green-400";
    if (score <= 50) return "text-yellow-400";
    if (score <= 75) return "text-orange-400";
    return "text-red-400";
  };

  const getRiskBadge = (level) => {
    const colors = {
      Low: "bg-green-500/10 text-green-400 border-green-500/20",
      Medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      High: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      Critical: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return colors[level] || colors.Medium;
  };

  const changeColor = (v) => (v > 0 ? "text-green-400" : v < 0 ? "text-red-400" : "text-white/50");
  const fmtPct = (v) => (v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);

  return (
    <div className="space-y-10">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-semibold tracking-tight"
      >
        Dashboard
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6"
      >
        <KPICard title="Projects" value={kpis.count} />
        <KPICard title="Avg Risk" value={kpis.avgRisk} />
        <KPICard title="Total TVL" value={kpis.tvl.toLocaleString()} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-white/80">Projects</h2>
          <span className="text-xs text-white/50">{projects.length} total</span>
        </div>

        <div className="overflow-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <Th>#</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th className="text-right">TVL</Th>
                <Th className="text-right">7d</Th>
                <Th className="text-right">Risk Score</Th>
                <Th>Risk Level</Th>
                <Th className="text-center">Details</Th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr><td className="p-4 text-white/60" colSpan={8}>Loading…</td></tr>
              ) : projects.length === 0 ? (
                <tr><td className="p-4 text-white/60" colSpan={8}>No projects yet. Add one from Risk Analysis.</td></tr>
              ) : (
                projects.map((p, i) => (
                  <tr key={p.id} className="border-t border-white/10 hover:bg-white/5 transition">
                    <Td>{i + 1}</Td>
                    <Td className="font-medium">{p.name}</Td>
                    <Td className="text-white/60">{p.protocol_type}</Td>
                    <Td className="text-right text-white/70">
                      ${(p.total_value_locked / 1000000).toFixed(1)}M
                    </Td>
                    <Td className={`text-right font-medium ${changeColor(p.change_7d ?? 0)}`}>
                      {fmtPct(p.change_7d)}
                    </Td>
                    <Td className={`text-right font-semibold ${getRiskColor(p.risk_score)}`}>
                      {p.risk_score}
                    </Td>
                    <Td>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${getRiskBadge(p.risk_level)}`}>
                        {p.risk_level || "N/A"}
                      </span>
                    </Td>
                    <Td className="text-center">
                      <button
                        onClick={() => setSelectedProject(selectedProject?.id === p.id ? null : p)}
                        className="text-indigo-400 hover:text-indigo-300 text-xs underline"
                      >
                        {selectedProject?.id === p.id ? "Hide" : "View"}
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* DETAIL PANEL — breakdown + real signals */}
      {selectedProject && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 space-y-6"
        >
          <h3 className="text-lg font-semibold">{selectedProject.name} — Risk Detail</h3>

          {/* Real signals row */}
          <div>
            <div className="text-xs text-white/50 mb-2 uppercase tracking-wide">Live Signals</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50">TVL Volatility (30d)</div>
                <div className="text-xl font-semibold text-white">{selectedProject.tvl_volatility?.toFixed(2) ?? "—"}%</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50">Max Drawdown (30d)</div>
                <div className="text-xl font-semibold text-orange-400">{selectedProject.max_drawdown?.toFixed(2) ?? "—"}%</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50">30d Change</div>
                <div className={`text-xl font-semibold ${changeColor(selectedProject.change_30d ?? 0)}`}>
                  {fmtPct(selectedProject.change_30d)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/50">Chain Concentration</div>
                <div className="text-xl font-semibold text-white">
                  {selectedProject.top_chain_share?.toFixed(0) ?? "—"}%
                </div>
                <div className="text-xs text-white/40">
                  {selectedProject.top_chain} · {selectedProject.chain_count} chains
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown — corrected weights */}
          {selectedProject.risk_breakdown && (
            <div>
              <div className="text-xs text-white/50 mb-2 uppercase tracking-wide">Risk Breakdown</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/50 mb-1">Smart Contract Risk (30%)</div>
                  <div className={`text-2xl font-semibold ${getRiskColor(selectedProject.risk_breakdown.smart_contract_risk)}`}>
                    {selectedProject.risk_breakdown.smart_contract_risk}
                  </div>
                  <div className="text-xs text-white/40 mt-1">Audit status · TVL-at-risk</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/50 mb-1">Liquidity Risk (25%)</div>
                  <div className={`text-2xl font-semibold ${getRiskColor(selectedProject.risk_breakdown.liquidity_risk)}`}>
                    {selectedProject.risk_breakdown.liquidity_risk}
                  </div>
                  <div className="text-xs text-white/40 mt-1">TVL depth · volatility · concentration</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/50 mb-1">Financial Risk (25%)</div>
                  <div className={`text-2xl font-semibold ${getRiskColor(selectedProject.risk_breakdown.financial_risk)}`}>
                    {selectedProject.risk_breakdown.financial_risk}
                  </div>
                  <div className="text-xs text-white/40 mt-1">Volatility · drawdown · valuation</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/50 mb-1">Operational Risk (20%)</div>
                  <div className={`text-2xl font-semibold ${getRiskColor(selectedProject.risk_breakdown.operational_risk)}`}>
                    {selectedProject.risk_breakdown.operational_risk}
                  </div>
                  <div className="text-xs text-white/40 mt-1">Chain concentration · TVL trend</div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}