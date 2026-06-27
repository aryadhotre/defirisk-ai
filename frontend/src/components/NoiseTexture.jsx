// src/components/NoiseTexture.jsx
export default function NoiseTexture({
  opacity = 0.035,
  className = "",
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 -z-10 mix-blend-overlay ${className}`}
      aria-hidden="true"
    >
      <svg
        className="h-full w-full opacity-[var(--grain,1)]"
        style={{ "--grain": opacity }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0 0 0.04 0.06 0.04 0" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}
