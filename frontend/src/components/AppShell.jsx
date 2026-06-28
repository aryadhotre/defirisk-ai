// src/components/AppShell.jsx
import { Outlet } from "react-router-dom";

// Centered content frame for the app pages.
// Navbar + ambient background are rendered globally in App.jsx so they stay
// persistent (no flash) across route transitions.
export default function AppShell() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-28 pb-24">
      <Outlet />
    </main>
  );
}