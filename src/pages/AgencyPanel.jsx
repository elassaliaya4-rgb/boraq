import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import PackageForm from "../components/PackageForm";
import PackageDetails from "../components/PackageDetails";
import Scanner from "../components/Scanner";

export default function AgencyPanel() {
  const { t, lang, setLang, signOut, profile } = useApp();
  const [tab, setTab] = useState("packages");
  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [agencyInfo, setAgencyInfo] = useState(null);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [detailPkg, setDetailPkg] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const unread = notifs.filter((n) => !n.is_read).length;

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
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
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
            background: "rgba(255, 255, 255, 0.08)",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 11,
            marginBottom: 16,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#e2e8f0",
            lineHeight: "1.4"
          }}>
            <div style={{ fontWeight: 600, color: "var(--accent, #fbbf24)" }}>🏢 {agencyInfo.name}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
              📍 {agencyInfo.city} • 🔑 {agencyInfo.code}
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
      </aside>

      <main className="main">
        <div className="topbar">
          <h1>{t.welcome} {agencyInfo?.name || "Agence"} 👋</h1>
          <div className="topbar-actions">
            <button className="btn-sm" onClick={() => setShowScanner(true)}>📷 {t.scan}</button>
            <button className="btn-sm" onClick={() => setLang(lang === "ar" ? "fr" : "ar")}>🌐 {lang === "ar" ? "FR" : "ع"}</button>
            <button className="btn-sm" onClick={signOut}>{t.logout}</button>
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
        />
      )}
    </div>
  );
}
