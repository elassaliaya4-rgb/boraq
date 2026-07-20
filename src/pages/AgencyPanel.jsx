import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import PackageForm from "../components/PackageForm";
import PackageDetails from "../components/PackageDetails";
import Scanner from "../components/Scanner";
import PackagesTable from "../components/PackagesTable";
import MobileHeader from "../components/MobileHeader";
import MobileBottomNav from "../components/MobileBottomNav";
import { Capacitor } from "@capacitor/core";

export default function AgencyPanel() {
  const { t, lang, setLang, signOut, profile, user, triggerToast, theme, toggleTheme } = useApp();
  const isMobileAPK = Capacitor.getPlatform() === "android" || Capacitor.getPlatform() === "ios";
  const [tabHistory, setTabHistory] = useState(["packages"]);
  const [tab, setTabState] = useState("packages");
  const setTab = (newTab) => {
    setTabState((prevTab) => {
      if (prevTab !== newTab) {
        setTabHistory((prevHist) => [...prevHist, prevTab]);
      }
      return newTab;
    });
  };
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [mapDriver, setMapDriver] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [agencyInfo, setAgencyInfo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editCity, setEditCity] = useState("");
  const [editMapsLink, setEditMapsLink] = useState("");
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [detailPkg, setDetailPkg] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedSessionPkgs, setScannedSessionPkgs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("boraq_scan_session_agency") || "[]"); }
    catch { return []; }
  });
  const [valTab, setValTab] = useState("pending");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  function confirmSignOut() {
    setShowLogoutConfirm(true);
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Leaflet Live Map Loader for Driver tracking
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
          html: `<div style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg, #3b82f6, #2563eb);box-shadow:0 0 16px rgba(59,130,246,0.6);border:2px solid #ffffff;color:#ffffff;animation:map-pulse 1.8s infinite ease-in-out;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
          </div>`,
          className: "custom-leaflet-icon",
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        });

        const marker = window.L.marker([mapDriver.latitude, mapDriver.longitude], { icon: deliveryIcon }).addTo(mapInstance);
        marker.bindPopup(`
          <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px;text-align:center;">
            <div style="font-weight:700;font-size:14px;color:#0f172a;">${mapDriver.name}</div>
            <div style="font-size:11px;color:#2563eb;font-weight:600;margin-top:2px;">🛰️ Position GPS en direct</div>
          </div>
        `).openPopup();
      } catch (err) {
        console.warn("Map error:", err);
      }
    }
  }, [mapDriver]);

  async function validatePackage(pkg) {
    if (!pkg) return;
    setScannedSessionPkgs((prev) => {
      if (prev.some((s) => s.id === pkg.id)) return prev;
      return [pkg, ...prev];
    });
    await supabase.from("packages").update({ status: "arrived" }).eq("id", pkg.id);
    loadData();
  }

  // Auto-save scan session to localStorage so it survives refresh
  useEffect(() => {
    try { localStorage.setItem("boraq_scan_session_agency", JSON.stringify(scannedSessionPkgs)); }
    catch {}
  }, [scannedSessionPkgs]);

  const unread = notifs?.filter((n) => !n.is_read)?.length || 0;

  function handleScanResult(text) {
    setShowScanner(false);
    let tracking = text;
    try {
      const obj = JSON.parse(text);
      tracking = obj.n || obj.tracking_number || text;
    } catch (e) {}
    const found = packages.find(
      (p) => p.tracking_number === tracking || p.tracking_number === text
    );
    if (found) setDetailPkg(found);
    else alert(t.notFound + ": " + tracking);
  }

  const goBack = () => {
    if (detailPkg) {
      setDetailPkg(null);
    } else if (showPkgForm) {
      setShowPkgForm(false);
    } else if (showScanner) {
      setShowScanner(false);
    } else if (showSettings) {
      setShowSettings(false);
    } else if (tabHistory.length > 0) {
      setTabHistory((prev) => {
        const copy = [...prev];
        const lastTab = copy.pop();
        if (lastTab) {
          setTimeout(() => setTabState(lastTab), 0);
        }
        return copy;
      });
    }
  };

  // Handle native Android back button to dismiss modals/subtabs
  useEffect(() => {
    window.addEventListener("appBackClick", goBack);
    return () => window.removeEventListener("appBackClick", goBack);
  }, [detailPkg, showPkgForm, showScanner, showSettings, tabHistory]);

  // Swipe-to-back gesture logic from left edge
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let isEdgeSwipe = false;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch.clientX < 35) {
        startX = touch.clientX;
        startY = touch.clientY;
        isEdgeSwipe = true;
      } else {
        isEdgeSwipe = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!isEdgeSwipe) return;
      const touch = e.touches[0];
      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;

      if (diffX > 85 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        isEdgeSwipe = false; // Prevent double trigger
        goBack();
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [detailPkg, showPkgForm, showScanner, showSettings, tabHistory]);

  useEffect(() => {
    if (!profile?.agency_id) return;
    loadData();

    // Subscribe to real-time notifications for this agency
    const channel = supabase
      .channel("agency-notifs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `agency_id=eq.${profile.agency_id}`,
        },
        (payload) => {
          if (payload.new.target === "agency") {
            triggerToast(payload.new.message);
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

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

  async function loadData() {
    const { data: ag } = await supabase
      .from("agencies")
      .select("id, name, city, code, google_maps_link")
      .eq("id", profile.agency_id)
      .maybeSingle();
    setAgencyInfo(ag);

    // لائحة كل الأجونسيات (باش يختار وجهة الطرد)
    const { data: allAg } = await supabase.from("agencies").select("*");
    setAgencies(allAg || []);

    // Query packages where this agency is the destination OR the origin/creator
    const agencyCity = ag?.city || "";
    const agencyName = ag?.name || "";
    const { data: pkgs } = await supabase
      .from("packages")
      .select("*")
      .or(`agency_id.eq.${profile.agency_id},created_by_name.eq.${agencyName},origin.eq.${agencyCity}`)
      .order("created_at", { ascending: false });
    setPackages(pkgs || []);

    const { data: nts } = await supabase
      .from("notifications").select("*")
      .eq("agency_id", profile.agency_id)
      .eq("target", "agency")
      .order("created_at", { ascending: false });
    setNotifs(nts || []);

    const { data: drs } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "driver");
    setDrivers(drs || []);
  }

  function openSettings() {
    setEditCity(agencyInfo?.city || "");
    setEditMapsLink(agencyInfo?.google_maps_link || "");
    setShowSettings(true);
  }

  async function saveSettings() {
    if (!editCity.trim()) {
      alert(lang === "ar" ? "المرجو إدخال المدينة" : "Veuillez entrer la ville");
      return;
    }
    const { error } = await supabase
      .from("agencies")
      .update({
        city: editCity.trim(),
        google_maps_link: editMapsLink.trim()
      })
      .eq("id", agencyInfo.id);

    if (error) {
      alert(error.message);
    } else {
      triggerToast(lang === "ar" ? "تم تحديث الموقع بنجاح" : "Localisation mise à jour");
      setShowSettings(false);
      loadData();
    }
  }

  async function openNotif(n) {
    if (!n) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    setNotifs((prev) => prev.map((item) => item.id === n.id ? { ...item, is_read: true } : item));
    const pkg = packages.find((p) => p.id === n.package_id);
    if (pkg) setDetailPkg(pkg);
    loadData();
  }

  async function deletePackage(pkg) {
    setDetailPkg(null);
    if (!pkg?.id) return;
    const { error } = await supabase.from("packages").delete().eq("id", pkg.id);
    if (error) {
      alert("Error: " + error.message);
    } else {
      triggerToast(lang === "ar" ? "تم حذف الطرد بنجاح" : "Colis supprimé avec succès");
      loadData();
    }
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
          <div className="logo" style={{ fontSize: 22, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#3b82f6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>{t.appName}</span>
          </div>
        {agencyInfo && (
          <div style={{
            position: "relative",
            background: theme === "light"
              ? "linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.5) 100%)"
              : "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)",
            padding: "16px",
            borderRadius: "20px",
            marginBottom: "24px",
            border: theme === "light" ? "1px solid rgba(226, 232, 240, 0.8)" : "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: theme === "light"
              ? "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)"
              : "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            overflow: "hidden",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)"
          }}>
            {/* Subtle premium vertical indicator */}
            <div style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "4px",
              background: "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)"
            }} />

            {/* Avatar Initials Badge */}
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
              color: "#1a0e00",
              fontWeight: "800",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(217, 119, 6, 0.35)",
              flexShrink: 0,
              border: "2px solid rgba(255, 255, 255, 0.1)"
            }}>
              {agencyInfo.name.substring(0, 2).toUpperCase()}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", fontWeight: "800" }}>
                {lang === "ar" ? "الوكالة الحالية" : "Agence Actuelle"}
              </div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {agencyInfo.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "6px" }}>
                <span style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "4px",
                  fontSize: "12px",
                  color: "#3b82f6",
                  fontWeight: "600"
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {agencyInfo.city}
                </span>
                <button
                  onClick={openSettings}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "none",
                    borderRadius: "4px",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "10px",
                    color: "var(--text-dim)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  title={lang === "ar" ? "تعديل الموقع" : "Modifier localisation"}
                >
                  ✏️
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="nav-grid">
          <button className={`nav-item ${tab === "packages" ? "active" : ""}`} onClick={() => setTab("packages")} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: tab === "packages" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
              color: tab === "packages" ? "#3b82f6" : "var(--text-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.2s ease"
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span style={{ flex: 1 }}>{t.myPackages}</span>
          </button>

          <button className={`nav-item ${tab === "scan_session" ? "active" : ""}`} onClick={() => setTab("scan_session")} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: tab === "scan_session" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
              color: tab === "scan_session" ? "#10b981" : "var(--text-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.2s ease"
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 11 11 13 15 9" />
              </svg>
            </div>
            <span style={{ flex: 1 }}>{lang === "ar" ? "التحقق والمسح" : "Scan & Validation"}</span>
          </button>

          <button className={`nav-item ${tab === "drivers" ? "active" : ""}`} onClick={() => setTab("drivers")} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: tab === "drivers" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
              color: tab === "drivers" ? "#3b82f6" : "var(--text-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.2s ease"
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <path d="M10 17h4V5H2v12h3" />
                <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                <circle cx="7.5" cy="17.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </div>
            <span style={{ flex: 1 }}>{lang === "ar" ? "السائقين" : "Chauffeurs"}</span>
            {(() => {
              const onlineCount = drivers.filter(d => d.last_active && (new Date() - new Date(d.last_active)) < 300000).length;
              return onlineCount > 0 ? <span className="badge" style={{ background: "#10b981" }}>{onlineCount}</span> : null;
            })()}
          </button>

          <button className={`nav-item ${tab === "notifs" ? "active" : ""}`} onClick={() => setTab("notifs")} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: tab === "notifs" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
              color: tab === "notifs" ? "#f59e0b" : "var(--text-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.2s ease"
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <span style={{ flex: 1 }}>{t.notifications}</span>
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>
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
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
            {tab !== "packages" && (
              <button 
                onClick={() => setTab("packages")} 
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
            <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{t.welcome} {agencyInfo?.name || "Agence"}</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 0 1 2 2v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-1.5"/></svg>
            </h1>
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
                borderRadius: "50px",
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M3 17v2a2 2 0 0 0 2 2h2" />
                <line x1="7" y1="12" x2="17" y2="12" />
              </svg>
              <span>{t.scan}</span>
            </button>

            <div
              className="lang-selector-desktop"
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
              className="theme-toggle-desktop"
              onClick={toggleTheme}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              title={lang === "ar" ? "تغيير المظهر" : "Changer le thème"}
            >
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Session Scanned Packages Tray */}
        {scannedSessionPkgs.length > 0 && (
          <div className="scanned-tray" style={{
            background: "var(--surface)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.1)"
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
                onClick={() => { setScannedSessionPkgs([]); localStorage.removeItem("boraq_scan_session_agency"); }}
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>{lang === "ar" ? "مسح" : "Vider"}</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {scannedSessionPkgs.map((p) => (
                <div key={p.id} className="scanned-tray-card" style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)"
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
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
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
                      background: "var(--surface)", 
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      cursor: "pointer",
                      fontWeight: "600",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "scan_session" && (
          <>
            <div className="row-head" style={{ marginBottom: 16 }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 11 11 13 15 9"/></svg>
                <span>{lang === "ar" ? "بوابة التحقق والمسح" : "Centre de Vérification"}</span>
              </h2>
            </div>

            {/* Progress counter & current agency display */}
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
                  🏢 {lang === "ar" ? "وكالتك الحالية:" : "Votre agence :"} <b style={{ color: "#fbbf24" }}>{agencyInfo?.name}</b>
                </span>
              </div>

              {/* Progress counter */}
              {(() => {
                const totalCount = packages.length;
                const verifiedCount = packages.filter(p => scannedSessionPkgs.some(s => s.id === p.id)).length;
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

            {/* Sub-tabs: Pending vs Validated */}
            {(() => {
              const pendingPkgs = packages.filter(p => !scannedSessionPkgs.some(s => s.id === p.id) && p.status !== "arrived" && p.status !== "delivered");
              const validatedPkgs = packages.filter(p => scannedSessionPkgs.some(s => s.id === p.id) || p.status === "arrived" || p.status === "delivered");
              const displayPkgs = valTab === "pending" ? pendingPkgs : validatedPkgs;

              return (
                <>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <button
                      onClick={() => setValTab("pending")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: "700",
                        background: valTab === "pending" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "var(--surface)",
                        color: valTab === "pending" ? "#fff" : "var(--text-dim)",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <span>⏳ {lang === "ar" ? "في انتظار التحقق" : "En attente"}</span>
                      <span style={{ fontSize: 10, background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: 8 }}>
                        {pendingPkgs.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setValTab("validated")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: "700",
                        background: valTab === "validated" ? "linear-gradient(135deg, #10b981, #059669)" : "var(--surface)",
                        color: valTab === "validated" ? "#fff" : "var(--text-dim)",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <span>✅ {lang === "ar" ? "الطرود المقبولة" : "Colis validés"}</span>
                      <span style={{ fontSize: 10, background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: 8 }}>
                        {validatedPkgs.length}
                      </span>
                    </button>
                  </div>

                  {displayPkgs.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 16, color: "var(--text-dim)" }}>
                      {valTab === "pending"
                        ? (lang === "ar" ? "🎉 تم التحقق من جميع الطرود بنجاح!" : "🎉 Tous les colis sont validés !")
                        : (lang === "ar" ? "📭 لا توجد طرود ممسوحة حالياً" : "📭 Aucun colis validé pour le moment")}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                      {displayPkgs.map((p) => {
                        const isValidated = scannedSessionPkgs.some(s => s.id === p.id) || p.status === "arrived" || p.status === "delivered";
                        return (
                          <div 
                            key={p.id} 
                            style={{
                              background: "var(--surface)",
                              border: isValidated ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border)",
                              borderInlineStart: isValidated ? "4px solid #10b981" : "4px solid #f59e0b",
                              borderRadius: 12,
                              padding: 14,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              transition: "all 0.25s ease"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                              <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: "50%",
                                background: isValidated ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                color: isValidated ? "#10b981" : "#f59e0b",
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
                                    background: isValidated ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", 
                                    color: isValidated ? "#10b981" : "#f59e0b", 
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
                              {!isValidated && (
                                <button
                                  onClick={() => validatePackage(p)}
                                  style={{
                                    padding: "6px 12px",
                                    fontSize: 11,
                                    fontWeight: "700",
                                    borderRadius: 8,
                                    background: "linear-gradient(135deg, #10b981, #059669)",
                                    color: "#fff",
                                    border: "none",
                                    cursor: "pointer",
                                    boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4
                                  }}
                                >
                                  ✓ {lang === "ar" ? "تأكيد" : "Valider"}
                                </button>
                              )}
                              <button 
                                className="btn-manage" 
                                onClick={() => setDetailPkg(p)}
                                style={{ 
                                  padding: "6px 10px", 
                                  fontSize: 11, 
                                  borderRadius: 8, 
                                  background: "var(--surface-2)", 
                                  border: "1px solid var(--border)",
                                  color: "var(--text)",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}

        {tab === "drivers" && (
          <>
            <div className="row-head" style={{ marginBottom: 16 }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
                <span>{lang === "ar" ? "السائقين المتصلين والحالة" : "Chauffeurs en ligne & Statut"}</span>
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {drivers.map((d) => {
                const isOnline = d.last_active && (new Date() - new Date(d.last_active)) < 300000;
                return (
                  <div
                    key={d.id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderInlineStart: isOnline ? "4px solid #10b981" : "4px solid var(--text-dim)",
                      borderRadius: 14,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.05)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: "700", color: "var(--text)" }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>Code: <b>{d.code}</b></div>
                      </div>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: "700",
                        background: isOnline ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)",
                        color: isOnline ? "#10b981" : "var(--text-dim)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "#10b981" : "#94a3b8" }}></span>
                        {isOnline ? (lang === "ar" ? "متصل" : "En ligne") : (lang === "ar" ? "غير متصل" : "Hors ligne")}
                      </span>
                    </div>

                    {d.latitude && d.longitude ? (
                      <button
                        onClick={() => setMapDriver(d)}
                        className="btn-primary"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: "700",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>{lang === "ar" ? "تحديد موقع GPS المباشر" : "Position GPS Live"}</span>
                      </button>
                    ) : (
                      <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic", textAlign: "center" }}>
                        {lang === "ar" ? "لا يوجد موقع GPS حالياً" : "GPS non disponible"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "packages" && (
          <>
            <div className="row-head">
              <h2>{t.myPackages}</h2>
              <button className="btn-accent btn-sm" onClick={() => setShowPkgForm(true)}>{t.addPackage}</button>
            </div>
            <PackagesTable packages={packages} onManage={setDetailPkg} onRefresh={loadData} />
          </>
        )}

        {tab === "notifs" && (
          <div>
            {notifs.length === 0 ? (
              <div className="notif">{t.noNotifications}</div>
            ) : (
              notifs.map((n) => (
                <div key={n.id} className={`notif clickable ${n.is_read ? "" : "unread"}`} onClick={() => openNotif(n)}>
                  <div className="icon">📦</div>
                  <div className="body">
                    <div className="msg">{t.newPackageNotif}: <b>{n.message}</b></div>
                    <div className="hint">👆 {t.tapSee}</div>
                  </div>
                  <div className="chev">{lang === "ar" ? "‹" : "›"}</div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {showPkgForm && (
        <PackageForm agencies={agencies} onClose={() => setShowPkgForm(false)} onSaved={() => { setShowPkgForm(false); loadData(); }} />
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
            const updatedPkg = { ...pkg, status: "arrived" };
            setScannedSessionPkgs(prev => [updatedPkg, ...prev.filter(p => p.id !== pkg.id)]);
          }}
          onClose={() => setShowScanner(false)}
          onUpdated={loadData}
        />
      )}
      {mapDriver && (
        <div className="modal-bg" onClick={() => setMapDriver(null)} style={{ zIndex: 250 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650, width: "95%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>{lang === "ar" ? `موقع السائق: ${mapDriver.name}` : `Position de ${mapDriver.name}`}</span>
              </h2>
              <button className="btn-close" onClick={() => setMapDriver(null)}>✕</button>
            </div>
            <div id="live-map" style={{ width: "100%", height: 350, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}></div>
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapDriver.latitude},${mapDriver.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{ textDecoration: "none", textAlign: "center", flex: 1, padding: "10px", borderRadius: 10, fontSize: 13 }}
              >
                🗺️ {lang === "ar" ? "فتح في Google Maps" : "Ouvrir f Google Maps"}
              </a>
              <button className="btn-sm" onClick={() => setMapDriver(null)} style={{ flex: 1 }}>
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
      {showSettings && (
        <div className="modal-bg" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>⚙️ {lang === "ar" ? "إعدادات موقع الوكالة" : "Paramètres de localisation"}</h2>
            <div className="field">
              <label>{lang === "ar" ? "المدينة" : "Ville"}</label>
              <input 
                type="text" 
                value={editCity} 
                onChange={(e) => setEditCity(e.target.value)} 
                placeholder="Rabat"
              />
            </div>
            <div className="field">
              <label>{lang === "ar" ? "رابط Google Maps" : "Lien Google Maps"}</label>
              <input 
                type="text" 
                value={editMapsLink} 
                onChange={(e) => setEditMapsLink(e.target.value)} 
                placeholder="https://maps.app.goo.gl/..."
              />
              <span style={{ fontSize: "10px", color: "var(--text-dim)", display: "block", marginTop: "4px" }}>
                {lang === "ar" 
                  ? "قم بنسخ رابط مشاركة موقع الوكالة (Share Link) من تطبيق Google Maps وضعه هنا."
                  : "Copiez le lien de partage (Share Link) de la localisation de l'agence depuis l'application Google Maps et collez-le ici."}
              </span>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={saveSettings}>{t.save}</button>
              <button className="btn-sm" onClick={() => setShowSettings(false)}>{t.cancel}</button>
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
            id: "packages",
            label: t.myPackages,
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
            label: lang === "ar" ? "التحقق" : "Vérification",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 11 11 13 15 9" />
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
      {/* Custom React Déconnexion Confirm Modal */}
      {showLogoutConfirm && (
        <div className="modal-bg" onClick={() => setShowLogoutConfirm(false)} style={{ zIndex: 300 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, textAlign: "center", padding: "28px 24px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🚪</div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, color: "var(--text)", fontWeight: "800" }}>
              {lang === "ar" ? "تسجيل الخروج؟" : "Se déconnecter ?"}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 24px 0", lineHeight: 1.5 }}>
              {lang === "ar" ? "هل أنت متأكد من الخروج من حسابك فـ Boraq Logistics؟" : "Voulez-vous vraiment vous déconnecter de votre compte Boraq ?"}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => { setShowLogoutConfirm(false); signOut(); }}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(239,68,68,0.3)"
                }}
              >
                ✅ {lang === "ar" ? "نعم، خروج" : "Oui, Déconnexion"}
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  fontWeight: "600",
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                ✕ {lang === "ar" ? "إلغاء" : "Annuler"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
