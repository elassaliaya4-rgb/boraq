import { useApp } from "./lib/context";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AgencyPanel from "./pages/AgencyPanel";

export default function App() {
  const { user, profile, loading, dir, lang } = useApp();

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
        <p style={{ color: "var(--text-dim)", marginTop: 14 }}>
          Compte sans rôle. Contactez l'administrateur.
        </p>
      </div>
    </div>
  );
}
