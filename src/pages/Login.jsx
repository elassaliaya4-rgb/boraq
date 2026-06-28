import { useState } from "react";
import { useApp } from "../lib/context";

export default function Login() {
  const { t, lang, setLang, signIn } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError(t.fillAll);
      return;
    }
    setBusy(true);
    setError("");
    const err = await signIn(email, password);
    if (err) setError(t.loginError);
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <button
            className="btn-sm"
            onClick={() => setLang(lang === "ar" ? "fr" : "ar")}
          >
            🌐 {lang === "ar" ? "Français" : "العربية"}
          </button>
        </div>
        <div className="logo">⚡ {t.appName}</div>
        <div className="tagline">{t.tagline}</div>

        {error && <div className="error">{error}</div>}

        <div className="field">
          <label>{t.email}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@boraq.com"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>
        <div className="field">
          <label>{t.password}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        <button className="btn-primary" onClick={handleLogin} disabled={busy}>
          {busy ? "..." : t.signIn}
        </button>
      </div>
    </div>
  );
}
