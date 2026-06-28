import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import PackageForm from "../components/PackageForm";
import PackageDetails from "../components/PackageDetails";

export default function AdminPanel() {
  const { t, lang, setLang, signOut } = useApp();
  const [tab, setTab] = useState("dashboard");
  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [showAgForm, setShowAgForm] = useState(false);
  const [detailPkg, setDetailPkg] = useState(null);

  const unread = notifs.filter((n) => !n.is_read).length;

  useEffect(() => {
    loadData();
  }, []);

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
    setPackages(pkgs || []);
    setAgencies(ags || []);
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
        <NavBtn icon="📊" label={t.dashboard} active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
        <NavBtn icon="📦" label={t.packages} active={tab === "packages"} onClick={() => setTab("packages")} />
        <NavBtn icon="🏢" label={t.agencies} active={tab === "agencies"} onClick={() => setTab("agencies")} />
        <NavBtn icon="🔔" label={t.notifications} active={tab === "notifs"} onClick={() => setTab("notifs")} badge={unread} />
      </aside>

      <main className="main">
        <div className="topbar">
          <h1>{t.adminPanel}</h1>
          <div className="topbar-actions">
            <button className="btn-sm" onClick={() => setLang(lang === "ar" ? "fr" : "ar")}>🌐 {lang === "ar" ? "FR" : "ع"}</button>
            <button className="btn-sm" onClick={signOut}>{t.logout}</button>
          </div>
        </div>

        {tab === "dashboard" && (
          <>
            <div className="stats">
              <Stat val={packages.length} lbl={t.totalPackages} />
              <Stat val={agencies.length} lbl={t.totalAgencies} />
              <Stat val={packages.filter((p) => p.status === "arrived").length} lbl={t.newArrivals} />
            </div>
            <PkgHeader t={t} onAdd={() => setShowPkgForm(true)} />
            <PackagesTable packages={packages} t={t} onManage={setDetailPkg} />
          </>
        )}

        {tab === "packages" && (
          <>
            <PkgHeader t={t} onAdd={() => setShowPkgForm(true)} />
            <PackagesTable packages={packages} t={t} onManage={setDetailPkg} />
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
                <thead><tr><th>{t.name}</th><th>{t.code}</th><th>{t.city}</th><th>{t.packages}</th></tr></thead>
                <tbody>
                  {agencies.map((a) => (
                    <tr key={a.id}>
                      <td><b>{a.name}</b></td><td>{a.code}</td><td>{a.city}</td>
                      <td>{packages.filter((p) => p.agency_id === a.id).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "notifs" && (
          <div>
            {notifs.length === 0 ? (
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
      </main>

      {showPkgForm && (
        <PackageForm agencies={agencies} onClose={() => setShowPkgForm(false)} onSaved={() => { setShowPkgForm(false); loadData(); }} />
      )}
      {showAgForm && (
        <AgencyForm onClose={() => setShowAgForm(false)} onSaved={() => { setShowAgForm(false); loadData(); }} />
      )}
      {detailPkg && (
        <PackageDetails pkg={detailPkg} agencies={agencies} onClose={() => setDetailPkg(null)} onUpdated={() => { loadData(); setDetailPkg(null); }} />
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

function Stat({ val, lbl }) {
  return <div className="stat-card"><div className="val">{val}</div><div className="lbl">{lbl}</div></div>;
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
  if (!packages.length) return <div className="empty">{t.noPackages}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>{t.trackingNumber}</th><th>{t.senderName}</th><th>{t.destination}</th><th>{t.weight}</th><th>{t.status}</th><th>{t.manage}</th></tr></thead>
        <tbody>
          {packages.map((p) => (
            <tr key={p.id}>
              <td><b>{p.tracking_number}</b></td>
              <td>{p.sender_name}</td>
              <td>{p.destination}</td>
              <td>{p.weight} {t.kg}</td>
              <td><span className={`status ${p.status}`}>{t[p.status]}</span></td>
              <td><button className="btn-manage" onClick={() => onManage(p)}>⚙️ {t.manage}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgencyForm({ onClose, onSaved }) {
  const { t } = useApp();
  const [form, setForm] = useState({ name: "", city: "", code: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.email || !form.password || !form.name) { setErr(t.fillAll); return; }
    setBusy(true); setErr("");

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email, password: form.password,
    });
    if (authErr) { setErr(authErr.message); setBusy(false); return; }

    const { data: agency, error: agErr } = await supabase
      .from("agencies")
      .insert({
        name: form.name,
        code: form.code || "AG-" + Date.now().toString().slice(-5),
        city: form.city, email: form.email,
      })
      .select().single();

    if (!agErr && authData.user) {
      await supabase.from("profiles").insert({
        id: authData.user.id, role: "agency", agency_id: agency.id,
      });
    }
    setBusy(false);
    if (!agErr) onSaved(); else setErr(agErr.message);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t.addAgency}</h2>
        {err && <div className="error">{err}</div>}
        <div className="field"><label>{t.name}</label><input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="field"><label>{t.city}</label><input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
        <div className="field"><label>{t.code}</label><input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="AG-001" /></div>
        <div className="field"><label>{t.email}</label><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div className="field"><label>{t.password}</label><input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "..." : t.save}</button>
          <button className="btn-sm" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}
