// src/components/AppShell.jsx
import { Outlet, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AppShell({ onRefresh }) {
  return (
    <div className="flex min-h-screen bg-[#0a0e14] text-white">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        {/* persistent background glows */}
        <div className="fixed inset-0 -z-10 bg-[#0a0e14]" />
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 -left-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-[140px]" />
          <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-[160px]" />
        </div>

        {/* top bar */}
        <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0e14]/60 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <h1 className="text-lg font-semibold tracking-tight text-white/90">Dashboard</h1>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <a href="https://defirisk-ai-backend.onrender.com/docs" className="hover:text-white">API Docs</a>
              <span className="opacity-30">•</span>
              <button
                onClick={onRefresh}
                className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/5 transition"
              >
                Refresh
              </button>
              <span className="opacity-30">•</span>
              <Link to="/" className="rounded-lg px-3 py-1.5 text-white/70 hover:text-white">Home</Link>
            </div>
          </div>
        </div>

        {/* nested pages */}
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
