/** @type {import('tailwindcss').Config} */
// frontend/tailwind.config.js
// DeFiRisk AI — "Arkham × Dune" design tokens.
// NOTE: written as ESM (export default) because your postcss.config is .cjs,
// which means package.json is "type":"module". If your current
// tailwind.config.js uses `module.exports`, swap the export line to match.

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#07080A',                 // near-black base
        panel: { DEFAULT: '#0F1115', 2: '#15181D' },
        line: 'rgba(255,255,255,0.07)',    // hairline
        'line-strong': 'rgba(255,255,255,0.12)',
        ink: '#ECEDEF',                    // text primary (not pure white)
        dim: '#8A9099',                    // text muted
        faint: '#565C66',                  // text dim / labels
        accent: '#46E3C2',                 // cool data signal (Arkham): sparklines, links, focus, live
        heat: { 1: '#FF6A4D', 2: '#FF8350', 3: '#FFB23D', 4: '#FF4D8D' }, // risk-heat (Dune wow)
        risk: { low: '#3FD98B', med: '#F5B73E', high: '#FF5D5D' },         // semantics — risk data only
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        heat: 'linear-gradient(96deg,#FFB23D,#FF6A4D 55%,#FF4D8D)',
        'heat-soft': 'linear-gradient(102deg,#FFB23D 5%,#FF6A4D 50%,#FF4D8D)',
        grid: 'linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)',
        // atmospheric corner glows for page backgrounds
        atmos:
          'radial-gradient(40% 50% at 85% 8%, rgba(255,77,141,.10), transparent 70%),' +
          'radial-gradient(45% 55% at 12% 95%, rgba(255,131,80,.08), transparent 72%)',
      },
      backgroundSize: { grid: '64px 64px' },
      boxShadow: {
        panel: '0 30px 80px -30px rgba(0,0,0,.9)',
        heat: '0 8px 34px -8px rgba(255,130,80,.55)',
        glow: '0 0 0 1px rgba(255,255,255,.06), 0 18px 50px -20px rgba(0,0,0,.8)',
      },
      borderRadius: { panel: '18px' },
      letterSpacing: { label: '0.22em' },
      keyframes: {
        drift: {
          '0%,100%': { transform: 'translate(0,0) scale(1)', filter: 'blur(46px) saturate(1.25) hue-rotate(0deg)' },
          '50%': { transform: 'translate(2%,-2.5%) scale(1.06)', filter: 'blur(52px) saturate(1.35) hue-rotate(-12deg)' },
        },
        pulseDot: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.35', transform: 'scale(.7)' },
        },
        marquee: { to: { transform: 'translateX(-50%)' } },
        rise: { from: { opacity: '0', transform: 'translateY(26px)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        drift: 'drift 16s ease-in-out infinite',
        'pulse-dot': 'pulseDot 1.8s cubic-bezier(.22,1,.36,1) infinite',
        marquee: 'marquee 38s linear infinite',
        rise: 'rise .9s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
};