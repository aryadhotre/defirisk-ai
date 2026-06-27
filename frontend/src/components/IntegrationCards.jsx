// src/components/IntegrationCards.jsx
import { motion } from "framer-motion";

export default function IntegrationCards({ title, desc, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.3, 1] }}
      className="group relative bg-white/5 border border-white/10 rounded-2xl 
                 p-6 backdrop-blur-md overflow-hidden hover:bg-white/[0.07]
                 hover:border-white/20 transition-all duration-500"
    >
      {/* Subtle gradient lighting */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-transparent" />

      {/* Icon */}
      <div className="mb-4 text-3xl">{icon}</div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-white/70 leading-relaxed">{desc}</p>

      {/* Hover underline */}
      <motion.div
        initial={{ width: "0%" }}
        whileHover={{ width: "100%" }}
        transition={{ duration: 0.4 }}
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-fuchsia-500 to-indigo-500"
      />
    </motion.div>
  );
}
