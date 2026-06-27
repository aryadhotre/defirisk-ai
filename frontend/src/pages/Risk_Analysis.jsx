// src/pages/Risk_Analysis.jsx
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FormField from "../components/FormField";

console.log("✅ Risk_Analysis.jsx LOADED - NEW VERSION WITH DEFILLAMA FIX");

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
const DEFILLAMA_BASE = `${API_BASE}/defillama`;
const DEFI_BASE = `${API_BASE}/defi`;

console.log("🔧 API_BASE:", API_BASE);
console.log("🔧 DEFILLAMA_BASE:", DEFILLAMA_BASE);

export default function Risk_Analysis({ form, setForm, submitting, handleSubmit }) {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Protocol search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [useManual, setUseManual] = useState(false);

  // Search protocols from DeFiLlama
  const searchProtocols = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    console.log("🔍 Searching for:", query);
    setSearching(true);
    try {
      const url = `${DEFILLAMA_BASE}/search?q=${encodeURIComponent(query)}&limit=8`;
      console.log("📡 API URL:", url);
      
      const res = await fetch(url);
      console.log("📥 Response status:", res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log("✅ Search results:", data);
      console.log("📊 Results array:", data.results);
      console.log("📊 Results length:", data.results ? data.results.length : 0);
      
      setSearchResults(data.results || []);
      const shouldShow = data.results && data.results.length > 0;
      console.log("👁️ Should show dropdown:", shouldShow);
      setShowDropdown(shouldShow);
    } catch (err) {
      console.error("❌ Search error:", err);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (useManual) return;
    
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchProtocols(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, useManual]);

  // Select protocol from dropdown
  const selectProtocol = async (protocol) => {
    console.log("🎯 Selected protocol:", protocol);
    
    try {
      const url = `${DEFILLAMA_BASE}/protocol/${protocol.slug}`;
      console.log("📡 Fetching protocol data:", url);
      
      const res = await fetch(url);
      console.log("📥 Response status:", res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const response = await res.json();
      console.log("✅ Protocol data:", response);
      
      if (response.success && response.data) {
        const data = response.data;
        
        // Populate form with real data
        setForm({
          name: data.name,
          protocol_type: data.protocol_type,
          total_value_locked: data.total_value_locked.toString(),
          audit_status: data.audit_status,
          liquidity_score: data.liquidity_score.toString(),
          user_activity_score: data.user_activity_score.toString(),
        });
        
        console.log("✅ Form populated:", data.name);
        setSearchQuery(data.name);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error("❌ Error fetching protocol:", err);
      alert(`Failed to load ${protocol.name}. Error: ${err.message}`);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    await handleSubmit(e);
    
    setShowSuccess(true);
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-semibold tracking-tight">Risk Analysis</h1>
        <p className="text-white/60 text-sm">
          Search for any DeFi protocol or enter data manually
        </p>
      </motion.div>

      {/* Success Message */}
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
        {/* Mode Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/10">
          <span className="text-sm text-white/70">
            {useManual ? "📝 Manual Entry Mode" : "🔍 Auto-Fill from DeFiLlama"}
          </span>
          <button
            type="button"
            onClick={() => {
              setUseManual(!useManual);
              if (!useManual) {
                setSearchQuery("");
                setSearchResults([]);
                setShowDropdown(false);
              }
            }}
            className="px-3 py-1 rounded-lg text-xs bg-indigo-500/20 hover:bg-indigo-500/30 
                       text-indigo-300 transition-all"
          >
            {useManual ? "Switch to Auto-Fill" : "Enter Manually"}
          </button>
        </div>

        {/* Protocol Search (Auto-Fill Mode) */}
        {!useManual && (
          <div className="relative">
            <label className="text-xs font-medium text-white/50">Search Protocol</label>
            <div className="relative mt-1">
              <input
                type="text"
                placeholder="Type to search (e.g., Uniswap, Aave)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowDropdown(true)}
                className="w-full rounded-xl px-4 py-3 bg-black/40 border border-white/10 
                           focus:border-indigo-400/40 outline-none transition-all pr-10"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
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
        )}

        {/* Project Name (Manual Mode) */}
        {useManual && (
          <FormField
            label="Project Name"
            type="text"
            placeholder="e.g., Uniswap V3"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        )}

        {/* Protocol Type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-white/50">Protocol Type</label>
          <select
            value={form.protocol_type}
            onChange={(e) => setForm({ ...form, protocol_type: e.target.value })}
            className="w-full rounded-xl px-4 py-3 bg-black/40 border border-white/10 
                       focus:border-indigo-400/40 outline-none transition-all text-white
                       [&>option]:bg-[#0a0e14] [&>option]:text-white"
            required
          >
            <option value="" disabled>Select protocol type</option>
            <option value="DEX">DEX (Decentralized Exchange)</option>
            <option value="Lending">Lending / Borrowing</option>
            <option value="Derivatives">Derivatives / Perpetuals</option>
            <option value="Yield">Yield Farming</option>
            <option value="Staking">Staking</option>
            <option value="Options">Options Trading</option>
          </select>
        </div>

        {/* Audit Status */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-white/50">Audit Status</label>
          <select
            value={form.audit_status}
            onChange={(e) => setForm({ ...form, audit_status: e.target.value })}
            className="w-full rounded-xl px-4 py-3 bg-black/40 border border-white/10 
                       focus:border-indigo-400/40 outline-none transition-all text-white
                       [&>option]:bg-[#0a0e14] [&>option]:text-white"
            required
          >
            <option value="Audited">Audited ✅</option>
            <option value="Unaudited">Unaudited ⚠️</option>
          </select>
        </div>

        {/* TVL */}
        <FormField
          label="Total Value Locked (USD)"
          type="number"
          placeholder="e.g., 450000000"
          value={form.total_value_locked}
          onChange={(e) => setForm({ ...form, total_value_locked: e.target.value })}
        />

        {/* Liquidity Score */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-white/50">Liquidity Score (0-100)</label>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="e.g., 85"
            value={form.liquidity_score}
            onChange={(e) => setForm({ ...form, liquidity_score: e.target.value })}
            className="w-full rounded-xl px-4 py-3 bg-black/40 border border-white/10 
                       focus:border-indigo-400/40 outline-none transition-all"
            required
          />
          <span className="text-xs text-white/40 mt-1">
            Auto-filled from DeFiLlama or enter manually
          </span>
        </div>

        {/* User Activity */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-white/50">User Activity Score (0-100)</label>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="e.g., 90"
            value={form.user_activity_score}
            onChange={(e) => setForm({ ...form, user_activity_score: e.target.value })}
            className="w-full rounded-xl px-4 py-3 bg-black/40 border border-white/10 
                       focus:border-indigo-400/40 outline-none transition-all"
            required
          />
          <span className="text-xs text-white/40 mt-1">
            Auto-filled from DeFiLlama or enter manually
          </span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                     font-semibold transition-all duration-200 hover:shadow-lg 
                     hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Analyzing..." : "Analyze Risk →"}
        </button>
      </motion.form>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-5 space-y-2"
      >
        <h3 className="text-sm font-semibold text-indigo-400">
          🚀 Powered by DeFiLlama
        </h3>
        <p className="text-xs text-white/60 leading-relaxed">
          Real-time data from 6000+ DeFi protocols across 80+ blockchains. Data is auto-filled
          when you search for a protocol, or you can enter data manually.
        </p>
      </motion.div>
    </div>
  );
}