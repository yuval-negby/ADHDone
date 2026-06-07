import { useState } from "react";
import { supabase } from "../lib/supabase";

function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-logo">ADHme</h1>
        <p className="auth-tagline">Your ADHD-friendly day planner</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); setError(""); setMessage(""); }}
          >
            Log in
          </button>
          <button
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setError(""); setMessage(""); }}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
          />

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthPage;
