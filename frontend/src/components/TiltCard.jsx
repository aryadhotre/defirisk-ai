// src/components/TiltCard.jsx
import { useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

/**
 * Lightweight 3D tilt. No wobble, clamps at 8deg.
 */
export default function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);

  const rotateX = useTransform(rx, [-1, 1], [8, -8]);
  const rotateY = useTransform(ry, [-1, 1], [-8, 8]);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    ry.set(px * 2 - 1); // -1..1
    rx.set(py * 2 - 1);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-xl shadow-black/30 ${className}`}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
