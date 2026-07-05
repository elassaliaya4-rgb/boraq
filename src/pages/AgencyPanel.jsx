import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import PackageForm from "../components/PackageForm";
import PackageDetails from "../components/PackageDetails";
import Scanner from "../components/Scanner";

export default function AgencyPanel() {
  const { t, lang, setLang, signOut, profile, triggerToast } = useApp();
  const [tab, setTab] = useState("packages");
  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [agencyInfo, setAgencyInfo] = useState(null);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [detailPkg, setDetailPkg] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

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

  return (
    <div className="app">
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
          <button className={`nav-item ${tab === "packages" ? "active" : ""}`} onClick={() => setTab("packages")}>
            📦 {t.myPackages}
          </button>
          <button className={`nav-item ${tab === "notifs" ? "active" : ""}`} onClick={() => setTab("notifs")}>
            🔔 {t.notifications}
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>
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
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              opacity: 0.85,
              fontWeight: "600"
            }}
          >
            🚪 {lang === "ar" ? "تسجيل الخروج" : "Déconnexion"}
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
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
          </div>
        </div>

        {tab === "packages" && (
          <>
            <div className="row-head">
              <h2>{t.myPackages}</h2>
              <button className="btn-accent btn-sm" onClick={() => setShowPkgForm(true)}>{t.addPackage}</button>
            </div>
            {packages.length === 0 ? (
              <div className="empty">{t.noPackages}</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{t.trackingNumber}</th><th>{t.senderName}</th><th>{t.origin}</th><th>{t.weight}</th><th>{t.status}</th><th>{t.manage}</th></tr></thead>
                  <tbody>
                    {packages.map((p) => (
                      <tr key={p.id}>
                        <td><b>{p.tracking_number}</b></td>
                        <td>{p.sender_name}</td>
                        <td>{p.origin}</td>
                        <td>{p.weight} {t.kg}</td>
                        <td><span className={`status ${p.status}`}>{t[p.status]}</span></td>
                        <td><button className="btn-manage" onClick={() => setDetailPkg(p)}>⚙️ {t.manage}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
        <PackageDetails pkg={detailPkg} agencies={agencies} onClose={() => setDetailPkg(null)} onUpdated={() => { loadData(); setDetailPkg(null); }} />
      )}
      {showScanner && (
        <Scanner
          agencies={agencies}
          onOpenPackage={(pkg) => { setShowScanner(false); setDetailPkg(pkg); }}
          onClose={() => setShowScanner(false)}
          onUpdated={loadData}
        />
      )}
      {/* Mobile Bottom Navigation Bar (Telegram-style capsule tabs) */}
      <div className="mobile-bottom-nav">
        <button className={`mobile-nav-item ${tab === "packages" ? "active" : ""}`} onClick={() => setTab("packages")}>
          <div className="mobile-nav-icon-wrap">📦</div>
          <span>{t.myPackages}</span>
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
