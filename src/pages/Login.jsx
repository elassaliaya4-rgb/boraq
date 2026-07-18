import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function Login() {
  const { t, lang, setLang, signIn } = useApp();
  const [loginMode, setLoginMode] = useState("code"); // 'code' or 'email'
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Process OAuth redirect callback (required for PKCE flow on mobile)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSessionFromUrl({
        storeSession: true,
        // automatically redirects to landing page after handling
      });
      if (error) setError(error.message);
    })();
  }, []);


  // Google OAuth login handler
  async function handleGoogleLogin() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        setError(error.message);
      }
    } catch (e) {
      console.error('Google login error:', e);
      setError('Google login failed');
    }
  }

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
    if (err) {
      setError(t.loginError);
      setBusy(false);
    } else {
      // Validate that the logged-in user actually has a valid profile in the database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!prof) {
          // No profile found! Meaning they were deleted by the admin.
          await supabase.auth.signOut();
          setError(lang === "ar" ? "الكود غير صالح أو تم حذفه" : "Code invalide ou supprimé");
          setBusy(false);
          return;
        }
      }
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
          {/* ── Premium Sliding Language Toggle ── */}
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              borderRadius: "30px",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              padding: "2px",
              cursor: "pointer",
              userSelect: "none",
              height: "34px",
              width: "105px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              overflow: "hidden"
            }}
            onClick={() => setLang(lang === "ar" ? "fr" : "ar")}
          >
            {/* Sliding active pill */}
            <div style={{
              position: "absolute",
              top: "2px",
              bottom: "2px",
              left: lang === "fr" ? "2px" : "calc(50% + 1px)",
              width: "calc(50% - 3px)",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
              borderRadius: "30px",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
              transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: 1
            }} />

            {/* FR Option */}
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "800",
              color: lang === "fr" ? "#fff" : "var(--text-dim)",
              zIndex: 2,
              transition: "color 0.2s"
            }}>
              FR
            </div>

            {/* AR Option */}
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "800",
              color: lang === "ar" ? "#fff" : "var(--text-dim)",
              zIndex: 2,
              transition: "color 0.2s"
            }}>
              عربي
            </div>
          </div>
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

                  {/* Sign-in with code/email */}
          <button className="btn-primary" onClick={handleLogin} disabled={busy}>
            {busy ? "..." : t.signIn}
          </button>
          {/* Google OAuth login */}
          <button className="btn-primary" style={{marginTop: "8px"}} onClick={handleGoogleLogin}>
            Google
          </button>

      </div>
    </div>
  );
}
