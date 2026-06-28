// src/pages/Risk_Analysis.jsx
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CheckCircle, ShieldCheck, Layers, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://defirisk-ai-backend.onrender.com";
const DEFILLAMA_BASE = `${API_BASE}/defillama`;

const fmtTVL = (value) => {
  const n = Number(value);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
};

export default function Risk_Analysis({ form, setForm, submitting, handleSubmit }) {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState(null);

  const searchProtocols = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const url = `${DEFILLAMA_BASE}/search?q=${encodeURIComponent(query)}&limit=8`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowDropdown((data.results || []).length > 0);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchProtocols(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectProtocol = async (protocol) => {
    try {
      const url = `${DEFILLAMA_BASE}/protocol/${protocol.slug}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const response = await res.json();

      if (response.success && response.data) {
        const data = response.data;
        setForm({
          name: data.name,
          protocol_type: data.protocol_type,
          total_value_locked: data.total_value_locked.toString(),
          audit_status: data.audit_status,
          liquidity_score: "0",
          user_activity_score: "0",
          slug: protocol.slug,
        });
        setSelectedProtocol(data);
        setSearchQuery(data.name);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error("Error fetching protocol:", err);
      alert(`Failed to load ${protocol.name}. ${err.message}`);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await handleSubmit(e);
    setShowSuccess(true);
    setTimeout(() => navigate("/dashboard"), 1800);
  };

  const canSubmit = selectedProtocol && form.name && form.total_value_locked;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="label mb-3"><span className="live-dot mr-2" />Analyze</div>
        <h1 className="font-display text-[clamp(34px,5vw,52px)] leading-none tracking-tight">Risk Analysis</h1>
        <p className="text-dim text-sm mt-3">Search any DeFi protocol — we pull live data and compute a risk profile from real on-chain metrics.</p>
      </motion.div>

      {showSuccess && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-panel border"
          style={{ color: "#3FD98B", background: "rgba(63,217,139,.08)", borderColor: "rgba(63,217,139,.25)" }}>
          <CheckCircle className="w-5 h-5" />
          <span className="font-mono text-sm tracking-wide">RISK PROFILE COMPUTED — redirecting to dashboard…</span>
        </motion.div>
      )}

      {/* search panel */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <div className="pointer-events-none absolute -inset-8 -z-0 opacity-60">
          <div className="absolute right-4 top-0 w-72 h-44 blur-[90px]" style={{ background: "radial-gradient(circle,#FF4D8D,transparent 70%)" }} />
          <div className="absolute left-10 bottom-0 w-60 h-36 blur-[90px]" style={{ background: "radial-gradient(circle,#FFB23D,transparent 72%)" }} />
        </div>

        <form onSubmit={onSubmit} className="panel relative z-10 p-8 space-y-6">
          <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />

          <div className="relative">
            <label className="label" style={{ fontSize: 10 }}>Search Protocol</label>
            <div className="relative mt-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
              <input
                type="text"
                placeholder="Type to search (e.g. Uniswap, Aave, GMX)…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); if (selectedProtocol) setSelectedProtocol(null); }}
                onFocus={() => searchQuery && searchResults.length > 0 && setShowDropdown(true)}
                className="w-full rounded-xl pl-11 pr-11 py-3.5 bg-canvas/60 border border-line text-ink placeholder:text-faint font-mono text-sm outline-none transition-colors focus:border-[#FFB23D]/50"
              />
              {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: "#46E3C2" }} />}
            </div>

            {showDropdown && searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="absolute z-50 w-full mt-2 rounded-xl border border-line-strong overflow-hidden max-h-80 overflow-y-auto"
                style={{ background: "#0E1116", boxShadow: "0 24px 60px -24px rgba(0,0,0,.9)" }}>
                {searchResults.map((protocol, i) => (
                  <button key={i} type="button" onClick={() => selectProtocol(protocol)}
                    className="w-full px-4 py-3 text-left transition-colors border-b border-line last:border-0 flex items-center gap-3 hover:bg-white/[0.04]">
                    {protocol.logo && <img src={protocol.logo} alt={protocol.name} className="w-8 h-8 rounded-full" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-ink font-medium truncate">{protocol.name}</div>
                      <div className="font-mono text-faint" style={{ fontSize: 11 }}>{protocol.category} · {fmtTVL(protocol.tvl)}</div>
                    </div>
                    <span className="font-mono text-faint" style={{ fontSize: 12 }}>→</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {selectedProtocol && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-line bg-panel-2/60 p-5 space-y-4">
              <div className="flex items-center gap-3">
                {selectedProtocol.logo && <img src={selectedProtocol.logo} alt={selectedProtocol.name} className="w-10 h-10 rounded-full" />}
                <div>
                  <div className="font-display text-xl text-ink leading-none">{selectedProtocol.name}</div>
                  <div className="label mt-1.5" style={{ fontSize: 10 }}>{selectedProtocol.protocol_type}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="label" style={{ fontSize: 10 }}>Total Value Locked</div>
                  <div className="stat-num text-lg mt-1">{fmtTVL(form.total_value_locked)}</div>
                </div>
                <div>
                  <div className="label" style={{ fontSize: 10 }}>Audit Status</div>
                  <div className="stat-num text-lg mt-1 flex items-center gap-1.5" style={{ color: form.audit_status === "Audited" ? "#3FD98B" : "#FF8350" }}>
                    <ShieldCheck className="w-4 h-4" />{form.audit_status}
                  </div>
                </div>
                {selectedProtocol.chains && (
                  <div className="col-span-2">
                    <div className="label flex items-center gap-1.5" style={{ fontSize: 10 }}><Layers className="w-3.5 h-3.5" />Chains</div>
                    <div className="text-dim text-xs mt-1 font-mono">
                      {selectedProtocol.chains.slice(0, 6).join(", ")}{selectedProtocol.chains.length > 6 ? ` +${selectedProtocol.chains.length - 6}` : ""}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-faint text-xs">Risk will be computed live from volatility, drawdown, chain concentration, and momentum.</p>
            </motion.div>
          )}

          <button type="submit" disabled={submitting || !canSubmit}
            className="btn btn-primary w-full justify-center py-3.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
            {submitting ? "Analyzing…" : selectedProtocol ? "Analyze Risk →" : "Select a protocol first"}
          </button>
        </form>
      </motion.div>

      {/* info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel p-6">
        <div className="mb-3"><span className="text-heat font-mono font-bold" style={{ fontSize: 12, letterSpacing: ".08em" }}>POWERED BY DEFILLAMA</span></div>
        <p className="text-dim text-[13px] leading-relaxed mb-4">
          Live data from 6,000+ DeFi protocols across 80+ blockchains. Risk scores are computed from real TVL volatility, peak-to-trough drawdown, chain concentration, and momentum — not manual estimates.
        </p>
        <div className="flex flex-wrap gap-2">
          {["Volatility", "Drawdown", "Concentration", "Momentum"].map((d) => (
            <span key={d} className="font-mono uppercase rounded-md border border-line text-dim px-2.5 py-1" style={{ fontSize: 10, letterSpacing: ".1em" }}>{d}</span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}