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
  const [agencyName, setAgencyName] = useState("");
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
    if (profile?.agency_id) loadData();
  }, [profile]);

  async function loadData() {
    const { data: ag } = await supabase
      .from("agencies").select("name").eq("id", profile.agency_id).single();
    setAgencyName(ag?.name || "");

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
        <div className="logo" style={{ fontSize: 22, marginBottom: 18 }}>⚡ {t.appName}</div>
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
          <h1>{t.welcome} {agencyName} 👋</h1>
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
        <Scanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
