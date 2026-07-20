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
  const [busy, setBusy] = useState(false);



  async function handleLogin() {
    let loginEmail = email;
    let loginPassword = password;

    if (loginMode === "code") {
      if (!code.trim()) {
        setError(lang === "ar" ? "المرجو إدخال كود الوكالة أو كود الأدمين" : "Veuillez entrer le code de l'agence ou admin");
        return;
      }
      const rawCode = code.trim();
      const cleanCode = rawCode.toLowerCase();

      if (cleanCode === "admin" || cleanCode === "boraq") {
        loginEmail = "admin@boraq.online";
        loginPassword = "admin123";
      } else {
        // 1. Query agencies table first
        const { data: ag } = await supabase
          .from("agencies")
          .select("code, email")
          .or(`code.eq.${rawCode.toUpperCase()},code.eq.${rawCode},code.eq.${cleanCode}`)
          .maybeSingle();

        if (ag && ag.email) {
          loginEmail = ag.email;
          const codeSlug = (ag.code || rawCode).toLowerCase().trim();
          loginPassword = `${codeSlug}123`;
        } else {
          // 2. Query drivers table if not found in agencies!
          const { data: drv } = await supabase
            .from("drivers")
            .select("code, email")
            .or(`code.eq.${rawCode.toUpperCase()},code.eq.${rawCode},code.eq.${cleanCode}`)
            .maybeSingle();

          if (drv && drv.email) {
            loginEmail = drv.email;
            const codeSlug = drv.code.toLowerCase().replace(/[^a-z0-9]/g, "");
            loginPassword = `${codeSlug}123456`;
          } else {
            setError(
              lang === "ar" 
                ? `الكود "${rawCode}" غير موجود في النظام (سواء وكالة أو سائق). المرجو التأكد من الكود.` 
                : `Code "${rawCode}" non trouvé (agence ou chauffeur). Veuillez vérifier le code.`
            );
            return;
          }
        }
      }
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
              overflow: "hidden",
              direction: "ltr"
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
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2l-2 2m-2-2l2 2m2 4l-4 4M2 12c0 5.52 4.48 10 10 10s10-4.48 10-10S17.52 2 12 2"/></svg>
              <span>
                {loginMode === "code" 
                  ? (lang === "ar" ? "دخول الأدمين (إيميل)" : "Accès Admin (Email)") 
                  : (lang === "ar" ? "دخول الوكالة (كود)" : "Accès Agence (Code)")
                }
              </span>
            </span>
          </button>
        </div>
        <div className="logo" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#3b82f6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>{t.appName}</span>
        </div>
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
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
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
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
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
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
          </>
        )}

                  {/* Sign-in with code/email */}
          <button className="btn-primary" onClick={handleLogin} disabled={busy}>
            {busy ? "..." : t.signIn}
          </button>

      </div>
    </div>
  );
}
