import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Tab State inside the main view: 'tracking' | 'agencies' | 'simulator'
  const [activeTab, setActiveTab] = useState("tracking");

  // Tracking database states
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  // Agencies state
  const [agencies, setAgencies] = useState([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState("all");

  // Price simulator state
  const [weight, setWeight] = useState(1);
  const [serviceType, setServiceType] = useState("express");
  const [estimatedPrice, setEstimatedPrice] = useState(null);

  // Fetch agencies on mount
  useEffect(() => {
    async function fetchAgencies() {
      setAgenciesLoading(true);
      try {
        const { data, error } = await supabase.from("agencies").select("*").order("city");
        if (!error && data) setAgencies(data);
      } catch (e) {
        console.error(e);
      } finally {
        setAgenciesLoading(false);
      }
    }
    fetchAgencies();
  }, []);

  // Handle tracking submission
  async function handleTrack(e) {
    if (e) e.preventDefault();
    if (!trackCode.trim()) return;
    setTrackLoading(true);
    setTrackError("");
    setTrackResult(null);

    try {
      const codeClean = trackCode.trim().toUpperCase();
      const { data, error } = await supabase
        .from("packages")
        .select("*, agencies!packages_destination_agency_id_fkey(name, city)")
        .or(`tracking_number.ilike.${codeClean},qr_code.ilike.${codeClean}`)
        .single();

      if (error || !data) {
        setTrackError(isAr ? "لم نجد أي شحنة بهذا الرقم، يرجى التحقق" : "Aucune expédition trouvée avec ce numéro");
      } else {
        setTrackResult(data);
      }
    } catch (err) {
      setTrackError(isAr ? "خطأ في الاتصال بالخادم" : "Erreur de connexion au serveur");
    } finally {
      setTrackLoading(false);
    }
  }

  // Handle tariff simulation
  function handleSimulate(e) {
    if (e) e.preventDefault();
    const baseRate = serviceType === "express" ? 35 : 20;
    const total = baseRate + weight * 5;
    setEstimatedPrice(total);
  }

  const cities = Array.from(new Set(agencies.map(a => a.city).filter(Boolean)));

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: "#0f172a", // Clean professional slate dark theme
      color: "#f8fafc",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      margin: 0,
      padding: 0,
      boxSizing: "border-box"
    }}>
      
      {/* ── 1. CLEAN CORPORATE NAVBAR ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 40px",
        background: "#1e293b",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky",
        top: 0,
        zIndex: 1000
      }}>
        {/* Brand Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "#6366f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.01em" }}>BORAQ LOGISTICS</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>
              {isAr ? "نقل البضائع والإرساليات بالمغرب" : "Commissionnaire de Transport National"}
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: "flex", alignItems: "center", gap: "28px" }} className="desktop-only-table">
          <a href="#prestations" style={{ color: "#cbd5e1", textDecoration: "none", fontSize: "14px", fontWeight: "600" }}>
            {isAr ? "خدماتنا" : "Prestations"}
          </a>
          <a href="#agencies-section" style={{ color: "#cbd5e1", textDecoration: "none", fontSize: "14px", fontWeight: "600" }}>
            {isAr ? "شبكة الوكالات" : "Réseau National"}
          </a>
          <a href="#simulator-section" style={{ color: "#cbd5e1", textDecoration: "none", fontSize: "14px", fontWeight: "600" }}>
            {isAr ? "حاسبة الأسعار" : "Tarifs"}
          </a>
        </nav>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#ffffff",
              padding: "6px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600"
            }}
          >
            {isAr ? "Français" : "العربية"}
          </button>

          <button
            onClick={onOpenLogin}
            style={{
              background: "#6366f1",
              border: "none",
              color: "#ffffff",
              padding: "8px 18px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "700",
              boxShadow: "0 2px 10px rgba(99,102,241,0.2)"
            }}
          >
            {isAr ? "فضاء الخدامة" : "Espace Pro"}
          </button>
        </div>
      </header>

      {/* ── 2. HERO / DIRECT TRACKING WIDGET SECTION ── */}
      <section style={{
        padding: "80px 40px",
        background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
        textAlign: "center"
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: "800", color: "#ffffff", marginBottom: "16px", letterSpacing: "-0.02em" }}>
            {isAr ? "تتبع وتسليم الشحنات والطرود عبر المغرب" : "Transport & Livraison de Marchandises au Maroc"}
          </h1>
          
          <p style={{ fontSize: "16px", color: "#94a3b8", maxWidth: "600px", margin: "0 auto 36px auto", lineHeight: 1.6 }}>
            {isAr
              ? "نؤمن نقل الإرساليات والطرود بين جميع المدن المغربية مع توفير تتبع فوري بـ كود باركود موحد وإشعارات حالة الشحنة."
              : "Suivi en temps réel de vos expéditions. Saisissez votre numéro de colis pour localiser votre marchandise instantanément."}
          </p>

          {/* Clean Real-world Tracking Input Box */}
          <div style={{
            background: "#1e293b",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            textAlign: isAr ? "right" : "left"
          }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", color: "#ffffff", fontWeight: "700" }}>
              {isAr ? "أدخل رقم تتبع الشحنة الخاص بك:" : "Suivi d'envoi / Saisir le numéro de colis"}
            </h3>
            
            <form onSubmit={handleTrack} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <input
                type="text"
                value={trackCode}
                onChange={e => setTrackCode(e.target.value)}
                placeholder={isAr ? "مثال: BRQ-897162-CAS" : "Exemple: BRQ-897162-CAS"}
                style={{
                  flex: 1,
                  minWidth: "250px",
                  padding: "14px 18px",
                  borderRadius: "6px",
                  border: "1px solid #475569",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
              <button
                type="submit"
                disabled={trackLoading}
                style={{
                  padding: "14px 28px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#6366f1",
                  color: "#ffffff",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                {trackLoading ? "..." : (isAr ? "بحث" : "Rechercher")}
              </button>
            </form>

            {trackError && (
              <div style={{ marginTop: "16px", color: "#f87171", fontSize: "13px", fontWeight: "600" }}>
                {trackError}
              </div>
            )}

            {trackResult && (
              <div style={{
                marginTop: "20px",
                padding: "18px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontWeight: "700", color: "#6366f1" }}>{trackResult.tracking_number}</span>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    background: "rgba(16,185,129,0.15)",
                    color: "#10b981",
                    padding: "4px 10px",
                    borderRadius: "4px"
                  }}>{trackResult.status}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", color: "#cbd5e1" }}>
                  <div><b>{isAr ? "المرسل إليه:" : "Destinataire:"}</b> {trackResult.receiver_name || "—"}</div>
                  <div><b>{isAr ? "مدينة المنشأ:" : "Origine:"}</b> {trackResult.origin}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. REALISTIC PRESTATIONS GRID SECTION ── */}
      <section id="prestations" style={{ padding: "80px 40px", background: "#0f172a" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
              {isAr ? "خدمات النقل والخدمات اللوجستية المعتمدة" : "Prestations & Solutions de Transport"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "15px", marginTop: "8px" }}>
              {isAr ? "حلول شحن متكاملة لـ الأفراد والشركات عبر التراب الوطني" : "Des solutions fiables pour l'expédition de vos marchandises au Maroc."}
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px"
          }}>
            {/* Prestation 1 */}
            <div style={{ padding: "24px", borderRadius: "8px", background: "#1e293b", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", color: "#6366f1" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", margin: "0 0 10px 0" }}>
                {isAr ? "شحن الإرساليات السريع" : "Messagerie Express"}
              </h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                {isAr ? "شحن وتوصيل الطرود الصغيرة والوثائق في أقل من 24 ساعة بـ تغليف مؤمن." : "Livraison garantie sous 24H de vos colis et enveloppes à travers nos agences."}
              </p>
            </div>

            {/* Prestation 2 */}
            <div style={{ padding: "24px", borderRadius: "8px", background: "#1e293b", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", color: "#6366f1" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", margin: "0 0 10px 0" }}>
                {isAr ? "شحن الحمولات الكبيرة" : "Affrètement & Lots"}
              </h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                {isAr ? "حلول مخصصة لنقل البضائع والمعدات ذات الوزن الثقيل عبر شاحنات مجهزة." : "Solutions d'affrètement complet ou partiel pour les expéditions volumineuses."}
              </p>
            </div>

            {/* Prestation 3 */}
            <div style={{ padding: "24px", borderRadius: "8px", background: "#1e293b", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", color: "#6366f1" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", margin: "0 0 10px 0" }}>
                {isAr ? "التتبع الجغرافي للأسطول" : "Suivi GPS Flotte"}
              </h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                {isAr ? "أجهزة تتبع متطورة مدمجة بشاحناتنا لمراقبة تحركات البضائع بشكل مباشر." : "Géolocalisation constante des véhicules de transport pour assurer le suivi."}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. REALISTIC MOROCCAN AGENCIES GRID ── */}
      <section id="agencies-section" style={{ padding: "80px 40px", background: "#1e293b" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "36px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                {isAr ? "شبكة وكالات البراق بالمغرب" : "Nos Agences de Dépôt & Retrait"}
              </h2>
              <p style={{ color: "#cbd5e1", fontSize: "14px", marginTop: "4px" }}>
                {isAr ? "اعثر على أقرب وكالة إليك في مدينتك" : "Retrouvez les adresses et contacts de nos points de services."}
              </p>
            </div>

            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              style={{
                padding: "10px 16px",
                borderRadius: "6px",
                background: "#0f172a",
                border: "1px solid #475569",
                color: "#ffffff",
                fontWeight: "600"
              }}
            >
              <option value="all">{isAr ? "كل المدن" : "Toutes les villes"}</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {agenciesLoading ? (
            <div style={{ color: "#cbd5e1" }}>{isAr ? "جاري تحميل الوكالات..." : "Chargement des agences..."}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
              {agencies
                .filter(a => selectedCity === "all" || a.city === selectedCity)
                .map(a => (
                  <div key={a.id} style={{ padding: "20px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontWeight: "800", fontSize: "16px", color: "#ffffff" }}>{a.name}</div>
                    <div style={{ fontSize: "13px", color: "#6366f1", marginTop: "4px", fontWeight: "700" }}>{a.city}</div>
                    {a.phone && <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>Tél: {a.phone}</div>}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Agence " + a.name + " " + (a.city || ""))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-block", marginTop: "12px", fontSize: "13px", color: "#10b981", fontWeight: "700", textDecoration: "none" }}
                    >
                      {isAr ? "الاتجاهات على الخريطة ➔" : "Google Maps ➔"}
                    </a>
                  </div>
                ))}
            </div>
          )}

        </div>
      </section>

      {/* ── 5. REALISTIC SHIPPINGS TARIFF SIMULATOR SECTION ── */}
      <section id="simulator-section" style={{ padding: "80px 40px", background: "#0f172a" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
              {isAr ? "حاسبة تكاليف الشحن التقريبية" : "Simulateur de Tarifs d'expédition"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "4px" }}>
              {isAr ? "أدخل الوزن ونوع الخدمة لمعرفة التكلفة المقدرة" : "Estimez rapidement les frais de livraison de vos colis."}
            </p>
          </div>

          <div style={{
            background: "#1e293b",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "12px",
            padding: "30px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            textAlign: isAr ? "right" : "left"
          }}>
            <form onSubmit={handleSimulate} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>{isAr ? "وزن الطرد (كلغ):" : "Poids estimé du colis (kg):"}</label>
                <input
                  type="number"
                  min="1"
                  value={weight}
                  onChange={e => setWeight(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontWeight: "600",
                    marginTop: "6px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#cbd5e1" }}>{isAr ? "نوع خدمة الشحن:" : "Mode d'envoi:"}</label>
                <select
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontWeight: "600",
                    marginTop: "6px",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="express">{isAr ? "شحن سريع (خلال 24 ساعة)" : "Expédition Express (24H)"}</option>
                  <option value="standard">{isAr ? "شحن عادي (خلال 48 ساعة)" : "Expédition Standard (48H)"}</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  background: "#6366f1",
                  color: "#ffffff",
                  border: "none",
                  padding: "14px",
                  borderRadius: "6px",
                  fontWeight: "700",
                  fontSize: "15px",
                  cursor: "pointer",
                  width: "100%"
                }}
              >
                {isAr ? "احسب التكلفة التقريبية" : "Calculer le tarif estimé"}
              </button>
            </form>

            {estimatedPrice !== null && (
              <div style={{
                marginTop: "24px",
                padding: "16px",
                borderRadius: "6px",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ fontWeight: "700", color: "#cbd5e1" }}>{isAr ? "التسعيرة المقدرة للمغرب:" : "Frais de port estimés:"}</span>
                <span style={{ fontSize: "20px", fontWeight: "800", color: "#10b981" }}>{estimatedPrice} MAD</span>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── 6. REAL CLIENTS LOGISTICS TESTIMONIALS ── */}
      <section style={{ padding: "80px 40px", background: "#1e293b", textAlign: "center" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", marginBottom: "36px" }}>
            {isAr ? "شركاء النجاح يثقون بنا" : "Ils font confiance à Boraq Logistics"}
          </h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", textAlign: isAr ? "right" : "left" }}>
            <div style={{ padding: "20px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ fontSize: "14px", color: "#cbd5e1", fontStyle: "italic", lineHeight: 1.5 }}>
                {isAr 
                  ? "« نعتمد بالكامل على خدمات البراق لشحن سلع متجرنا الإلكتروني. تتبع ممتاز ودقة متناهية فـ المواعيد »"
                  : "« Nous expédions tous les colis de notre boutique e-commerce via Boraq Logistics. Le suivi est parfait et nos clients sont livrés à temps. »"}
              </p>
              <div style={{ marginTop: "14px", fontWeight: "700", color: "#ffffff", fontSize: "13px" }}>
                {isAr ? "أحمد س. - صاحب متجر إلكتروني، الدار البيضاء" : "Ahmed S. - Gérant e-Commerce, Casablanca"}
              </div>
            </div>

            <div style={{ padding: "20px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ fontSize: "14px", color: "#cbd5e1", fontStyle: "italic", lineHeight: 1.5 }}>
                {isAr 
                  ? "« وكالات البراق متواجدة فـ كُـل المدن الرئيسية، نرسل البضائع والملفات بـ أمان وسرعة فائقة »"
                  : "« Réseau national très réactif. Pratique pour envoyer nos documents administratifs et petits lots de marchandises entre agences. »"}
              </p>
              <div style={{ marginTop: "14px", fontWeight: "700", color: "#ffffff", fontSize: "13px" }}>
                {isAr ? "كريمة ب. - مسؤولة إدارية، طنجة" : "Karima B. - Responsable Administrative, Tanger"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "36px 40px",
        textAlign: "center",
        background: "#0f172a",
        color: "#64748b",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        fontSize: "13px"
      }}>
        © {new Date().getFullYear()} BORAQ LOGISTICS. Tous droits réservés. Commissionnaire de Transport National agréé au Maroc.
      </footer>
    </div>
  );
}
