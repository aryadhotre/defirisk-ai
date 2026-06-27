// src/components/AnimatedHeader.jsx
import { motion } from "framer-motion";

/**
 * AnimatedHeader — use inside pages for big titles.
 * Usage:
 *   <AnimatedHeader primary="DeFiRisk" accent="AI" />
 */
export default function AnimatedHeader({ primary = "DeFiRisk", accent = "AI" }) {
  return (
    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
      <span className="block">{primary}{" "}</span>
      <span className="relative inline-block">
        <span className="relative z-10 text-white/90">{accent}</span>

        {/* gradient sweep */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-indigo-400
                     bg-[length:200%_100%] animate-[gradient-sweep_4s_linear_infinite] mix-blend-screen opacity-30"
          style={{ pointerEvents: "none" }}
        />
      </span>
      <style>{`
        @keyframes gradient-sweep {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
      `}</style>
    </h1>
  );
}
