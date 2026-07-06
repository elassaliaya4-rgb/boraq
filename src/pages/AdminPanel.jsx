import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import { createClient } from "@supabase/supabase-js";
import PackageForm from "../components/PackageForm";
import PackageDetails from "../components/PackageDetails";
import Scanner from "../components/Scanner";

export default function AdminPanel() {
  const { t, lang, setLang, signOut, triggerToast, theme, toggleTheme } = useApp();
  const [tab, setTab] = useState("dashboard");
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
  const [scannedSessionPkgs, setScannedSessionPkgs] = useState([]);
  const [scanFilterAgency, setScanFilterAgency] = useState("");

  const unread = notifs?.filter((n) => !n.is_read)?.length || 0;

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
    <div className="app">
      <aside className="sidebar">
        <div className="logo" style={{ fontSize: 22, marginBottom: 18 }}>⚡ {t.appName}</div>
        <div className="nav-grid">
          <NavBtn icon="📊" label={t.dashboard} active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
          <NavBtn icon="📦" label={t.packages} active={tab === "packages"} onClick={() => setTab("packages")} />
          <NavBtn icon="✅" label={lang === "ar" ? "التحقق والمسح" : "Scan & Validation"} active={tab === "scan_session"} onClick={() => setTab("scan_session")} />
          <NavBtn icon="🏢" label={t.agencies} active={tab === "agencies"} onClick={() => setTab("agencies")} />
          <NavBtn icon="🚚" label={lang === "ar" ? "السائقين" : "Chauffeurs"} active={tab === "drivers"} onClick={() => setTab("drivers")} />
          <NavBtn icon="🔔" label={t.notifications} active={tab === "notifs"} onClick={() => setTab("notifs")} badge={unread} />
        </div>
        
        {/* Discreet Logout Link at bottom of sidebar */}
        <div style={{ marginTop: "auto", paddingTop: 14, textAlign: "center", paddingLeft: 12, paddingRight: 12 }}>
          <button 
            onClick={signOut}
            style={{ 
              background: "rgba(239, 68, 68, 0.03)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              color: "#f87171", 
              fontSize: "12px",
              cursor: "pointer",
              padding: "8px 16px",
              width: "100%",
              opacity: 0.85,
              fontWeight: "600",
              letterSpacing: "0.5px",
              transition: "all 0.2s ease",
              textAlign: "center"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.03)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
            }}
          >
            {lang === "ar" ? "تسجيل الخروج" : "Déconnexion"}
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
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
                            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
            <PackagesTable packages={packages} t={t} onManage={setDetailPkg} onDelete={deletePackage} />
          </>
        )}

        {tab === "packages" && (
          <>
            <PkgHeader t={t} onAdd={() => setShowPkgForm(true)} />
            <PackagesTable packages={packages} t={t} onManage={setDetailPkg} onDelete={deletePackage} />
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

      {/* Mobile Bottom Navigation Bar (Telegram-style capsule tabs) */}
      <div className="mobile-bottom-nav">
        <button className={`mobile-nav-item ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
          <div className="mobile-nav-icon-wrap">📊</div>
          <span>{t.dashboard}</span>
        </button>
        <button className={`mobile-nav-item ${tab === "packages" ? "active" : ""}`} onClick={() => setTab("packages")}>
          <div className="mobile-nav-icon-wrap">📦</div>
          <span>{t.packages}</span>
        </button>
        <button className={`mobile-nav-item ${tab === "scan_session" ? "active" : ""}`} onClick={() => setTab("scan_session")}>
          <div className="mobile-nav-icon-wrap">✅</div>
          <span>{lang === "ar" ? "التحقق" : "Vérifier"}</span>
        </button>
        <button className={`mobile-nav-item ${tab === "agencies" ? "active" : ""}`} onClick={() => setTab("agencies")}>
          <div className="mobile-nav-icon-wrap">🏢</div>
          <span>{t.agencies}</span>
        </button>
        <button className={`mobile-nav-item ${tab === "drivers" ? "active" : ""}`} onClick={() => setTab("drivers")}>
          <div className="mobile-nav-icon-wrap">🚚</div>
          <span>{lang === "ar" ? "السائقين" : "Chauffeurs"}</span>
        </button>
        <button className={`mobile-nav-item ${tab === "notifs" ? "active" : ""}`} onClick={() => setTab("notifs")}>
          <div className="mobile-nav-icon-wrap" style={{ position: "relative" }}>
            🔔
            {unread > 0 && (
              <span className="badge" style={{ position: "absolute", top: -4, right: -4, transform: "scale(0.85)" }}>{unread}</span>
            )}
          </div>
          <span>{t.notifications}</span>
        </button>
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, badge }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      {icon} {label}
      {badge > 0 && <span className="badge">{badge}</span>}
    </button>
  );
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

function PackagesTable({ packages, t, onManage }) {
  if (!packages || !packages.length) return <div className="empty">{t.noPackages}</div>;
  return (
    <div className="table-wrap" style={{ background: "none", border: "none" }}>
      {/* Desktop Table View */}
      <table className="desktop-only-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>{t.trackingNumber}</th>
            <th>{t.receiverName}</th>
            <th>{t.destination}</th>
            <th>{t.status}</th>
          </tr>
        </thead>
        <tbody>
          {packages?.map((p) => (
            <tr 
              key={p.id} 
              onClick={() => onManage(p)}
              className="clickable-row"
              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
            >
              <td><b>{p.tracking_number}</b></td>
              <td>{p.receiver_name}</td>
              <td>{p.destination}</td>
              <td><span className={`status ${p.status}`}>{t[p.status] || p.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Card List View (no horizontal scroll) */}
      <div className="mobile-only-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {packages?.map((p) => (
          <div 
            key={p.id} 
            onClick={() => onManage(p)}
            className="clickable-row"
            style={{ 
              background: "var(--surface)", 
              border: "1px solid var(--border)", 
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
              <span style={{ fontSize: 13, fontWeight: "700", color: "var(--accent)" }}>{p.tracking_number}</span>
              <span className={`status ${p.status}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                {t[p.status] || p.status}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-dim)" }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>👤 {p.receiver_name}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>📍 {p.destination}</span>
            </div>
          </div>
        ))}
      </div>
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
