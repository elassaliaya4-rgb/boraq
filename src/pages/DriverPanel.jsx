import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import { statusColors, statusBg } from "../lib/helpers";
import Scanner from "../components/Scanner";
import PackageDetails from "../components/PackageDetails";

export default function DriverPanel() {
  const { t, lang, profile, signOut } = useApp();
  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [driverInfo, setDriverInfo] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [detailPkg, setDetailPkg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.driver_id) {
      loadData();
    }
  }, [profile]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch Driver info
      const { data: drv } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", profile.driver_id)
        .single();
      setDriverInfo(drv);

      // 2. Fetch all agencies
      const { data: ags } = await supabase
        .from("agencies")
        .select("*");
      setAgencies(ags || []);

      // 3. Fetch all active packages (not delivered yet)
      const { data: pkgs } = await supabase
        .from("packages")
        .select("*")
        .neq("status", "delivered")
        .order("created_at", { ascending: false });
      setPackages(pkgs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
      <div className="login-wrap">
        <div className="logo">⚡ Boraq</div>
        <div style={{ color: "var(--text-dim)", marginTop: 10 }}>⌛ ...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Sidebar / Left Menu */}
      <aside className="sidebar">
        <div className="logo">⚡ Boraq</div>
        
        {driverInfo && (
          <div style={{
            margin: "0 15px 20px 15px",
            padding: "10px 12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: 10
          }}>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>🚚 {lang === "ar" ? "السائق الحالي" : "Chauffeur Actuel"}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", marginTop: 2 }}>{driverInfo.name}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>🔑 {driverInfo.code}</div>
          </div>
        )}

        <div className="sidebar-menu">
          <button className="nav-item active">
            📦 {lang === "ar" ? "مسارات الطرود" : "Routes des Colis"}
          </button>
        </div>

        <button className="btn-danger btn-block" onClick={signOut} style={{ marginTop: "auto", marginInline: 15, width: "calc(100% - 30px)" }}>
          🚪 {t.logout}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main">
        <header className="topbar">
          <div>
            <h1>🚚 {lang === "ar" ? "مهام التوصيل" : "Feuille de Route"}</h1>
            <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
              {lang === "ar" ? "الطرود مرتبة حسب وجهة كل مدينة" : "Colis groupés par agence destinataire"}
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowScanner(true)}>
            📷 {lang === "ar" ? "مسح الطرود (سكان)" : "Scanner Colis"}
          </button>
        </header>

        {packages.length === 0 ? (
          <div className="empty">
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
                          <th>{t.senderName}</th>
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
                            <td>{p.sender_name}</td>
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
          onUpdated={loadData}
        />
      )}
    </div>
  );
}
