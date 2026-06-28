// src/pages/Risk_Analysis.jsx
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://defirisk-ai-backend.onrender.com";
const DEFILLAMA_BASE = `${API_BASE}/defillama`;

export default function Risk_Analysis({ form, setForm, submitting, handleSubmit }) {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState(null);

  // Search protocols from DeFiLlama
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchProtocols(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select protocol -> fetch full data -> auto-fill form
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
          // kept for payload compatibility; backend ignores these now
          liquidity_score: "0",
          user_activity_score: "0",
          slug: protocol.slug, // so backend fetches real metrics by slug
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

  const formatTVL = (value) => {
    const n = Number(value);
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
    return `$${n.toFixed(2)}`;
  };

  const canSubmit = selectedProtocol && form.name && form.total_value_locked;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-semibold tracking-tight">Risk Analysis</h1>
        <p className="text-white/60 text-sm">
          Search a DeFi protocol — we pull live data and compute a risk profile from real on-chain metrics.
        </p>
      </motion.div>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400"
        >
          ✅ Risk analysis complete! Redirecting to dashboard...
        </motion.div>
      )}

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={onSubmit}
        className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 space-y-6"
      >
        {/* Protocol Search */}
        <div className="relative">
          <label className="text-xs font-medium text-white/50">Search Protocol</label>
          <div className="relative mt-1">
            <input
              type="text"
              placeholder="Type to search (e.g., Uniswap, Aave, GMX)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (selectedProtocol) setSelectedProtocol(null);
              }}
              onFocus={() => searchQuery && searchResults.length > 0 && setShowDropdown(true)}
              className="w-full rounded-xl px-4 py-3 bg-black/40 border border-white/10
                         focus:border-indigo-400/40 outline-none transition-all pr-10"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {showDropdown && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-50 w-full mt-2 rounded-xl bg-[#0a0e14] border border-white/10
                         shadow-xl max-h-80 overflow-y-auto"
            >
              {searchResults.map((protocol, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectProtocol(protocol)}
                  className="w-full px-4 py-3 text-left hover:bg-white/5 transition-all
                             border-b border-white/5 last:border-0 flex items-center gap-3"
                >
                  {protocol.logo && (
                    <img src={protocol.logo} alt={protocol.name} className="w-8 h-8 rounded-full" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-white">{protocol.name}</div>
                    <div className="text-xs text-white/50">
                      {protocol.category} • TVL: ${(protocol.tvl / 1e6).toFixed(1)}M
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Selected protocol preview (read-only, auto-filled) */}
        {selectedProtocol && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-black/30 border border-white/10 p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              {selectedProtocol.logo && (
                <img src={selectedProtocol.logo} alt={selectedProtocol.name} className="w-10 h-10 rounded-full" />
              )}
              <div>
                <div className="font-semibold text-white">{selectedProtocol.name}</div>
                <div className="text-xs text-white/50">{selectedProtocol.protocol_type}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm pt-2">
              <div className="flex flex-col">
                <span className="text-white/40 text-xs">Total Value Locked</span>
                <span className="text-white font-medium">{formatTVL(form.total_value_locked)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/40 text-xs">Audit Status</span>
                <span className={`font-medium ${
                  form.audit_status === "Audited" ? "text-green-400" : "text-orange-400"
                }`}>
                  {form.audit_status}
                </span>
              </div>
              {selectedProtocol.chains && (
                <div className="flex flex-col col-span-2">
                  <span className="text-white/40 text-xs">Chains</span>
                  <span className="text-white/80 text-xs">
                    {selectedProtocol.chains.slice(0, 6).join(", ")}
                    {selectedProtocol.chains.length > 6 ? ` +${selectedProtocol.chains.length - 6} more` : ""}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-white/40 pt-1">
              Risk will be computed from live volatility, drawdown, chain concentration, and momentum.
            </p>
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500
                     font-semibold transition-all duration-200 hover:shadow-lg
                     hover:shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Analyzing..." : selectedProtocol ? "Analyze Risk →" : "Select a protocol first"}
        </button>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-5 space-y-2"
      >
        <h3 className="text-sm font-semibold text-indigo-400">🚀 Powered by DeFiLlama</h3>
        <p className="text-xs text-white/60 leading-relaxed">
          Live data from 6000+ DeFi protocols across 80+ blockchains. Risk scores are computed
          from real TVL volatility, peak-to-trough drawdown, chain concentration, and momentum —
          not manual estimates.
        </p>
      </motion.div>
    </div>
  );
}