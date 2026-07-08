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
  const [tab, setTab] = useState("packages");

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
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [detailPkg, setDetailPkg] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedSessionPkgs, setScannedSessionPkgs] = useState([]);
  // Removed scanFilterAgency state

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

  // Handle native Android back button to dismiss modals/subtabs
  useEffect(() => {
    const handleBack = () => {
      if (detailPkg) {
        setDetailPkg(null);
      } else if (showPkgForm) {
        setShowPkgForm(false);
      } else if (showScanner) {
        setShowScanner(false);
      } else if (tab !== "packages") {
        setTab("packages");
      }
    };
    window.addEventListener("appBackClick", handleBack);
    return () => window.removeEventListener("appBackClick", handleBack);
  }, [detailPkg, showPkgForm, showScanner, tab]);

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
      .select("name, city, code")
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

  async function openNotif(n) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    const pkg = packages.find((p) => p.id === n.package_id);
    if (pkg) setDetailPkg(pkg);
    loadData();
  }

  async function deletePackage(pkg) {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا الطرد؟" : "Supprimer ce colis ?")) return;
    const { error } = await supabase.from("packages").delete().eq("id", pkg.id);
    if (error) alert(error.message);
    else loadData();
  }

  return (
    <div className={`app ${isMobileAPK ? "native-apk" : ""}`} style={isMobileAPK ? { flexDirection: "column" } : {}}>
      {isMobileAPK && (
        <MobileHeader 
          profileName={profile?.name || user?.email}
          onScanClick={() => setShowScanner(true)}
          onLogout={confirmSignOut}
        />
      )}
      <div style={isMobileAPK ? { display: "flex", flex: 1, width: "100%", overflow: "hidden" } : { display: "contents" }}>
        <aside className="sidebar">
          <div className="logo" style={{ fontSize: 22, marginBottom: 12 }}>⚡ {t.appName}</div>
        {agencyInfo && (
          <div style={{
            position: "relative",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)",
            padding: "12px 14px",
            borderRadius: "12px",
            marginBottom: "20px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderInlineStart: "4px solid var(--primary)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            {/* Avatar Initials Badge */}
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary) 0%, #d97706 100%)",
              color: "#0f172a",
              fontWeight: "700",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 12px rgba(251, 191, 36, 0.3)",
              flexShrink: 0
            }}>
              {agencyInfo.name.substring(0, 2).toUpperCase()}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-dim)", fontWeight: "600" }}>
                {lang === "ar" ? "الوكالة الحالية" : "Agence Actuelle"}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {agencyInfo.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "10px", color: "var(--text-dim)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  📍 {agencyInfo.city}
                </span>
                <span style={{ color: "rgba(255, 255, 255, 0.15)" }}>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  🔑 {agencyInfo.code}
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="nav-grid">
          <button className={`nav-item ${tab === "packages" ? "active" : ""}`} onClick={() => setTab("packages")} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: tab === "packages" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, transition: "background 0.2s" }}>📦</div>
            <span style={{ flex: 1 }}>{t.myPackages}</span>
          </button>
          <button className={`nav-item ${tab === "scan_session" ? "active" : ""}`} onClick={() => setTab("scan_session")} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: tab === "scan_session" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, transition: "background 0.2s" }}>✅</div>
            <span style={{ flex: 1 }}>{lang === "ar" ? "التحقق والمسح" : "Scan & Validation"}</span>
          </button>
          <button className={`nav-item ${tab === "notifs" ? "active" : ""}`} onClick={() => setTab("notifs")} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: tab === "notifs" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, transition: "background 0.2s" }}>🔔</div>
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
            <button 
              className="btn-accent" 
              onClick={() => setShowScanner(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: "600",
                borderRadius: "8px",
                cursor: "pointer"
              }}
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
            <button 
              className="btn-sm" 
              onClick={() => setLang(lang === "ar" ? "fr" : "ar")}
              style={{
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: "600",
                borderRadius: "8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              🌐 {lang === "ar" ? "FR" : "عربي"}
            </button>
            <button 
              className="btn-sm" 
              onClick={toggleTheme}
              style={{
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: "600",
                borderRadius: "8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
                color: "var(--text)"
              }}
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
                onClick={() => setScannedSessionPkgs([])}
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
      </div>
      {isMobileAPK && (
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
      )}
    </div>
  );
}
