import { useEffect } from "react";
import { useApp } from "./lib/context";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AgencyPanel from "./pages/AgencyPanel";
import DriverPanel from "./pages/DriverPanel";
import { Capacitor } from "@capacitor/core";

export default function App() {
  const { user, profile, loading, dir, lang, signOut, t, toast } = useApp();

  // Request Location & Notification Permissions natively on mobile startup with sound channels
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // 1. Request native notifications permission & setup high-importance sound channel
      import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
        LocalNotifications.requestPermissions().then((status) => {
          console.log("LocalNotifications permission status:", status);
          
          // Create high importance audio channel to enable notification sounds on lock screen/background
          LocalNotifications.createChannel({
            id: "boraq-alerts",
            name: "Boraq Alerts",
            description: "Alert sound notifications for Boraq Logistics",
            importance: 5, // High importance -> pops banner and rings sound
            sound: "beep.wav",
            visibility: 1, // Visible on lock screen
            vibration: true
          }).then(() => {
            console.log("High-priority audio channel 'boraq-alerts' created.");
          }).catch(err => console.warn("Failed to create audio channel:", err));
        }).catch(err => console.warn("LocalNotifications permission err:", err));
      }).catch(err => console.warn("Failed to load native notifications module:", err));

      // 2. Request native geolocation permission via official Capacitor plugin
      import("@capacitor/geolocation").then(({ Geolocation }) => {
        Geolocation.requestPermissions().then((status) => {
          console.log("Native Geolocation permission status:", status);
        }).catch(err => console.warn("Native Geolocation permission err:", err));
      }).catch(err => console.warn("Failed to load native Geolocation module:", err));
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
