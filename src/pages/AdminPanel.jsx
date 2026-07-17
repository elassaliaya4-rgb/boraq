import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import { createClient } from "@supabase/supabase-js";
import PackageForm from "../components/PackageForm";
import PackageDetails from "../components/PackageDetails";
import Scanner from "../components/Scanner";
import PackagesTable from "../components/PackagesTable";
import MobileHeader from "../components/MobileHeader";
import MobileBottomNav from "../components/MobileBottomNav";
import { Capacitor } from "@capacitor/core";

export default function AdminPanel() {
  const { t, lang, setLang, signOut, profile, user, triggerToast, theme, toggleTheme } = useApp();
  const isMobileAPK = Capacitor.getPlatform() === "android" || Capacitor.getPlatform() === "ios";
  const [tab, setTab] = useState("dashboard");

  function confirmSignOut() {
    const msg = lang === "ar" ? "هل تريد تسجيل الخروج؟" : "Voulez-vous vous déconnecter ?";
    if (window.confirm(msg)) {
      signOut();
    }
  }
  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [showAgForm, setShowAgForm] = useState(false);
  const [showDrForm, setShowDrForm] = useState(false);
  const [detailPkg, setDetailPkg] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [mapDriver, setMapDriver] = useState(null);
  const [scannedSessionPkgs, setScannedSessionPkgs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("boraq_scan_session_admin") || "[]"); }
    catch { return []; }
  });
  const [scanFilterAgency, setScanFilterAgency] = useState("");

  // Auto-save scan session to localStorage so it survives refresh
  useEffect(() => {
    try { localStorage.setItem("boraq_scan_session_admin", JSON.stringify(scannedSessionPkgs)); }
    catch {}
  }, [scannedSessionPkgs]);

  const unread = notifs?.filter((n) => !n.is_read)?.length || 0;

  // Handle native Android back button to dismiss modals/subtabs
  useEffect(() => {
    const handleBack = () => {
      if (detailPkg) {
        setDetailPkg(null);
      } else if (showPkgForm) {
        setShowPkgForm(false);
      } else if (showAgForm) {
        setShowAgForm(false);
      } else if (showDrForm) {
        setShowDrForm(false);
      } else if (showScanner) {
        setShowScanner(false);
      } else if (mapDriver) {
        setMapDriver(null);
      } else if (tab !== "dashboard") {
        setTab("dashboard");
      }
    };
    window.addEventListener("appBackClick", handleBack);
    return () => window.removeEventListener("appBackClick", handleBack);
  }, [detailPkg, showPkgForm, showAgForm, showDrForm, showScanner, mapDriver, tab]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("admin-notifs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "target=eq.admin",
        },
        (payload) => {
          triggerToast(payload.new.message);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // pull-to-refresh reload handler for mobile viewports
  useEffect(() => {
    let startY = 0;
    let pullDelta = 0;

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      } else {
        startY = 0;
      }
      pullDelta = 0;
    };

    const handleTouchMove = (e) => {
      if (startY <= 0) return;
      const currentY = e.touches[0].clientY;
      pullDelta = currentY - startY;
    };

    const handleTouchEnd = () => {
      if (startY > 0 && pullDelta > 120 && window.scrollY === 0) {
        try {
          if (navigator.vibrate) navigator.vibrate(60);
        } catch (e) {}
        window.location.reload();
      }
      startY = 0;
      pullDelta = 0;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    let mapInstance = null;

    if (mapDriver) {
      if (!document.getElementById("leaflet-css")) {
        const css = document.createElement("link");
        css.id = "leaflet-css";
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
      }
      if (!window.L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = initMap;
        document.body.appendChild(script);
      } else {
        setTimeout(initMap, 150);
      }
    }

    function initMap() {
      if (!mapDriver?.latitude || !mapDriver?.longitude) return;
      const container = document.getElementById("live-map");
      if (!container) return;

      try {
        mapInstance = window.L.map("live-map").setView([mapDriver.latitude, mapDriver.longitude], 15);
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap"
        }).addTo(mapInstance);

        const deliveryIcon = window.L.divIcon({
          html: '<div style="font-size: 32px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4)); animation: map-pulse 1.8s infinite ease-in-out;">🚚</div>',
          className: "custom-leaflet-icon",
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const marker = window.L.marker([mapDriver.latitude, mapDriver.longitude], { icon: deliveryIcon }).addTo(mapInstance);
        marker.bindPopup(`<b>${mapDriver.name}</b><br>🛰️ GPS Live Position`).openPopup();
      } catch (err) {
        console.warn("Map error:", err);
      }
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [mapDriver]);

  async function loadData() {
    const { data: pkgs } = await supabase
      .from("packages")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: ags } = await supabase
      .from("agencies")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: nts } = await supabase
      .from("notifications")
      .select("*")
      .eq("target", "admin")
      .order("created_at", { ascending: false });
    const { data: drvs } = await supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });
    setPackages(pkgs || []);
    setAgencies(ags || []);
    setNotifs(nts || []);
    setDrivers(drvs || []);

    if (ags && ags.length > 0 && !scanFilterAgency) {
      setScanFilterAgency(ags[0].name);
    }
  }

  async function openNotif(n) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    const pkg = packages.find((p) => p.id === n.package_id);
    if (pkg) setDetailPkg(pkg);
    loadData();
  }

  async function deleteAgency(a) {
    const count = packages.filter((p) => p.agency_id === a.id).length;
    const msg =
      lang === "ar"
        ? `واش متأكد بغيتي تمسح "${a.name}"؟` +
          (count > 0 ? `\n⚠️ عندو ${count} طرد، غادي يتمسحو تا هوما.` : "")
        : `Supprimer "${a.name}" ?` +
          (count > 0 ? `\n⚠️ ${count} colis seront aussi supprimés.` : "");
    if (!window.confirm(msg)) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", a.id)
      .maybeSingle();

    const userId = prof?.id || null;

    const { error } = await supabase.rpc("delete_agency", { age_id: a.id, usr_id: userId });
    if (error) {
      alert("Error: " + error.message);
    }
    loadData();
  }

  async function deleteDriver(d) {
    const msg = lang === "ar" ? `هل تريد حذف السائق "${d.name}"؟` : `Supprimer le chauffeur "${d.name}" ?`;
    if (!window.confirm(msg)) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("driver_id", d.id)
      .maybeSingle();

    const userId = prof?.id || null;

    const { error } = await supabase.rpc("delete_driver", { drv_id: d.id, usr_id: userId });
    if (error) {
      alert("Error: " + error.message);
    }
    loadData();
  }

  async function deletePackage(p) {
    const msg =
      lang === "ar"
        ? `واش متأكد بغيتي تمسح الطرد "${p.tracking_number}"؟`
        : `Supprimer le colis "${p.tracking_number}" ?`;
    if (!window.confirm(msg)) return;
    await supabase.from("packages").delete().eq("id", p.id);
    loadData();
  }

  function handleScanResult(text) {
    setShowScanner(false);
    // كنحاولو نستخرجو رقم التتبع من النص
    let tracking = text;
    try {
      const obj = JSON.parse(text);
      tracking = obj.n || obj.tracking_number || text;
    } catch (e) {}
    // قلب على الطرد فاللائحة
    const found = packages.find(
      (p) => p.tracking_number === tracking || p.tracking_number === text
    );
    if (found) setDetailPkg(found);
    else alert(t.notFound + ": " + tracking);
  }

  return (
    <div className={`app ${isMobileAPK ? "native-apk" : ""}`} style={isMobileAPK ? { flexDirection: "column" } : {}}>
      <MobileHeader 
        profileName={profile?.name || user?.email}
        onScanClick={() => setShowScanner(true)}
        onLogout={confirmSignOut}
      />
      <div style={isMobileAPK ? { display: "flex", flex: 1, width: "100%", overflow: "hidden" } : { display: "contents" }}>
        <aside className="sidebar">
          <div className="logo" style={{ fontSize: 22, marginBottom: 18 }}>⚡ {t.appName}</div>
        <div className="nav-grid">
          <NavBtn
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3m0 4h4v-4m-4 0h4"/></svg>}
            iconColor="#818cf8"
            label={t.dashboard} active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
          <NavBtn
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/><circle cx="18.5" cy="15.5" r="2.5"/><path d="M20.27 17.27 22 19"/></svg>}
            iconColor="#38bdf8"
            label={t.packages} active={tab === "packages"} onClick={() => setTab("packages")} />
          <NavBtn
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><polyline points="7 12 10 15 17 8"/></svg>}
            iconColor="#34d399"
            label={lang === "ar" ? "التحقق والمسح" : "Scan & Validation"} active={tab === "scan_session"} onClick={() => setTab("scan_session")} />
          <NavBtn
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
            iconColor="#fb923c"
            label={t.agencies} active={tab === "agencies"} onClick={() => setTab("agencies")} />
          <NavBtn
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
            iconColor="#facc15"
            label={lang === "ar" ? "السائقين" : "Chauffeurs"} active={tab === "drivers"} onClick={() => setTab("drivers")} />
          <NavBtn
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
            iconColor="#f472b6"
            label={t.notifications} active={tab === "notifs"} onClick={() => setTab("notifs")} badge={unread} />
        </div>
        
        {/* Premium Logout Button at bottom of sidebar */}
        <div style={{ marginTop: "auto", paddingTop: 16, paddingBottom: 4 }}>
          <button 
            onClick={confirmSignOut}
            style={{ 
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 6px 22px rgba(239,68,68,0.5)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(239,68,68,0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <span style={{ flex: 1, fontSize: "13px", fontWeight: "700", color: "#fff", textAlign: "start" }}>
              {lang === "ar" ? "تسجيل الخروج" : "Déconnexion"}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round">
              <polyline points={lang === "ar" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
            </svg>
          </button>
        </div>
      </aside>

      <main className="main" style={isMobileAPK ? { paddingTop: "10px", paddingBottom: "96px", width: "100%", overflowY: "auto" } : {}}>
        <div className="topbar" style={isMobileAPK ? { display: "none" } : {}}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {tab !== "dashboard" && (
              <button 
                onClick={() => setTab("dashboard")} 
                className="btn-accent" 
                style={{ 
                  padding: "6px 12px", 
                  fontSize: 13, 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: 5,
                  cursor: "pointer",
                  borderRadius: 6
                }}
              >
                {lang === "ar" ? "→ رجوع" : "← Retour"}
              </button>
            )}
            <h1>{t.adminPanel}</h1>
          </div>
          <div className="topbar-actions">
            {/* ── Premium Scan Button ── */}
            <button
              onClick={() => setShowScanner(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                fontSize: "13px",
                fontWeight: "700",
                borderRadius: "12px",
                cursor: "pointer",
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                border: "1px solid rgba(99,102,241,0.4)",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                letterSpacing: "0.02em",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(99,102,241,0.55)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M3 17v2a2 2 0 0 0 2 2h2"/>
                <line x1="7" y1="12" x2="17" y2="12"/>
              </svg>
              <span>{t.scan}</span>
            </button>

            {/* ── Premium Sliding Language Toggle ── */}
            <div
              className="lang-selector-desktop"
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                padding: "2px",
                cursor: "pointer",
                userSelect: "none",
                height: "38px",
                width: "125px",
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
                borderRadius: "9px",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.4)",
                transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                zIndex: 1
              }} />

              {/* FR Option */}
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: "700",
                color: lang === "fr" ? "#fff" : "var(--text-dim)",
                zIndex: 2,
                transition: "color 0.2s"
              }}>
                <span style={{ fontSize: "14px" }}>🇫🇷</span>
                <span>FR</span>
              </div>

              {/* AR Option */}
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: "700",
                color: lang === "ar" ? "#fff" : "var(--text-dim)",
                zIndex: 2,
                transition: "color 0.2s"
              }}>
                <span style={{ fontSize: "14px" }}>🇲🇦</span>
                <span>عربي</span>
              </div>
            </div>

            {/* ── Theme Toggle ── */}
            <button
              className="theme-toggle-desktop"
              onClick={toggleTheme}
              style={{
                width: "38px",
                height: "38px",
                padding: 0,
                fontSize: "16px",
                borderRadius: "12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
              title={lang === "ar" ? "تغيير المظهر" : "Changer le thème"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
        </div>
      </div>

        {/* Session Scanned Packages Tray */}
        {scannedSessionPkgs.length > 0 && (
          <div style={{
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pulse-green-dot" style={{ width: 8, height: 8, background: "#10b981", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 10px #10b981" }}></span>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {lang === "ar" ? "الطرود الممسوحة حديثاً" : "Scannés Récemment"}
                </h3>
                <span style={{ fontSize: 10, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 6px", borderRadius: 8, fontWeight: "700" }}>
                  {scannedSessionPkgs.length}
                </span>
              </div>
              <button 
                onClick={() => { setScannedSessionPkgs([]); localStorage.removeItem("boraq_scan_session_admin"); }}
                style={{ 
                  background: "none", 
                  border: "none", 
                  color: "#ef4444", 
                  fontSize: 11, 
                  cursor: "pointer", 
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                🗑️ {lang === "ar" ? "مسح" : "Vider"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {scannedSessionPkgs.map((p) => (
                <div key={p.id} style={{
                  background: "rgba(30, 41, 59, 0.45)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: "50%", 
                      background: "rgba(16, 185, 129, 0.12)", 
                      color: "#10b981", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: "bold",
                      flexShrink: 0
                    }}>
                      ✓
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{p.tracking_number}</span>
                        <span style={{ fontSize: 9, background: "rgba(16,185,129,0.12)", color: "#10b981", padding: "1px 6px", borderRadius: 4 }}>
                          {t[p.status] || p.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.sender_name} → {p.destination || p.receiver_name}
                      </div>
                    </div>
                  </div>
                  <button 
                    className="btn-manage" 
                    onClick={() => setDetailPkg(p)}
                    style={{ 
                      padding: "6px 10px", 
                      fontSize: 11, 
                      borderRadius: 8, 
                      background: "rgba(255,255,255,0.05)", 
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: "600",
                      flexShrink: 0
                    }}
                  >
                    ⚙️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "scan_session" && (
          <>
            <div className="row-head" style={{ marginBottom: 16 }}>
              <h2>✅ {lang === "ar" ? "بوابة التحقق والمسح" : "Centre de Vérification"}</h2>
              <button 
                onClick={() => setShowScanner(true)} 
                className="btn-accent"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: "bold",
                  borderRadius: 10,
                  boxShadow: "0 0 15px rgba(251, 191, 36, 0.25)"
                }}
              >
                📷 {lang === "ar" ? "ابدأ مسح طرد جديد" : "Démarrer le Scan"}
              </button>
            </div>

            {/* Filter by Agency / Route */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: "600" }}>
                  {lang === "ar" ? "تصفية حسب الوكالة (المنشأ):" : "Filtrer par Agence d'origine:"}
                </span>
                <select 
                  value={scanFilterAgency} 
                  onChange={(e) => setScanFilterAgency(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: 13,
                    fontWeight: "600"
                  }}
                >
                  {agencies.map(a => (
                    <option key={a.id} value={a.name}>{a.name} ({a.city})</option>
                  ))}
                </select>
              </div>

              {/* Progress counter */}
              {(() => {
                const filteredPkgs = packages.filter(p => p.origin === scanFilterAgency);
                const totalCount = filteredPkgs.length;
                const verifiedCount = filteredPkgs.filter(p => scannedSessionPkgs.some(s => s.id === p.id)).length;
                const percent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;
                
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: "700" }}>
                        {lang === "ar" ? `التحقق: ${verifiedCount} / ${totalCount}` : `Validés: ${verifiedCount} / ${totalCount}`}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                        {lang === "ar" ? `${percent}% من الإجمالي` : `${percent}% du total`}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ width: 100, height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${percent}%`, height: "100%", background: "#10b981", borderRadius: 4, transition: "width 0.3s ease" }}></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Validation Checklist Grid */}
            {(() => {
              const filteredPkgs = packages.filter(p => p.origin === scanFilterAgency);
              
              if (filteredPkgs.length === 0) {
                return (
                  <div style={{ padding: 40, textAlign: "center", background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 16, color: "var(--text-dim)" }}>
                    📭 {lang === "ar" ? "لا توجد طرود لهذه الوكالة حالياً" : "Aucun colis trouvé pour cette origine"}
                  </div>
                );
              }

              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                  {filteredPkgs.map((p) => {
                    const isValidated = scannedSessionPkgs.some(s => s.id === p.id);
                    return (
                      <div 
                        key={p.id} 
                        style={{
                          background: isValidated ? "rgba(16, 185, 129, 0.08)" : "var(--surface)",
                          border: isValidated ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border)",
                          borderInlineStart: isValidated ? "4px solid #10b981" : "4px solid var(--text-dim)",
                          borderRadius: 12,
                          padding: 14,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          boxShadow: isValidated ? "0 4px 15px rgba(16, 185, 129, 0.08)" : "none",
                          transition: "all 0.25s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: isValidated ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.05)",
                            color: isValidated ? "#10b981" : "var(--text-dim)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                            fontWeight: "bold",
                            flexShrink: 0
                          }}>
                            {isValidated ? "✓" : "⏳"}
                          </div>
                          
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, color: isValidated ? "#10b981" : "var(--text)" }}>
                              <span>{p.tracking_number}</span>
                              <span style={{ 
                                fontSize: 9, 
                                background: isValidated ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.08)", 
                                color: isValidated ? "#10b981" : "var(--text-dim)", 
                                padding: "1px 6px", 
                                borderRadius: 4 
                              }}>
                                {isValidated ? (lang === "ar" ? "مقبول" : "Valide") : (lang === "ar" ? "في الانتظار" : "En attente")}
                              </span>
                            </div>
                            <div className="card-meta-row" style={{ fontSize: 11, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.sender_name} ({p.origin}) ➔ {p.receiver_name}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button 
                            className="btn-manage" 
                            onClick={() => setDetailPkg(p)}
                            style={{ 
                              padding: "6px 10px", 
                              fontSize: 11, 
                              borderRadius: 8, 
                              background: "rgba(255,255,255,0.05)", 
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: "600"
                            }}
                          >
                            ⚙️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}

        {tab === "dashboard" && (
          <>
            <div className="stats">
              <Stat val={packages?.length || 0} lbl={t.totalPackages} onClick={() => setTab("packages")} />
              <Stat val={agencies?.length || 0} lbl={t.totalAgencies} onClick={() => setTab("agencies")} />
              <Stat val={packages?.filter((p) => p?.status === "arrived")?.length || 0} lbl={t.newArrivals} onClick={() => setTab("packages")} />
            </div>
            <PkgHeader t={t} onAdd={() => setShowPkgForm(true)} />
            <PackagesTable packages={packages} onManage={setDetailPkg} onRefresh={loadData} />
          </>
        )}

        {tab === "packages" && (
          <>
            <PkgHeader t={t} onAdd={() => setShowPkgForm(true)} />
            <PackagesTable packages={packages} onManage={setDetailPkg} onRefresh={loadData} />
          </>
        )}

        {tab === "agencies" && (
          <>
            <div className="row-head">
              <h2>{t.agencies}</h2>
              <button className="btn-accent btn-sm" onClick={() => setShowAgForm(true)}>{t.addAgency}</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t.name}</th><th>{t.code}</th><th>{t.city}</th><th>{t.packages}</th><th>{t.actions}</th></tr></thead>
                <tbody>
                  {agencies?.map((a) => (
                    <tr key={a.id}>
                      <td><b>{a.name}</b></td><td>{a.code}</td><td>{a.city}</td>
                      <td>{packages?.filter((p) => p?.agency_id === a?.id)?.length || 0}</td>
                      <td><button className="btn-danger btn-sm" onClick={() => deleteAgency(a)}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "notifs" && (
          <div>
            {!notifs || notifs.length === 0 ? (
              <div className="notif">{t.noNotifications}</div>
            ) : (
              notifs.map((n) => (
                <div key={n.id} className={`notif clickable ${n.is_read ? "" : "unread-admin"}`} onClick={() => openNotif(n)}>
                  <div className="icon">📦</div>
                  <div className="body">
                    <div className="msg">{t.newPackageAdmin} {n.agency_name}: <b>{n.message}</b></div>
                    <div className="hint">👆 {t.tapSee}</div>
                  </div>
                  <div className="chev">{lang === "ar" ? "‹" : "›"}</div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "drivers" && (
          <>
            <div className="row-head">
              <h2>{lang === "ar" ? "السائقين" : "Chauffeurs"}</h2>
              <button className="btn-accent btn-sm" onClick={() => setShowDrForm(true)}>
                + {lang === "ar" ? "إضافة سائق" : "Ajouter Chauffeur"}
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.code}</th>
                    <th>{lang === "ar" ? "الحالة" : "Statut"}</th>
                    <th>{lang === "ar" ? "الموقع" : "Localisation"}</th>
                    <th>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers?.map((d) => {
                    const isOnline = d.last_active && (new Date() - new Date(d.last_active)) < 180000;
                    return (
                      <tr key={d.id}>
                        <td><b>{d.name}</b></td>
                        <td>{d.code}</td>
                        <td>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            background: isOnline ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                            color: isOnline ? "#22c55e" : "#cbd5e1"
                          }}>
                            {isOnline 
                              ? (lang === "ar" ? "🟢 متصل" : "🟢 En ligne") 
                              : (lang === "ar" ? "🔴 غير متصل" : "🔴 Hors-ligne")
                            }
                          </span>
                        </td>
                        <td>
                          {d.latitude && d.longitude ? (
                            <button
                              onClick={() => setMapDriver(d)}
                              className="btn-primary"
                              style={{
                                padding: "4px 10px",
                                fontSize: 12,
                                borderRadius: 6,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                width: "auto"
                              }}
                            >
                              📍 {lang === "ar" ? "تحديد الموقع" : "Localiser"}
                            </button>
                          ) : (
                            <span style={{ color: "var(--text-dim)", fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          <button className="btn-danger btn-sm" onClick={() => deleteDriver(d)}>🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {showPkgForm && (
        <PackageForm agencies={agencies} onClose={() => setShowPkgForm(false)} onSaved={() => { setShowPkgForm(false); loadData(); }} />
      )}
      {showAgForm && (
        <AgencyForm onClose={() => setShowAgForm(false)} onSaved={() => { setShowAgForm(false); loadData(); }} />
      )}
      {detailPkg && (
        <PackageDetails 
          pkg={detailPkg} 
          agencies={agencies} 
          onClose={() => setDetailPkg(null)} 
          onUpdated={() => { loadData(); setDetailPkg(null); }} 
          onDelete={deletePackage}
        />
      )}
      {showScanner && (
        <Scanner
          agencies={agencies}
          onOpenPackage={(pkg) => { 
            setShowScanner(false); 
            const updatedPkg = { ...pkg, status: "inTransit" };
            setScannedSessionPkgs(prev => [updatedPkg, ...prev.filter(p => p.id !== pkg.id)]);
          }}
          onClose={() => setShowScanner(false)}
          onUpdated={loadData}
        />
      )}
      {showDrForm && (
        <ChauffeurForm onClose={() => setShowDrForm(false)} onSaved={() => { setShowDrForm(false); loadData(); }} />
      )}
      {mapDriver && (
        <div className="modal-bg" onClick={() => setMapDriver(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <h2>📍 {lang === "ar" ? `موقع السائق: ${mapDriver.name}` : `Position de ${mapDriver.name}`}</h2>
              <button className="btn-close" onClick={() => setMapDriver(null)}>✕</button>
            </div>
            <div style={{ padding: "10px 0 0 0" }}>
              <div id="live-map" style={{ width: "100%", height: "400px", borderRadius: 12, background: "#1e293b" }}></div>
              <div style={{ marginTop: 15, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapDriver.latitude},${mapDriver.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary btn-sm"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  🗺️ {lang === "ar" ? "فتح في Google Maps" : "Ouvrir f Google Maps"}
                </a>
                <button className="btn-primary btn-sm" onClick={() => setMapDriver(null)}>
                  {lang === "ar" ? "إغلاق" : "Fermer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
      <MobileBottomNav 
        activeTab={tab}
        onChange={setTab}
        tabs={[
          {
            id: "dashboard",
            label: t.dashboard,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
            )
          },
          {
            id: "packages",
            label: t.packages,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            )
          },
          {
            id: "scan_session",
            label: lang === "ar" ? "التحقق" : "Vérifier",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 11 11 13 15 9" />
              </svg>
            )
          },
          {
            id: "agencies",
            label: t.agencies,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <line x1="9" y1="22" x2="9" y2="16" />
                <line x1="9" y1="16" x2="15" y2="16" />
                <line x1="15" y1="16" x2="15" y2="22" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="9" y1="12" x2="15" y2="12" />
              </svg>
            )
          },
          {
            id: "drivers",
            label: lang === "ar" ? "السائقين" : "Chauffeurs",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            )
          },
          {
            id: "notifs",
            label: t.notifications,
            badge: unread,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            )
          }
        ]}
      />
    </div>
  );
}

function NavBtn({ icon, iconColor, label, active, onClick, badge }) {
  return (
    <button
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "12px" }}
    >
      {/* SVG Icon Badge */}
      <div style={{
        width: "34px",
        height: "34px",
        borderRadius: "10px",
        background: active
          ? `rgba(${iconColor ? hexToRgb(iconColor) : "59,130,246"}, 0.18)`
          : "rgba(255,255,255,0.05)",
        border: active
          ? `1px solid rgba(${iconColor ? hexToRgb(iconColor) : "59,130,246"}, 0.3)`
          : "1px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.2s ease",
        boxShadow: active ? `0 0 12px rgba(${iconColor ? hexToRgb(iconColor) : "59,130,246"}, 0.25)` : "none"
      }}>
        <div style={{
          width: "18px",
          height: "18px",
          color: active ? (iconColor || "var(--primary)") : "var(--text-dim)",
          transition: "color 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {icon}
        </div>
      </div>
      <span style={{ flex: 1, fontSize: "13.5px", fontWeight: active ? "600" : "500" }}>{label}</span>
      {badge > 0 && <span className="badge">{badge}</span>}
    </button>
  );
}

// Helper: convert #hex color to "r,g,b" string for rgba()
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function Stat({ val, lbl, onClick }) {
  return (
    <div className={`stat-card ${onClick ? "clickable-stat" : ""}`} onClick={onClick}>
      <div className="val">{val}</div>
      <div className="lbl">{lbl}</div>
    </div>
  );
}

function PkgHeader({ t, onAdd }) {
  return (
    <div className="row-head">
      <h2>{t.packages}</h2>
      <button className="btn-accent btn-sm" onClick={onAdd}>{t.addPackage}</button>
    </div>
  );
}

function AgencyForm({ onClose, onSaved }) {
  const { t } = useApp();
  const [form, setForm] = useState({ name: "", city: "", code: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name || !form.code) { setErr(t.fillAll); return; }
    setBusy(true); setErr("");

    const generatedEmail = `${form.code.toLowerCase().trim()}@boraq.com`;
    const generatedPassword = `${form.code.toLowerCase().trim()}123`;

    // Create a temp client just for auth signup so we don't hijack the admin's session
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const { data: authData, error: authErr } = await tempClient.auth.signUp({
      email: generatedEmail, password: generatedPassword,
    });
    if (authErr) { setErr(authErr.message); setBusy(false); return; }

    const { data: agency, error: agErr } = await supabase
      .from("agencies")
      .insert({
        name: form.name,
        code: form.code.toUpperCase().trim(),
        city: form.city, email: generatedEmail,
      })
      .select().single();

    if (agErr) { setErr(agErr.message); setBusy(false); return; }

    if (authData.user) {
      const { error: profErr } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          role: "agency",
          agency_id: agency.id
        });
      
      if (profErr) {
        setErr("Profile error: " + profErr.message);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t.addAgency}</h2>
        {err && <div className="error">{err}</div>}
        <div className="field"><label>{t.name}</label><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Agence Mohammedia" /></div>
        <div className="field"><label>{t.city}</label><input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Mohammedia" /></div>
        <div className="field"><label>{t.code}</label><input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="MHM" style={{ textTransform: "uppercase" }} /></div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "..." : t.save}</button>
          <button className="btn-sm" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}

function ChauffeurForm({ onClose, onSaved }) {
  const { t, lang } = useApp();
  const [form, setForm] = useState({ name: "", code: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name || !form.code) { setErr(t.fillAll); return; }
    setBusy(true); setErr("");

    const generatedEmail = `${form.code.toLowerCase().trim()}@boraq.com`;
    const generatedPassword = `${form.code.toLowerCase().trim()}123`;

    // Create a temp client just for auth signup so we don't hijack the admin's session
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const { data: authData, error: authErr } = await tempClient.auth.signUp({
      email: generatedEmail, password: generatedPassword,
    });
    if (authErr) { setErr(authErr.message); setBusy(false); return; }

    const { data: driver, error: drvErr } = await supabase
      .from("drivers")
      .insert({
        name: form.name,
        code: form.code.toUpperCase().trim(),
        email: generatedEmail
      })
      .select().single();

    if (drvErr) { setErr(drvErr.message); setBusy(false); return; }

    if (authData.user) {
      const { error: profErr } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          role: "driver",
          driver_id: driver.id
        });
      
      if (profErr) {
        setErr("Profile error: " + profErr.message);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{lang === "ar" ? "إضافة سائق جديد" : "Ajouter Chauffeur"}</h2>
        {err && <div className="error">{err}</div>}
        <div className="field"><label>{t.name}</label><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Yassine Saidi" /></div>
        <div className="field"><label>{t.code}</label><input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="DRV-001" style={{ textTransform: "uppercase" }} /></div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "..." : t.save}</button>
          <button className="btn-sm" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}
