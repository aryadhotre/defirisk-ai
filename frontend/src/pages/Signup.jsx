// src/pages/Signup.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Field({ label, type, value, onChange, placeholder, autoFocus }) {
  return (
    <div>
      <label className="label" style={{ fontSize: 10 }}>{label}</label>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl px-4 py-3 bg-canvas/60 border border-line text-ink placeholder:text-faint font-mono text-sm outline-none transition-colors focus:border-[#FFB23D]/50"
      />
    </div>
  );
}

export default function Signup() {
  const { signup, token } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
  }, [token, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setBusy(true);
    try {
      await signup(email.trim().toLowerCase(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-6 pt-24 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* plasma glow */}
        <div className="pointer-events-none absolute -inset-10 -z-0 opacity-60">
          <div className="absolute left-6 top-0 w-64 h-40 blur-[90px]" style={{ background: "radial-gradient(circle,#FFB23D,transparent 70%)" }} />
          <div className="absolute right-8 bottom-0 w-56 h-36 blur-[90px]" style={{ background: "radial-gradient(circle,#FF4D8D,transparent 72%)" }} />
        </div>

        <div className="panel relative z-10 p-8">
          <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />

          <div className="mb-7">
            <div className="label mb-3"><span className="live-dot mr-2" />New Account</div>
            <h1 className="font-display text-[38px] leading-none tracking-tight">Create account</h1>
            <p className="text-dim text-sm mt-2">Start tracking protocols in your own workspace.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@domain.com" autoFocus />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
            <Field label="Confirm Password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />

            {error && (
              <div className="rounded-lg border px-3.5 py-2.5 font-mono text-xs" style={{ color: "#FF5D5D", background: "rgba(255,93,93,.08)", borderColor: "rgba(255,93,93,.25)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !email || !password || !confirm}
              className="btn btn-primary w-full justify-center py-3.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <>Create account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-dim text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-heat font-medium hover:brightness-125">Log in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}