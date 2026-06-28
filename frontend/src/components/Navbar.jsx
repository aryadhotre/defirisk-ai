// src/components/Navbar.jsx
import { Link, useLocation } from "react-router-dom";

const LINKS = [
  ["Dashboard", "/dashboard"],
  ["Risk Analysis", "/risk"],
  ["Analytics", "/analytics"],
  ["Saved", "/saved"],
  ["API Docs", "/docs"],
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-line bg-canvas/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 h-[66px] flex items-center justify-between">
        <Link to="/" className="flex items-baseline group">
          <span className="font-display text-[25px] leading-none text-ink">DeFiRisk</span>
          <span className="font-mono text-[13px] font-bold tracking-[0.12em] text-heat ml-1.5">AI</span>
        </Link>

        <div className="flex items-center gap-7">
          {LINKS.map(([label, to]) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`group relative font-mono text-[11.5px] tracking-[0.16em] uppercase py-1 transition-colors duration-300 ${
                  active ? "text-ink" : "text-dim hover:text-ink"
                }`}
              >
                {label}
                <span
                  className={`absolute left-0 -bottom-0.5 h-[1.5px] w-full origin-left transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                  style={{ background: "linear-gradient(90deg,#FFB23D,#FF4D8D)" }}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}