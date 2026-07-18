import { useState, useEffect, useRef } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import { statusColors, statusBg } from "../lib/helpers";
import { Geolocation } from "@capacitor/geolocation";
import Scanner from "../components/Scanner";
import PackageDetails from "../components/PackageDetails";
import MobileHeader from "../components/MobileHeader";
import MobileBottomNav from "../components/MobileBottomNav";
import { Capacitor } from "@capacitor/core";

export default function DriverPanel() {
  const { t, lang, setLang, profile, user, signOut, theme, toggleTheme } = useApp();
  const isMobileAPK = Capacitor.getPlatform() === "android" || Capacitor.getPlatform() === "ios";
  const [packages, setPackages] = useState([]);

  function confirmSignOut() {
    const msg = lang === "ar" ? "هل تريد تسجيل الخروج؟" : "Voulez-vous vous déconnecter ?";
    if (window.confirm(msg)) {
      signOut();
    }
  }
  const [agencies, setAgencies] = useState([]);
  const [driverInfo, setDriverInfo] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [detailPkg, setDetailPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanFilterAgency, setScanFilterAgency] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle native Android back button to dismiss modals/subtabs
  useEffect(() => {
    const handleBack = () => {
      if (detailPkg) {
        setDetailPkg(null);
      } else if (showScanner) {
        setShowScanner(false);
      }
    };
    window.addEventListener("appBackClick", handleBack);
    return () => window.removeEventListener("appBackClick", handleBack);
  }, [detailPkg, showScanner]);

  useEffect(() => {
    if (profile?.driver_id) {
      loadData();

      // Real-time package update listener
      const channel = supabase
        .channel("driver-packages-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "packages" },
          () => {
            loadData(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
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

  useEffect(() => {
    if (!profile?.driver_id) return;

    updateLocation();
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);

    async function updateLocation() {
      try {
        let lat = null;
        let lng = null;

        // 1. Try native Capacitor Geolocation
        try {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== "granted") {
            const req = await Geolocation.requestPermissions();
            if (req.location !== "granted") {
              throw new Error("Capacitor location permission denied.");
            }
          }
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 30000
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch (capErr) {
          console.warn("Capacitor geolocation failed, trying HTML5 Web Geolocation fallback:", capErr);
          
          // 2. Try standard browser Web Geolocation fallback (100% reliable inside webviews / browsers)
          if (navigator.geolocation) {
            const webPos = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 30000
              });
            });
            lat = webPos.coords.latitude;
            lng = webPos.coords.longitude;
          } else {
            throw new Error("No browser geolocation support.");
          }
        }

        if (lat && lng) {
          await supabase
            .from("drivers")
            .update({
              latitude: lat,
              longitude: lng,
              last_active: new Date().toISOString()
            })
            .eq("id", profile.driver_id);
        }
      } catch (error) {
        console.warn("Geolocation tracking error:", error);
      }
    }
  }, [profile]);

  async function loadData(silent = false) {
    if (!mountedRef.current) return;
    if (!silent) setLoading(true);
    try {
      // 1. Fetch Driver info
      const { data: drv } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", profile.driver_id)
        .single();
      if (!mountedRef.current) return;
      setDriverInfo(drv);

      // 2. Fetch all agencies
      const { data: ags } = await supabase
        .from("agencies")
        .select("*");
      if (!mountedRef.current) return;
      setAgencies(ags || []);

      // 3. Fetch all active packages (not delivered yet)
      const { data: pkgs } = await supabase
        .from("packages")
        .select("*")
        .neq("status", "delivered")
        .order("created_at", { ascending: false });
      if (!mountedRef.current) return;
      setPackages(pkgs || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  // Group packages by destination agency
  const groupedPackages = packages.reduce((acc, pkg) => {
    const agencyId = pkg.agency_id || "unassigned";
    if (!acc[agencyId]) acc[agencyId] = [];
    acc[agencyId].push(pkg);
    return acc;
  }, {});

  function getAgencyDetails(id) {
    const ag = agencies.find((a) => a.id === id);
    return ag ? { name: ag.name, city: ag.city } : { name: lang === "ar" ? "غير محدد" : "Non assigné", city: "" };
  }

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
    <div className={`app ${isMobileAPK ? "native-apk" : ""}`} style={isMobileAPK ? { flexDirection: "column" } : {}}>
      <MobileHeader 
        profileName={profile?.name || user?.email}
        onScanClick={() => setShowScanner(true)}
        onLogout={confirmSignOut}
      />
      <div style={isMobileAPK ? { display: "flex", flex: 1, width: "100%", overflow: "hidden" } : { display: "contents" }}>
        <aside className="sidebar">
          <div className="logo" style={{ fontSize: 22, marginBottom: 18 }}>⚡ {t.appName}</div>
        
        {driverInfo && (
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
              {driverInfo.name.substring(0, 2).toUpperCase()}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", fontWeight: "800" }}>
                {lang === "ar" ? "السائق المهني" : "Conducteur Pro"}
              </div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {driverInfo.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                <span style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "4px",
                  fontSize: "12px",
                  color: "#3b82f6",
                  fontWeight: "600"
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  {lang === "ar" ? "سائق" : "Conducteur"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="nav-grid">
          <NavBtn
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
            label={lang === "ar" ? "ورقة الطريق" : "Feuille de Route"}
            active={true}
            onClick={() => {}}
          />
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

      {/* Main Content Area */}
      <main className="main" style={isMobileAPK ? { paddingTop: "10px", paddingBottom: "96px", width: "100%", overflowY: "auto" } : {}}>
        <header className="topbar" style={isMobileAPK ? { display: "none" } : {}}>
          <div>
            <h1>🚚 {lang === "ar" ? "مهام التوصيل" : "Feuille de Route"}</h1>
            <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>
              {lang === "ar" ? "الطرود مرتبة حسب وجهة كل مدينة" : "Colis groupés par agence destinataire"}
            </p>
          </div>
          <div className="topbar-actions">
            {/* ── Premium Scan Button ── */}
            <button
              onClick={() => {
                setScanFilterAgency(""); // Clear filter f manual scan
                setShowScanner(true);
              }}
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
        </header>

        {packages.length === 0 ? (
          <div className="notif" style={{ textAlign: "center", padding: 30 }}>
            🎉 {lang === "ar" ? "لا توجد طرود نشطة حالياً للتوصيل!" : "Aucun colis actif à livrer pour le moment !"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {Object.keys(groupedPackages).map((agencyId) => {
              const agency = getAgencyDetails(agencyId);
              const pkgs = groupedPackages[agencyId];
              return (
                <div key={agencyId} style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 16
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 10,
                    marginBottom: 12
                  }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      🏢 {agency.name} {agency.city && `(${agency.city})`}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Agence " + agency.name + " " + (agency.city || ""))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: "bold",
                          borderRadius: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                          textDecoration: "none",
                          background: "rgba(59,130,246,0.1)",
                          border: "1px solid rgba(59,130,246,0.2)",
                          color: "#3b82f6",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; }}
                      >
                        📍 {lang === "ar" ? "الموقع" : "Localiser"}
                      </a>
                      <button
                        onClick={() => {
                          setScanFilterAgency(agency.name);
                          setShowScanner(true);
                        }}
                        className="btn-accent"
                        style={{
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: "bold",
                          borderRadius: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                          border: "none",
                          boxShadow: "0 0 8px rgba(251, 191, 36, 0.2)"
                        }}
                      >
                        📷 {lang === "ar" ? "مسح" : "Scanner"}
                      </button>
                      <span style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 12,
                        background: "rgba(59,130,246,0.1)",
                        color: "var(--primary)",
                        fontWeight: 600
                      }}>
                        {pkgs.length} {lang === "ar" ? "طرود" : "colis"}
                      </span>
                    </div>
                  </div>

                  <div className="table-wrap" style={{ background: "none", border: "none" }}>
                    {/* Desktop Table View */}
                    <table className="desktop-only-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>{t.trackingNumber}</th>
                          <th>{lang === "ar" ? "من (المنشأ)" : "De (Origine)"}</th>
                          <th>{t.receiverName}</th>
                          <th>{t.status}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pkgs.map((p) => {
                          const isLoaded = p.status === "inTransit";
                          return (
                            <tr 
                              key={p.id}
                              onClick={() => setDetailPkg(p)}
                              className="clickable-row"
                              style={isLoaded ? { 
                                backgroundColor: "rgba(16, 185, 129, 0.08)",
                                borderInlineStart: "4px solid #10b981",
                                transition: "all 0.3s ease",
                                cursor: "pointer"
                              } : { transition: "all 0.3s ease", cursor: "pointer" }}
                            >
                              <td><b>{p.tracking_number}</b></td>
                              <td>
                                <span style={{ 
                                  fontSize: 12, 
                                  padding: "2px 6px", 
                                  background: isLoaded ? "rgba(16, 185, 129, 0.15)" : "var(--surface-2)", 
                                  borderRadius: 6, 
                                  fontWeight: 500,
                                  color: isLoaded ? "#10b981" : "inherit"
                                }}>
                                  {p.origin}
                                </span>
                              </td>
                              <td>{p.receiver_name}</td>
                              <td>
                                <span className={`status ${p.status}`}>{t[p.status] || p.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Mobile Card List View (no horizontal scroll) */}
                    <div className="mobile-only-list" dir={lang === "ar" ? "rtl" : "ltr"} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {pkgs.map((p) => {
                        const isLoaded = p.status === "inTransit";
                        return (
                          <div 
                            key={p.id} 
                            onClick={() => setDetailPkg(p)}
                            className="clickable-row"
                            style={{ 
                              background: isLoaded ? "rgba(16, 185, 129, 0.08)" : "var(--surface)", 
                              border: isLoaded ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border)", 
                              borderInlineStart: isLoaded ? "4px solid #10b981" : "4px solid var(--border)",
                              borderRadius: 12, 
                              padding: 14, 
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: "700", color: "var(--text)" }}>{p.tracking_number}</span>
                              <span className={`status ${p.status}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                                {t[p.status] || p.status}
                              </span>
                            </div>
                            <div className="card-meta-row" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>👤 {p.receiver_name}</span>
                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>📍 De: {p.origin}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {detailPkg && (
        <PackageDetails
          pkg={detailPkg}
          agencies={agencies}
          onClose={() => setDetailPkg(null)}
          onUpdated={() => { loadData(); setDetailPkg(null); }}
        />
      )}

      {showScanner && (
        <Scanner
          agencies={agencies}
          onOpenPackage={(pkg) => setShowScanner(false)}
          onClose={() => setShowScanner(false)}
          onUpdated={() => loadData(true)}
          expectedAgency={scanFilterAgency}
        />
      )}
      </div>
      <MobileBottomNav 
        activeTab="feuille_de_route"
        onChange={(newTab) => {
          if (newTab === "scanner") {
            setShowScanner(true);
          }
        }}
        tabs={[
          {
            id: "feuille_de_route",
            label: lang === "ar" ? "ورقة الطريق" : "Feuille de Route",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            )
          },
          {
            id: "scanner",
            label: lang === "ar" ? "مسح الرمز" : "Scanner",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )
          }
        ]}
      />
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, badge }) {
  return (
    <button
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "12px" }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: active ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
        color: active ? "#3b82f6" : "var(--text-dim)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all 0.2s ease"
      }}>{icon}</div>
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && <span className="badge">{badge}</span>}
    </button>
  );
}
