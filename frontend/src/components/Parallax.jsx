// src/components/Parallax.jsx
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

/**
 * Wrap children to parallax slightly with the cursor.
 * depth: 0..1 (higher = more movement)
 */
export function ParallaxLayer({ depth = 0.2, children, className = "" }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const sx = useSpring(mx, { stiffness: 120, damping: 18 });
  const sy = useSpring(my, { stiffness: 120, damping: 18 });

  const x = useTransform(sx, (v) => v * depth);
  const y = useTransform(sy, (v) => v * depth);

  useEffect(() => {
    const handler = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mx.set(((e.clientX - cx) / cx) * 20); // base movement
      my.set(((e.clientY - cy) / cy) * 20);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [mx, my]);

  return (
    <motion.div className={className} style={{ x, y }}>
      {children}
    </motion.div>
  );
}
