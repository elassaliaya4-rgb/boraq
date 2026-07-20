import { useState, useEffect } from "react";
import { useApp } from "./lib/context";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AgencyPanel from "./pages/AgencyPanel";
import DriverPanel from "./pages/DriverPanel";
import TrackPage from "./pages/TrackPage";
import { Capacitor } from "@capacitor/core";
import { initPushNotifications } from "./lib/pushNotifications";

// Force Vercel redeploy stable morning state
export default function App() {
  const { user, profile, loading, dir, lang, signOut, t, toast, theme } = useApp();
  const [minSplashDone, setMinSplashDone] = useState(false);

  useEffect(() => {
    initPushNotifications();
  }, []);

  // Guarantee the 3D Rmook completes its full journey (1.8s) before revealing panel to eliminate lag!
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setMinSplashDone(true);
    }, 1800);
    return () => clearTimeout(splashTimer);
  }, []);

  // Dynamic document direction & language
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  // Public tracking page — accessible without login
  const isTrackPage = window.location.pathname === "/track";
  if (isTrackPage) return <TrackPage />;

  const isSplashVisible = loading || !minSplashDone;

  if (isSplashVisible) {
    return (
      <div className="splash-container">
        <div className="splash-logo-wrap">
          <div className="splash-logo-badge">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#38bdf8", filter: "drop-shadow(0 0 12px rgba(56, 189, 248, 0.6))" }}>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#38bdf8" />
            </svg>
          </div>
          <div className="splash-logo-text">
            <span>Bora</span><span style={{ color: "#f59e0b" }}>q</span>
          </div>
          <div className="splash-sub">LOGISTICS & MERCHANDISE</div>
        </div>

        {/* ── Real 3D Perspective Highway Road (Chantii 3D) + 3D Rmook Animation ── */}
        <div className="splash-3d-track">
          {/* Real 3D Perspective Highway Road Surface (Chantii 3D) */}
          <div className="splash-road-bed">
            <svg width="300" height="36" viewBox="0 0 300 36" fill="none">
              <rect x="0" y="0" width="300" height="36" fill="#0f172a" />
              <line x1="0" y1="2" x2="300" y2="2" stroke="#38bdf8" strokeWidth="2.5" opacity="0.8" />
              <line x1="0" y1="6" x2="300" y2="6" stroke="#f59e0b" strokeWidth="2" />
              <line x1="0" y1="18" x2="300" y2="18" stroke="#ffffff" strokeWidth="3" strokeDasharray="18 12" className="road-dashed-line" opacity="0.95" />
              <line x1="0" y1="30" x2="300" y2="30" stroke="#f59e0b" strokeWidth="2" />
              <line x1="0" y1="34" x2="300" y2="34" stroke="#38bdf8" strokeWidth="2.5" opacity="0.8" />
            </svg>
          </div>

          <div className="splash-3d-rmook">
            <svg width="100" height="46" viewBox="0 0 135 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="trailer3d" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="35%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="cab3d" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <radialGradient id="wheel3d" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="60%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#020617" />
                </radialGradient>
                <filter id="headlightGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 3D Exhaust Trail - 100% Strictly Behind the Truck (x < 22) */}
              <g className="rmook-exhaust">
                <circle cx="2" cy="39" r="2.5" fill="#38bdf8" opacity="0.25" />
                <circle cx="8" cy="39" r="3.8" fill="#38bdf8" opacity="0.45" />
                <circle cx="14" cy="39" r="5" fill="#38bdf8" opacity="0.65" />
              </g>

              {/* 3D Long Semi Trailer (Rmook) Body (Starts at x=22) */}
              <rect x="22" y="10" width="62" height="30" rx="3" fill="url(#trailer3d)" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1.5" />
              
              {/* Trailer 3D Lines & Branding */}
              <line x1="22" y1="20" x2="84" y2="20" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
              <line x1="22" y1="30" x2="84" y2="30" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" />
              <rect x="27" y="21" width="46" height="8" rx="2" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="0.8" />
              <text x="50" y="27" fill="#38bdf8" fontSize="5.5" fontWeight="900" textAnchor="middle" letterSpacing="0.6">BORAQ LOGISTICS</text>

              {/* Cab Connector */}
              <rect x="84" y="24" width="6" height="14" fill="#334155" />

              {/* 3D Heavy Cab (Tracteur) */}
              <path d="M88 16 H106 C110 16 114 20 116 25 L120 32 C121 34 121 40 121 40 H88 V16 Z" fill="url(#cab3d)" stroke="#f59e0b" strokeWidth="1.2" />
              
              {/* 3D Windshield Glass */}
              <path d="M98 19 H107 L112 27 H98 V19 Z" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" opacity="0.9" />

              {/* Glowing Headlight & Beam */}
              <circle cx="119" cy="35" r="2.5" fill="#fef08a" filter="url(#headlightGlow)" />
              <polygon points="119,33 137,28 137,42 119,37" fill="rgba(254, 240, 138, 0.2)" />

              {/* 3D Wheels (Chrome Rims) */}
              <circle cx="34" cy="42" r="6" fill="url(#wheel3d)" stroke="#38bdf8" strokeWidth="1.2" />
              <circle cx="34" cy="42" r="2" fill="#38bdf8" />

              <circle cx="48" cy="42" r="6" fill="url(#wheel3d)" stroke="#38bdf8" strokeWidth="1.2" />
              <circle cx="48" cy="42" r="2" fill="#38bdf8" />

              <circle cx="70" cy="42" r="6" fill="url(#wheel3d)" stroke="#f59e0b" strokeWidth="1.2" />
              <circle cx="70" cy="42" r="2" fill="#f59e0b" />

              <circle cx="104" cy="42" r="6" fill="url(#wheel3d)" stroke="#f59e0b" strokeWidth="1.2" />
              <circle cx="104" cy="42" r="2" fill="#f59e0b" />
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
