// src/components/SkeletonLoader.jsx
export default function SkeletonLoader({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-white/10 rounded-lg ${className}`}
      style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05))", backgroundSize: "200% 100%" }}
    />
  );
}
