// src/components/Navbar.jsx
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const navItem = (label, to) => (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm transition 
      ${location.pathname === to ? "text-white font-semibold" : "text-white/60 hover:text-white"}`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#0a0e14]/70 backdrop-blur-xl border-b border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="font-bold text-lg tracking-tight">
          DeFiRisk <span className="text-white/50">AI</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          {navItem("Dashboard", "/dashboard")}
          {navItem("Risk Analysis", "/risk")}
          {navItem("Analytics", "/analytics")}
          {navItem("Saved", "/saved")}
          {navItem("API Docs", "/docs")}
        </div>

      </div>
    </nav>
  );
}