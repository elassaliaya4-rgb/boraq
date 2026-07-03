import { useState } from "react";
import { useApp } from "../lib/context";

export default function Login() {
  const { t, lang, setLang, signIn } = useApp();
  const [loginMode, setLoginMode] = useState("code"); // 'code' or 'email'
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    let loginEmail = email;
    let loginPassword = password;

    if (loginMode === "code") {
      if (!code) {
        setError(lang === "ar" ? "المرجو إدخال كود الوكالة" : "Veuillez entrer le code de l'agence");
        return;
      }
      loginEmail = `${code.toLowerCase().trim()}@boraq.com`;
      loginPassword = `${code.toLowerCase().trim()}123`;
    } else {
      if (!email || !password) {
        setError(t.fillAll);
        return;
      }
    }

    setBusy(true);
    setError("");
    const err = await signIn(loginEmail, loginPassword);
    if (err) setError(t.loginError);
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
          <button
            className="btn-sm"
            onClick={() => setLang(lang === "ar" ? "fr" : "ar")}
          >
            🌐 {lang === "ar" ? "Français" : "العربية"}
          </button>
          <button
            className="btn-sm"
            onClick={() => {
              setLoginMode(loginMode === "code" ? "email" : "code");
              setError("");
            }}
            style={{ background: "rgba(0,0,0,0.05)", border: "1px solid var(--border)" }}
          >
            🔑 {loginMode === "code" 
              ? (lang === "ar" ? "دخول الأدمين (إيميل)" : "Accès Admin (Email)") 
              : (lang === "ar" ? "دخول الوكالة (كود)" : "Accès Agence (Code)")
            }
          </button>
        </div>
        <div className="logo">⚡ {t.appName}</div>
        <div className="tagline">{t.tagline}</div>

        {error && <div className="error">{error}</div>}

        {loginMode === "code" ? (
          <div className="field">
            <label>{lang === "ar" ? "كود الوكالة" : "Code de l'agence"}</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="AG-001"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{ textTransform: "uppercase" }}
            />
          </div>
        ) : (
          <>
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
          </>
        )}

        <button className="btn-primary" onClick={handleLogin} disabled={busy}>
          {busy ? "..." : t.signIn}
        </button>
      </div>
    </div>
  );
}
