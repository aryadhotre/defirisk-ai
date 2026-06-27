// src/pages/Landing.jsx
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Reveal from "../components/Reveal";
import Magnetic from "../components/Magnetic";
import KPICard from "../components/KPICard";
import IntegrationCards from "../components/IntegrationCards";
import SkeletonLoader from "../components/SkeletonLoader";

export default function Landing({ projects = [], kpis = {}, loadingList }) {
  const { count, avgRisk, tvl } = kpis;

  return (
    <div className="relative min-h-screen text-white">
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-20">
        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-6xl md:text-7xl font-bold leading-tight tracking-tight"
        >
          DeFiRisk{" "}
          <span className="relative inline-block">
            <span className="text-white/50">AI</span>
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-fuchsia-400 
                   bg-clip-text text-transparent opacity-60" />
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 text-lg text-white/60 max-w-2xl leading-relaxed"
        >
          Analyze, monitor, and explore decentralized finance protocols using an
          advanced AI-powered risk assessment platform.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 flex gap-4"
        >
          <Magnetic>
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                         font-semibold transition-all duration-200 hover:shadow-lg 
                         hover:shadow-indigo-500/30"
            >
              Launch Dashboard →
            </Link>
          </Magnetic>

          <Magnetic>
            <Link
              to="/docs"
              className="px-6 py-3 border border-white/10 hover:border-white/20 rounded-xl 
                         text-white/70 hover:text-white transition-all duration-200"
            >
              API Docs
            </Link>
          </Magnetic>
        </motion.div>

        {/* KPI Cards */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Reveal>
            {loadingList ? (
              <SkeletonLoader className="h-28" />
            ) : (
              <KPICard title="PROJECTS" value={count} />
            )}
          </Reveal>
          <Reveal delay={0.1}>
            {loadingList ? (
              <SkeletonLoader className="h-28" />
            ) : (
              <KPICard title="AVG RISK" value={avgRisk} />
            )}
          </Reveal>
          <Reveal delay={0.2}>
            {loadingList ? (
              <SkeletonLoader className="h-28" />
            ) : (
              <KPICard title="TOTAL TVL" value={tvl.toLocaleString()} suffix="USD" />
            )}
          </Reveal>
        </div>

        {/* Feature Cards */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Reveal>
            <IntegrationCards
              title="Protocol Intelligence"
              desc="Detects, classifies, and interprets DeFi protocol data in real-time using blockchain metadata."
              icon="🧠"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <IntegrationCards
              title="Liquidity Analysis"
              desc="Analyzes TVL flow, token health, and liquidity depth to preempt volatility triggers."
              icon="📊"
            />
          </Reveal>
          <Reveal delay={0.2}>
            <IntegrationCards
              title="Smart Risk Assessment"
              desc="ML-powered analysis to predict vulnerabilities and flag risky DeFi contracts instantly."
              icon="⚡"
            />
          </Reveal>
        </div>
      </div>
    </div>
  );
}