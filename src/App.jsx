import { useApp } from "./lib/context";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AgencyPanel from "./pages/AgencyPanel";
import DriverPanel from "./pages/DriverPanel";

export default function App() {
  const { user, profile, loading, dir, lang, signOut, t } = useApp();

  // ضبط اتجاه الصفحة حسب اللغة
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;

  if (loading) {
    return (
      <div className="splash-container">
        <div className="splash-logo-wrap">
          <div className="splash-logo-text">⚡ Boraq</div>
          <div className="splash-sub">LOGISTICS & MERCHANDISE</div>
        </div>
        <div className="splash-animation-box">
          <div className="splash-speed-lines"></div>
          <div className="splash-truck">🚚💨</div>
        </div>
        <div className="splash-loader-bar">
          <div className="splash-loader-fill"></div>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  // التوجيه حسب الدور
  if (profile?.role === "admin") return <AdminPanel />;
  if (profile?.role === "agency") return <AgencyPanel />;
  if (profile?.role === "driver") return <DriverPanel />;

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
