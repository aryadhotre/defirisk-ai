// src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  ["Dashboard", "/dashboard"],
  ["Risk Analysis", "/risk"],
  ["Analytics", "/analytics"],
  ["Saved", "/saved"],
  ["API Docs", "/docs"],
];

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthed, user, logout } = useAuth();

  const onLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-line bg-canvas/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 h-[66px] flex items-center justify-between">
        <Link to="/" className="flex items-baseline group">
          <span className="font-display text-[25px] leading-none text-ink">DeFiRisk</span>
          <span className="font-mono text-[13px] font-bold tracking-[0.12em] text-heat ml-1.5">AI</span>
        </Link>

        <div className="flex items-center gap-7">
          {/* app links only when logged in */}
          {isAuthed &&
            LINKS.map(([label, to]) => {
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

          {isAuthed ? (
            <div className="flex items-center gap-4 pl-1">
              {user?.email && (
                <span className="font-mono text-[11px] text-faint hidden md:inline max-w-[180px] truncate">
                  {user.email}
                </span>
              )}
              <button
                onClick={onLogout}
                className="group relative font-mono text-[11.5px] tracking-[0.16em] uppercase py-1 text-dim hover:text-ink transition-colors duration-300 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="font-mono text-[11.5px] tracking-[0.16em] uppercase py-1 text-dim hover:text-ink transition-colors duration-300"
              >
                Login
              </Link>
              <Link to="/signup" className="btn btn-sm btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}