import { useEffect } from "react";
import { useApp } from "./lib/context";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AgencyPanel from "./pages/AgencyPanel";
import DriverPanel from "./pages/DriverPanel";
import TrackPage from "./pages/TrackPage";
import { Capacitor } from "@capacitor/core";

// Force Vercel redeploy stable morning state
export default function App() {
  const { user, profile, loading, dir, lang, signOut, t, toast, theme } = useApp();

  // Dynamic document direction & language
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  // Public tracking page — accessible without login
  const isTrackPage = window.location.pathname === "/track";
  if (isTrackPage) return <TrackPage />;

  if (loading) {
    return (
      <div className="splash-container">
        <div className="splash-logo-wrap">
          <div className="splash-logo-badge">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#38bdf8", filter: "drop-shadow(0 0 10px rgba(56, 189, 248, 0.5))" }}>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#38bdf8" />
            </svg>
          </div>
          <div className="splash-logo-text">
            <span>Bora</span><span style={{ color: "#f59e0b" }}>q</span>
          </div>
          <div className="splash-sub">LOGISTICS & MERCHANDISE</div>
        </div>

        <div className="splash-animation-box">
          <div className="splash-speed-lines"></div>
          <div className="splash-truck">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="url(#truckGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="truckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <rect x="1" y="3" width="15" height="13" rx="2" fill="rgba(56, 189, 248, 0.1)"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" fill="rgba(245, 158, 11, 0.1)"/>
              <circle cx="5.5" cy="18.5" r="2.5" fill="#38bdf8"/>
              <circle cx="18.5" cy="18.5" r="2.5" fill="#f59e0b"/>
            </svg>
          </div>
        </div>

        <div className="splash-loader-bar">
          <div className="splash-loader-fill"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className="global-toast">
          <div className="toast-icon">🔔</div>
          <div className="toast-body">{toast}</div>
        </div>
      )}
      {!user && <Login />}
      {user && profile?.role === "admin" && <AdminPanel />}
      {user && profile?.role === "agency" && <AgencyPanel />}
      {user && profile?.role === "driver" && <DriverPanel />}
      {user && !profile && (
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
      )}
    </>
  );
}
