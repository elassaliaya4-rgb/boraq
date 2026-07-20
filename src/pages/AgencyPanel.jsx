import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useApp } from "../lib/context";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
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
  const [tabHistory, setTabHistory] = useState(["dashboard"]);
  const [tab, setTabState] = useState("dashboard");
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
  const [showDrForm, setShowDrForm] = useState(false);
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

    // Subscribe to real-time notifications & driver updates for this agency
    const channel = supabase
      .channel("agency-realtime")
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drivers"
        },
        () => {
          loadData();
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
      .neq("status", "deleted")
      .or(`agency_id.eq.${profile.agency_id},created_by_name.eq.${agencyName},origin.eq.${agencyCity}`)
      .order("created_at", { ascending: false });
    setPackages((pkgs || []).filter(p => p.status !== "deleted"));

    const clearedIds = (() => {
      try {
        const raw = localStorage.getItem(`boraq_cleared_notifs_${profile?.agency_id || 'agency'}`);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();

    const { data: nts } = await supabase
      .from("notifications").select("*")
      .eq("agency_id", profile.agency_id)
      .eq("target", "agency")
      .neq("target", "deleted")
      .order("created_at", { ascending: false });
    setNotifs((nts || []).filter(n => n.target !== "deleted" && !clearedIds.includes(n.id)));

    const { data: drs } = await supabase
      .from("drivers")
      .select("*")
      .order("name", { ascending: true });
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

  async function markPackageNotifsRead(pkg) {
    if (!pkg) return;
    const pkgId = pkg.id;
    const tracking = pkg.tracking_number;

    setNotifs((prev) =>
      prev.map((item) => {
        if (item.package_id === pkgId || (tracking && item.message && item.message.includes(tracking))) {
          return { ...item, is_read: true };
        }
        return item;
      })
    );

    if (pkgId) {
      await supabase.from("notifications").update({ is_read: true }).eq("package_id", pkgId);
    }
  }

  function openPackageDetails(pkg) {
    if (!pkg) return;
    setDetailPkg(pkg);
    markPackageNotifsRead(pkg);
  }

  async function validatePackage(pkg) {
    if (!pkg) return;
    markPackageNotifsRead(pkg);
    const updatedPkg = { ...pkg, status: "arrived" };
    setScannedSessionPkgs(prev => [updatedPkg, ...prev.filter(p => p.id !== pkg.id)]);
    const { error } = await supabase.from("packages").update({ status: "arrived" }).eq("id", pkg.id);
    if (!error) {
      triggerToast(lang === "ar" ? "تم قبول الطرد بنجاح" : "Colis validé avec succès");
      loadData();
    }
  }

  async function openNotif(n) {
    if (!n) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    setNotifs((prev) => prev.map((item) => item.id === n.id ? { ...item, is_read: true } : item));
    const pkg = packages.find((p) => p.id === n.package_id);
    if (pkg) openPackageDetails(pkg);
    else loadData();
  }

  function saveClearedNotifIds(ids) {
    try {
      const key = `boraq_cleared_notifs_${profile?.agency_id || 'agency'}`;
      const raw = localStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];
      const updated = Array.from(new Set([...existing, ...ids]));
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {}
  }

  async function deleteNotif(n, e) {
    if (e) e.stopPropagation();
    try {
      setNotifs((prev) => prev.filter((item) => item.id !== n.id));
      saveClearedNotifIds([n.id]);
      await supabase.from("notifications").update({ target: "deleted", is_read: true }).eq("id", n.id);
      await supabase.from("notifications").delete().eq("id", n.id);
    } catch (err) {
      console.error("deleteNotif error:", err);
    }
  }

  async function clearAllAgencyNotifs() {
    if (!window.confirm(lang === "ar" ? "هل تريد مسح جميع الإشعارات؟" : "Effacer toutes les notifications ?")) return;
    try {
      const ids = notifs.map((n) => n.id);
      setNotifs([]);
      if (ids.length > 0) {
        saveClearedNotifIds(ids);
        await supabase.from("notifications").update({ target: "deleted", is_read: true }).in("id", ids);
        await supabase.from("notifications").delete().in("id", ids);
      }
      const agId = profile?.agency_id || agencyInfo?.id;
      if (agId) {
        await supabase.from("notifications").update({ target: "deleted", is_read: true }).eq("agency_id", agId);
        await supabase.from("notifications").delete().eq("agency_id", agId);
      }
      if (triggerToast) {
        triggerToast(lang === "ar" ? "تم مسح جميع الإشعارات بنجاح" : "Toutes les notifications ont été supprimées");
      }
    } catch (err) {
      console.error("clearAllAgencyNotifs error:", err);
    }
  }

  async function deletePackage(pkg) {
    setDetailPkg(null);
    if (!pkg?.id) return;
    try {
      setPackages((prev) => prev.filter((item) => item.id !== pkg.id));
      await supabase.from("packages").update({ status: "deleted" }).eq("id", pkg.id);
      await supabase.from("packages").delete().eq("id", pkg.id);
      await supabase.from("notifications").update({ target: "deleted" }).eq("package_id", pkg.id);
      await supabase.from("notifications").delete().eq("package_id", pkg.id);
      triggerToast(lang === "ar" ? "تم حذف الطرد بنجاح" : "Colis supprimé avec succès");
      loadData();
    } catch (e) {
      console.error("deletePackage error:", e);
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
                    borderRadius: "6px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: "10px",
                    color: "var(--text-dim)",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  title={lang === "ar" ? "تعديل الموقع" : "Modifier localisation"}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="nav-grid">
          <button className={`nav-item ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: tab === "dashboard" ? "rgba(129,140,248,0.2)" : "rgba(255,255,255,0.06)",
              color: tab === "dashboard" ? "#818cf8" : "var(--text-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.2s ease"
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3m0 4h4v-4m-4 0h4"/>
              </svg>
            </div>
            <span style={{ flex: 1 }}>{lang === "ar" ? "لوحة التحكم" : "Tableau de bord"}</span>
          </button>

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
            <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{t.welcome} {agencyInfo?.name || "Agence"}</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 0 1 2 2v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-1.5"/></svg>
            </h1>
          </div>
          <div className="topbar-actions">
            {/* ── Add Package Button ── */}
            <button
              onClick={() => setShowPkgForm(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                fontSize: "13px",
                fontWeight: "700",
                borderRadius: "50px",
                cursor: "pointer",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                border: "1px solid rgba(34,197,94,0.4)",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(34,197,94,0.35)",
                letterSpacing: "0.02em",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(34,197,94,0.55)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(34,197,94,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>{t.addPackage}</span>
            </button>

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

        {/* ── Dashboard Tab ── */}
        {tab === "dashboard" && (() => {
          const statusColors = { pending: "#94a3b8", inTransit: "#3b82f6", arrived: "#f59e0b", delivered: "#22c55e" };
          const statusLabels = { pending: lang==="ar"?"انتظار":"En attente", inTransit: lang==="ar"?"في الطريق":"Transit", arrived: lang==="ar"?"وصل":"Arrivé", delivered: lang==="ar"?"مسلم":"Livré" };
          const pieData = ["pending","inTransit","arrived","delivered"].map(s => ({
            name: statusLabels[s],
            value: packages.filter(p => p.status === s).length,
            color: statusColors[s]
          })).filter(d => d.value > 0);
          const last7 = Array.from({length:7}, (_,i) => {
            const d = new Date(); d.setDate(d.getDate() - (6-i));
            const key = d.toISOString().slice(0,10);
            const label = d.toLocaleDateString(lang==="ar"?"ar-MA":"fr-FR", {weekday:"short"});
            return { label, count: packages.filter(p => p.created_at?.slice(0,10) === key).length };
          });
          return (
            <>
              {/* Stats cards */}
              <div className="stats" style={{ marginBottom: 20 }}>
                <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setTab("packages")}>
                  <div className="val">{packages.length}</div>
                  <div className="lbl">{lang === "ar" ? "إجمالي الطرود" : "Total Colis"}</div>
                </div>
                <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setTab("scan_session")}>
                  <div className="val" style={{ color: "#f59e0b" }}>{packages.filter(p => p.status === "arrived").length}</div>
                  <div className="lbl">{lang === "ar" ? "طرود واصلة" : "Colis Arrivés"}</div>
                </div>
                <div className="stat-card">
                  <div className="val" style={{ color: "#22c55e" }}>{packages.filter(p => p.status === "delivered").length}</div>
                  <div className="lbl">{lang === "ar" ? "طرود مسلمة" : "Colis Livrés"}</div>
                </div>
                <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setTab("scan_session")}>
                  <div className="val" style={{ color: "#10b981" }}>{scannedSessionPkgs.length}</div>
                  <div className="lbl">{lang === "ar" ? "ممسوحة هذه الجلسة" : "Scannés ce session"}</div>
                </div>
              </div>



              {/* Quick action buttons */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <button
                  onClick={() => setTab("packages")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, background: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  <span>{lang === "ar" ? "إدارة الطرود" : "Gérer les Colis"}</span>
                </button>
                <button
                  onClick={() => setTab("scan_session")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 11 11 13 15 9"/></svg>
                  <span>{lang === "ar" ? "مركز التحقق" : "Centre de Vérification"}</span>
                </button>
                <button
                  onClick={() => setTab("drivers")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(139,92,246,0.3)" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  <span>{lang === "ar" ? "خريطة السائقين المباشرة" : "Positions Chauffeurs"}</span>
                </button>
                <button
                  onClick={() => setShowScanner(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, background: "linear-gradient(135deg, #0ea5e9, #6366f1)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M3 17v2a2 2 0 0 0 2 2h2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
                  <span>{lang === "ar" ? "مسح الباركود" : "Scanner"}</span>
                </button>
              </div>
            </>
          );
        })()}

        {tab === "scan_session" && scannedSessionPkgs.length > 0 && (
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
                <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="6" x2="8.01" y2="6"/><line x1="12" y1="6" x2="12.01" y2="6"/><line x1="16" y1="6" x2="16.01" y2="6"/></svg>
                  <span>{lang === "ar" ? "وكالتك الحالية:" : "Votre agence :"} <b style={{ color: "#fbbf24" }}>{agencyInfo?.name}</b></span>
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                      <span>{lang === "ar" ? "في انتظار التحقق" : "En attente"}</span>
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>{lang === "ar" ? "الطرود المقبولة" : "Colis validés"}</span>
                      <span style={{ fontSize: 10, background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: 8 }}>
                        {validatedPkgs.length}
                      </span>
                    </button>
                  </div>

                  {displayPkgs.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 16, color: "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      {valTab === "pending" ? (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          <span>{lang === "ar" ? "تم التحقق من جميع الطرود بنجاح!" : "Tous les colis sont validés !"}</span>
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                          <span>{lang === "ar" ? "لا توجد طرود ممسوحة حالياً" : "Aucun colis validé pour le moment"}</span>
                        </>
                      )}
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
                                {isValidated ? (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                )}
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
                                <div className="card-meta-row" style={{ fontSize: 11, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 4 }}>
                                  <span>{p.sender_name} ({p.origin})</span>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                  <span>{p.receiver_name}</span>
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
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                  <span>{lang === "ar" ? "تأكيد" : "Valider"}</span>
                                </button>
                              )}
                              <button 
                                className="btn-manage" 
                                onClick={() => openPackageDetails(p)}
                                style={{ 
                                  padding: "6px 10px", 
                                  fontSize: 11, 
                                  borderRadius: 8, 
                                  background: "var(--surface)", 
                                  border: "1px solid var(--border)",
                                  color: "var(--text)",
                                  cursor: "pointer",
                                  fontWeight: "600"
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
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

        {tab === "packages" && (
          <>
            <div className="row-head">
              <h2>{t.packages}</h2>
              <button className="btn-accent btn-sm" onClick={() => setShowPkgForm(true)}>{t.addPackage}</button>
            </div>
            <PackagesTable packages={packages} onManage={openPackageDetails} onRefresh={loadData} />
          </>
        )}

        {tab === "drivers" && (
          <div>
            <div className="row-head" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: "800", color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                <span>{lang === "ar" ? "السائقين المتصلين" : "Chauffeurs en ligne"}</span>
              </h2>
              <button className="btn-accent btn-sm" onClick={() => setShowDrForm(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>{lang === "ar" ? "إضافة سائق" : "Ajouter Chauffeur"}</span>
              </button>
            </div>
            {drivers.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 16, color: "var(--text-dim)" }}>
                {lang === "ar" ? "لا يوجد سائقين مسجلين حالياً" : "Aucun chauffeur enregistré pour le moment."}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {drivers.map(d => {
                  const isOnline = d.last_active && (new Date() - new Date(d.last_active)) < 180000;
                  return (
                    <div key={d.id} style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: "700", color: "var(--text)" }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                            <DriverCityBadge lat={d.latitude} lng={d.longitude} />
                          </div>
                        </div>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isOnline ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                          color: isOnline ? "#16a34a" : "var(--text-dim)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: isOnline ? "#22c55e" : "#94a3b8" }}></span>
                          <span>{isOnline ? (lang === "ar" ? "متصل" : "En ligne") : (lang === "ar" ? "غير متصل" : "Hors-ligne")}</span>
                        </span>
                      </div>
                      {d.latitude && d.longitude && (
                        <button
                          onClick={() => setMapDriver(d)}
                          className="btn-primary"
                          style={{
                            padding: "8px 12px",
                            fontSize: 12,
                            borderRadius: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            fontWeight: "700"
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span>{lang === "ar" ? "موقع GPS المباشر" : "Position GPS Live"}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "notifs" && (
          <div>
            <div className="row-head" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{t.notifications}</h2>
              {notifs && notifs.length > 0 && (
                <button
                  onClick={clearAllAgencyNotifs}
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    color: "#ef4444",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>{lang === "ar" ? "مسح الكل" : "Tout effacer"}</span>
                </button>
              )}
            </div>
            {!notifs || notifs.length === 0 ? (
              <div className="notif">{t.noNotifications}</div>
            ) : (
              notifs.map((n) => (
                <div key={n.id} className={`notif clickable ${n.is_read ? "" : "unread"}`} onClick={() => openNotif(n)} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  </div>
                  <div className="body" style={{ flex: 1 }}>
                    <div className="msg">{t.newPackageNotif}: <b>{n.message}</b></div>
                    <div className="hint" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span>{t.tapSee}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteNotif(n, e)}
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "none",
                      color: "#ef4444",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "12px",
                      fontWeight: "600"
                    }}
                    title={lang === "ar" ? "مسح الإشعار" : "Supprimer"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
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
              <button className="btn-close" onClick={() => setMapDriver(null)} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div id="live-map" style={{ width: "100%", height: 350, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}></div>
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapDriver.latitude},${mapDriver.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{ textDecoration: "none", textAlign: "center", flex: 1, padding: "10px", borderRadius: 10, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                <span>{lang === "ar" ? "فتح في Google Maps" : "Ouvrir f Google Maps"}</span>
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
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>{lang === "ar" ? "إعدادات موقع الوكالة" : "Paramètres de localisation"}</span>
            </h2>
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
            id: "dashboard",
            label: lang === "ar" ? "لوحة التحكم" : "Tableau de bord",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3m0 4h4v-4m-4 0h4"/>
              </svg>
            )
          },
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
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
            </div>
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
                  boxShadow: "0 4px 14px rgba(239,68,68,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{lang === "ar" ? "نعم، خروج" : "Oui, Déconnexion"}</span>
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
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>{lang === "ar" ? "إلغاء" : "Annuler"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showDrForm && (
        <ChauffeurForm
          onClose={() => setShowDrForm(false)}
          onSaved={() => {
            setShowDrForm(false);
            loadData();
          }}
        />
      )}
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
    if (!form.name.trim()) { 
      setErr(lang === "ar" ? "المرجو إدخال اسم السائق" : "Veuillez entrer le nom du chauffeur"); 
      return; 
    }
    setBusy(true); setErr("");

    const driverCode = form.code ? form.code.toUpperCase().trim() : `DRV-${Math.floor(100 + Math.random() * 900)}`;

    if (driverCode.toLowerCase() === "admin" || driverCode.toLowerCase() === "boraq") {
      setErr(lang === "ar" ? "هذا الكود محجوز للأدمين. المرجو اختيار كود آخر." : "Ce code est réservé à l'administrateur.");
      setBusy(false);
      return;
    }

    const { data: exAg } = await supabase.from("agencies").select("id").or(`code.eq.${driverCode},code.eq.${driverCode.toLowerCase()}`).maybeSingle();
    if (exAg) {
      setErr(lang === "ar" ? `الكود "${driverCode}" مستعمل فـ وكالة أخرى. المرجو اختيار كود جديد.` : `Le code "${driverCode}" est déjà utilisé par une agence.`);
      setBusy(false);
      return;
    }

    const { data: exDrv } = await supabase.from("drivers").select("id").or(`code.eq.${driverCode},code.eq.${driverCode.toLowerCase()}`).maybeSingle();
    if (exDrv) {
      setErr(lang === "ar" ? `الكود "${driverCode}" مستعمل فـ سائق آخر. المرجو اختيار كود جديد.` : `Le code "${driverCode}" est déjà utilisé par un chauffeur.`);
      setBusy(false);
      return;
    }

    const rawSlug = driverCode.toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeSlug = rawSlug.length >= 2 ? rawSlug : `drv${Math.floor(100 + Math.random() * 900)}`;
    const generatedEmail = `driver_${safeSlug}_${Date.now()}@boraq.com`;
    const generatedPassword = `${safeSlug}123456`;

    try {
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      const { data: authData } = await tempClient.auth.signUp({
        email: generatedEmail,
        password: generatedPassword,
      });

      const { data: driver, error: drvErr } = await supabase
        .from("drivers")
        .insert({
          name: form.name.trim(),
          code: driverCode,
          email: generatedEmail
        })
        .select()
        .maybeSingle();

      if (drvErr) { setErr(drvErr.message); setBusy(false); return; }

      if (authData?.user && driver?.id) {
        await supabase.from("profiles").insert({
          id: authData.user.id,
          role: "driver",
          driver_id: driver.id
        });
      }

      setBusy(false);
      onSaved();
    } catch (e) {
      console.error("ChauffeurForm save error:", e);
      setErr(e.message || "An error occurred");
      setBusy(false);
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{lang === "ar" ? "إضافة سائق جديد" : "Ajouter Chauffeur"}</h2>
        {err && <div className="error">{err}</div>}
        <div className="field">
          <label>{t.name}</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: ياسين السعيدي" />
        </div>
        <div className="field">
          <label>{t.code}</label>
          <input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="مثال: DRV-001" style={{ textTransform: "uppercase" }} />
        </div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "..." : t.save}</button>
          <button className="btn-sm" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}

function DriverCityBadge({ lat, lng }) {
  const { lang } = useApp();
  const [city, setCity] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lat || !lng) return;
    let isMounted = true;
    const cacheKey = `city_cache_${parseFloat(lat).toFixed(2)}_${parseFloat(lng).toFixed(2)}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setCity(cached);
      return;
    }
    setLoading(true);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${lang === 'ar' ? 'ar' : 'fr'}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          const detected = data?.address?.city || data?.address?.town || data?.address?.municipality || data?.address?.county || data?.address?.state || "";
          if (detected) {
            sessionStorage.setItem(cacheKey, detected);
            setCity(detected);
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [lat, lng, lang]);

  if (!lat || !lng) {
    return (
      <span style={{
        padding: "3px 8px",
        borderRadius: 6,
        background: "var(--surface-2)",
        color: "var(--text-dim)",
        fontSize: "11px",
        fontWeight: "600"
      }}>
        📍 {lang === "ar" ? "غير محدد بعد" : "Non déterminé"}
      </span>
    );
  }

  return (
    <span style={{
      padding: "3px 8px",
      borderRadius: 6,
      background: "rgba(59, 130, 246, 0.1)",
      color: "#3b82f6",
      fontSize: "11px",
      fontWeight: "700",
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }}>
      📍 {loading ? (lang === "ar" ? "جاري التحديد..." : "Localisation...") : (city || `${parseFloat(lat).toFixed(2)}, ${parseFloat(lng).toFixed(2)}`)}
    </span>
  );
}
