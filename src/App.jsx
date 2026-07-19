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

  // Public tracking page — accessible without login
  const isTrackPage = window.location.pathname === "/track";
  if (isTrackPage) return <TrackPage />;

  // Request Location & Notification Permissions natively on mobile startup with sound channels & fullscreen overlays
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // 1. Request native notifications permission & setup high-importance sound channel
      import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
        LocalNotifications.requestPermissions().then((status) => {
          console.log("LocalNotifications permission status:", status);
          
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

      // 3. Make App Immersive & Fullscreen (Overlay status bar with transparent background)
      import("@capacitor/status-bar").then(({ StatusBar }) => {
        StatusBar.setOverlaysWebView({ overlay: true }).then(() => {
          StatusBar.setBackgroundColor({ color: "#00000000" });
        }).catch(e => console.warn("Failed to overlay status bar:", e));
      }).catch(e => console.warn("Failed to load Status Bar module:", e));
    }
  }, []);

  // Intercept Android hardware back button/swipe-to-back gesture
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app").then(({ App: CapApp }) => {
        const listener = CapApp.addListener("backButton", () => {
          const hasModal = document.querySelector(".modal-bg");
          const hasSubtab = document.querySelector(".btn-accent");
          
          if (hasModal || hasSubtab) {
            window.dispatchEvent(new Event("appBackClick"));
          } else {
            CapApp.exitApp();
          }
        });
        return () => {
          listener.then(l => l.remove());
        };
      }).catch(err => console.warn("Failed to load native App plugin:", err));
    }
  }, []);

  // Dynamically update status bar theme icons (dark/light clock and battery)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
        const style = theme === "dark" ? Style.Dark : Style.Light;
        StatusBar.setStyle({ style }).catch(err => console.warn("Failed to set status bar style:", err));
      }).catch(err => console.warn("Failed to load status bar style module:", err));
    }
  }, [theme]);

  // Dynamic document direction & language
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

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
