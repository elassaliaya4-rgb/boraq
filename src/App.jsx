import { useApp } from "./lib/context";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AgencyPanel from "./pages/AgencyPanel";

export default function App() {
  const { user, profile, loading, dir, lang, signOut, t } = useApp();

  // ضبط اتجاه الصفحة حسب اللغة
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;

  if (loading) {
    return (
      <div className="login-wrap">
        <div className="logo">⚡ Boraq</div>
      </div>
    );
  }

  if (!user) return <Login />;

  // التوجيه حسب الدور
  if (profile?.role === "admin") return <AdminPanel />;
  if (profile?.role === "agency") return <AgencyPanel />;

  // المستخدم موجود ولكن بلا profile
  return (
    <div className="login-wrap">
      <div className="login-card" style={{ textAlign: "center" }}>
        <div className="logo">⚡ Boraq</div>
        <p style={{ color: "var(--text-dim)", marginTop: 14, marginBottom: 20 }}>
          Compte sans rôle. Contactez l'administrateur.
        </p>
        <button className="btn-primary" onClick={signOut}>
          Déconnexion / تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
