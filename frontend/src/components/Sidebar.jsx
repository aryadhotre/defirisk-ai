import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 bg-[#0b0f17] border-r border-white/10 flex flex-col px-6 py-8">
      <div className="flex items-center gap-3 mb-10">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500">
          D
        </div>
        <div className="text-lg font-semibold tracking-tight">DeFiRisk</div>
      </div>

      <nav className="flex flex-col gap-4 text-white/70">
        <NavLink
          to="/app"
          className={({ isActive }) =>
            isActive ? "text-white font-medium" : "hover:text-white"
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/app/risk"
          className={({ isActive }) =>
            isActive ? "text-white font-medium" : "hover:text-white"
          }
        >
          Risk Analysis
        </NavLink>

        <NavLink
          to="/app/saved"
          className={({ isActive }) =>
            isActive ? "text-white font-medium" : "hover:text-white"
          }
        >
          Saved Projects
        </NavLink>
      </nav>
    </div>
  );
}
