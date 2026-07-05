import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import { createClient } from "@supabase/supabase-js";
import PackageForm from "../components/PackageForm";
import PackageDetails from "../components/PackageDetails";
import Scanner from "../components/Scanner";

export default function AdminPanel() {
  const { t, lang, setLang, signOut } = useApp();
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
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
    const msg = lang === "ar" ? `هل تريد مسح الشوفور "${d.name}"؟` : `Supprimer le chauffeur "${d.name}" ?`;
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
          <NavBtn icon="🏢" label={t.agencies} active={tab === "agencies"} onClick={() => setTab("agencies")} />
          <NavBtn icon="🚚" label={lang === "ar" ? "الشوفورات" : "Chauffeurs"} active={tab === "drivers"} onClick={() => setTab("drivers")} />
          <NavBtn icon="🔔" label={t.notifications} active={tab === "notifs"} onClick={() => setTab("notifs")} badge={unread} />
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <h1>{t.adminPanel}</h1>
          <div className="topbar-actions">
            <button className="btn-sm" onClick={() => setShowScanner(true)}>📷 {t.scan}</button>
            <button className="btn-sm" onClick={() => setLang(lang === "ar" ? "fr" : "ar")}>🌐 {lang === "ar" ? "FR" : "ع"}</button>
            <button className="btn-sm" onClick={signOut}>{t.logout}</button>
          </div>
        </div>

        {tab === "dashboard" && (
          <>
            <div className="stats">
              <Stat val={packages?.length || 0} lbl={t.totalPackages} />
              <Stat val={agencies?.length || 0} lbl={t.totalAgencies} />
              <Stat val={packages?.filter((p) => p?.status === "arrived")?.length || 0} lbl={t.newArrivals} />
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
              <h2>{lang === "ar" ? "الشوفورات" : "Chauffeurs"}</h2>
              <button className="btn-accent btn-sm" onClick={() => setShowDrForm(true)}>
                + {lang === "ar" ? "إضافة شوفور" : "Ajouter Chauffeur"}
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
      {showDrForm && (
        <ChauffeurForm onClose={() => setShowDrForm(false)} onSaved={() => { setShowDrForm(false); loadData(); }} />
      )}
      {mapDriver && (
        <div className="modal-overlay" onClick={() => setMapDriver(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <h3>📍 {lang === "ar" ? `موقع الشوفور: ${mapDriver.name}` : `Position de ${mapDriver.name}`}</h3>
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

function PackagesTable({ packages, t, onManage, onDelete }) {
  if (!packages || !packages.length) return <div className="empty">{t.noPackages}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>{t.trackingNumber}</th><th>{t.senderName}</th><th>{t.destination}</th><th>{t.weight}</th><th>{t.status}</th><th>{t.manage}</th></tr></thead>
        <tbody>
          {packages?.map((p) => (
            <tr key={p.id}>
              <td><b>{p.tracking_number}</b></td>
              <td>{p.sender_name}</td>
              <td>{p.destination}</td>
              <td>{p.weight} {t.kg}</td>
              <td><span className={`status ${p.status}`}>{t[p.status]}</span></td>
              <td style={{ display: "flex", gap: 6 }}>
                <button className="btn-manage" onClick={() => onManage(p)}>⚙️</button>
                {onDelete && <button className="btn-danger btn-sm" onClick={() => onDelete(p)}>🗑️</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <h2>{lang === "ar" ? "إضافة شوفور جديد" : "Ajouter Chauffeur"}</h2>
        {err && <div className="error">{err}</div>}
        <div className="field"><label>{t.name}</label><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Yassine Chifoor" /></div>
        <div className="field"><label>{t.code}</label><input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="DRV-001" style={{ textTransform: "uppercase" }} /></div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "..." : t.save}</button>
          <button className="btn-sm" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}
