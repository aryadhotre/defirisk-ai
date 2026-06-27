// src/components/Magnetic.jsx
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function Magnetic({ children }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 170, damping: 22, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 170, damping: 22, mass: 0.6 });
  const tx = useTransform(sx, (v) => `${v}px`);
  const ty = useTransform(sy, (v) => `${v}px`);

  const handleMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    // distance scaled down to be subtle
    const dx = (e.clientX - (r.left + r.width / 2)) * 0.12;
    const dy = (e.clientY - (r.top + r.height / 2)) * 0.12;
    mx.set(dx);
    my.set(dy);
  };
  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ x: tx, y: ty }}
      className="inline-block will-change-transform"
      aria-hidden={false}
    >
      {children}
    </motion.div>
  );
}
