import { useState, useEffect, useRef } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import { statusColors, statusBg } from "../lib/helpers";
import { Geolocation } from "@capacitor/geolocation";
import Scanner from "../components/Scanner";
import PackageDetails from "../components/PackageDetails";

export default function DriverPanel() {
  const { t, lang, setLang, profile, signOut } = useApp();
  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [driverInfo, setDriverInfo] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [detailPkg, setDetailPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  useEffect(() => {
    if (!profile?.driver_id) return;

    updateLocation();
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);

    async function updateLocation() {
      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== "granted") {
          const req = await Geolocation.requestPermissions();
          if (req.location !== "granted") {
            console.warn("Location permission denied.");
            return;
          }
        }

        let position;
        try {
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 30000
          });
        } catch (e) {
          console.warn("High accuracy GPS failed, falling back to network coarse location...", e);
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 60000
          });
        }

        const { latitude, longitude } = position.coords;
        await supabase
          .from("drivers")
          .update({
            latitude,
            longitude,
            last_active: new Date().toISOString()
          })
          .eq("id", profile.driver_id);
      } catch (error) {
        console.warn("Geolocation error:", error);
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
    <div className="app">
      {/* Sidebar / Left Menu */}
      <aside className="sidebar">
        <div className="logo" style={{ fontSize: 22, marginBottom: 18 }}>⚡ {t.appName}</div>
        
        {driverInfo && (
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
              {driverInfo.name.substring(0, 2).toUpperCase()}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-dim)", fontWeight: "600" }}>
                {lang === "ar" ? "السائق المهني" : "Conducteur Pro"}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {driverInfo.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "10px", color: "var(--text-dim)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  🚚 {lang === "ar" ? "سائق" : "Saa'iq"}
                </span>
                <span style={{ color: "rgba(255, 255, 255, 0.15)" }}>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  🔑 {driverInfo.code}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="nav-grid">
          <NavBtn
            icon="📦"
            label={lang === "ar" ? "ورقة الطريق" : "Feuille de Route"}
            active={true}
            onClick={() => {}}
          />
        </div>

        {/* Discreet Logout Link at bottom of sidebar */}
        <div style={{ marginTop: "auto", paddingTop: 14, textAlign: "center" }}>
          <button 
            onClick={signOut}
            style={{ 
              background: "none",
              border: "none",
              color: "#f87171", 
              fontSize: "12px",
              cursor: "pointer",
              padding: "6px 12px",
              opacity: 0.8,
              fontWeight: "600",
              letterSpacing: "0.5px",
              transition: "opacity 0.2s ease"
            }}
            onMouseEnter={(e) => e.target.style.opacity = "1"}
            onMouseLeave={(e) => e.target.style.opacity = "0.8"}
          >
            {lang === "ar" ? "تسجيل الخروج" : "Déconnexion"}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main">
        <header className="topbar">
          <div>
            <h1>🚚 {lang === "ar" ? "مهام التوصيل" : "Feuille de Route"}</h1>
            <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>
              {lang === "ar" ? "الطرود مرتبة حسب وجهة كل مدينة" : "Colis groupés par agence destinataire"}
            </p>
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
                    <span style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "rgba(59,130,246,0.1)",
                      color: "var(--primary)",
                      fontWeight: 600
                    }}>
                      {pkgs.length} {lang === "ar" ? "طرود" : "colis"}
                    </span>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t.trackingNumber}</th>
                          <th>{lang === "ar" ? "من (المنشأ)" : "De (Origine)"}</th>
                          <th>{t.receiverName}</th>
                          <th>{t.weight}</th>
                          <th>{t.status}</th>
                          <th>{t.manage}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pkgs.map((p) => (
                          <tr key={p.id}>
                            <td><b>{p.tracking_number}</b></td>
                            <td><span style={{ fontSize: 12, padding: "2px 6px", background: "var(--surface-2)", borderRadius: 6, fontWeight: 500 }}>{p.origin}</span></td>
                            <td>{p.receiver_name}</td>
                            <td>{p.weight} {t.kg}</td>
                            <td>
                              <span className={`status ${p.status}`}>{t[p.status]}</span>
                            </td>
                            <td>
                              <button className="btn-manage" onClick={() => setDetailPkg(p)}>⚙️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
          onClose={() => setShowScanner(false)}
          onUpdated={() => loadData(true)}
        />
      )}
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
