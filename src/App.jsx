import { useEffect } from "react";
import { useApp } from "./lib/context";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AgencyPanel from "./pages/AgencyPanel";
import DriverPanel from "./pages/DriverPanel";
import { Capacitor } from "@capacitor/core";

export default function App() {
  const { user, profile, loading, dir, lang, signOut, t, toast } = useApp();

  // Request Location & Notification Permissions natively f mobile view on startup
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // 1. Request native notification permission (Android 13+ support)
      import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
        LocalNotifications.requestPermissions().then((status) => {
          console.log("LocalNotifications permission status:", status);
        }).catch(err => console.warn("LocalNotifications permission err:", err));
      }).catch(err => console.warn("Failed to load native notifications module:", err));

      // 2. Request native location permission dialog on startup
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => console.log("Location permission granted on startup"),
          (err) => console.warn("Location permission startup err:", err),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity }
        );
      }
    }
  }, []);

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
