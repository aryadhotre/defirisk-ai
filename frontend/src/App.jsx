// src/App.jsx
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import RiskAnalysis from "./pages/Risk_Analysis";
import SavedProjects from "./pages/SavedProjects";
import Analytics from "./pages/Analytics";

import Navbar from "./components/Navbar";
import NoiseTexture from "./components/NoiseTexture";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://defirisk-ai-backend.onrender.com";

function AppContent() {
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    protocol_type: "",
    total_value_locked: "",
    audit_status: "Audited",
    liquidity_score: "",
    user_activity_score: "",
  });

  const loadProjects = async () => {
    try {
      setLoadingList(true);
      const res = await fetch(`${API_BASE}/defi/projects`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data = await res.json();
      if (!Array.isArray(data)) data = [];
      setProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setProjects([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        total_value_locked: Number(form.total_value_locked),
        liquidity_score: Number(form.liquidity_score),
        user_activity_score: Number(form.user_activity_score),
      };

      const res = await fetch(`${API_BASE}/defi/analyze_risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Request failed");
      await loadProjects();

      setForm({
        name: "",
        protocol_type: "",
        total_value_locked: "",
        audit_status: "Audited",
        liquidity_score: "",
        user_activity_score: "",
      });
    } catch (err) {
      console.error("Error submitting form:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const kpis = useMemo(() => {
    if (!Array.isArray(projects) || projects.length === 0)
      return { count: 0, avgRisk: 0, tvl: 0 };

    const count = projects.length;
    const avgRisk =
      Math.round(
        (projects.reduce((s, p) => s + Number(p.risk_score || 0), 0) / count) * 10
      ) / 10;

    const tvl = Math.round(
      projects.reduce((s, p) => s + Number(p.total_value_locked || 0), 0)
    );

    return { count, avgRisk, tvl };
  }, [projects]);

  return (
    <>
      {/* Simple gradient background (Linear-style) */}
      <div className="fixed inset-0 -z-20 bg-[#0a0e14]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/8 rounded-full blur-[140px]" />
      </div>

      {/* Subtle noise texture */}
      <NoiseTexture opacity={0.025} />

      {/* Navbar */}
      <Navbar />

      {/* Page transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="min-h-screen text-white"
        >
          <div className="pt-28 pb-20 max-w-6xl mx-auto px-6 w-full">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <Landing
                    projects={projects}
                    kpis={kpis}
                    loadingList={loadingList}
                  />
                }
              />

              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    projects={projects}
                    loadingList={loadingList}
                    kpis={kpis}
                  />
                }
              />

              <Route
                path="/risk"
                element={
                  <RiskAnalysis
                    form={form}
                    setForm={setForm}
                    submitting={submitting}
                    handleSubmit={handleSubmit}
                  />
                }
              />

              <Route path="/saved" element={<SavedProjects />} />

              {/* Analytics */}
              <Route path="/analytics" element={<Analytics />} />

              {/* API Docs */}
              <Route
                path="/docs"
                element={
                  <iframe
                    src="https://defirisk-ai-backend.onrender.com/docs"
                    className="w-full h-[80vh] rounded-xl border border-white/10 bg-[#0a0e14]"
                    title="API Docs"
                  />
                }
              />
            </Routes>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}