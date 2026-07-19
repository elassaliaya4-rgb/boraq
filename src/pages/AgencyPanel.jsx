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
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function confirmSignOut() {
    const msg = lang === "ar" ? "هل تريد تسجيل الخروج؟" : "Voulez-vous vous déconnecter ?";
    if (window.confirm(msg)) {
      signOut();
    }
  }
  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
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
  // Removed scanFilterAgency state

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

    const { data: pkgs } = await supabase
      .from("packages").select("*")
      .eq("agency_id", profile.agency_id)
      .order("created_at", { ascending: false });
    setPackages(pkgs || []);

    const { data: nts } = await supabase
      .from("notifications").select("*")
      .eq("agency_id", profile.agency_id)
      .eq("target", "agency")
      .order("created_at", { ascending: false });
    setNotifs(nts || []);
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
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    const pkg = packages.find((p) => p.id === n.package_id);
    if (pkg) setDetailPkg(pkg);
    loadData();
  }

  async function deletePackage(pkg) {
    setDetailPkg(null);
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
          <div className="logo" style={{ fontSize: 22, marginBottom: 12 }}>⚡ {t.appName}</div>
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
            <h1>{t.welcome} {agencyInfo?.name || "Agence"} 👋</h1>
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
                🗑️ {lang === "ar" ? "مسح" : "Vider"}
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

            {/* Validation Checklist Grid */}
            {(() => {
              const filteredPkgs = packages;
              
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
    </div>
  );
}
