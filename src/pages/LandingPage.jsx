import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang, theme, toggleTheme } = useApp();
  const isAr = lang === "ar";
  const isLight = theme === "light";

  // Hero tool tab state: 'tracking' | 'agencies'
  const [activeTab, setActiveTab] = useState("tracking");

  // Step Timeline tab state: 1 | 2 | 3 | 4
  const [activeStep, setActiveStep] = useState(1);
  
  // Tracking tool state
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  // Agencies tool state
  const [agencies, setAgencies] = useState([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState("all");

  // Load agencies on mount
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

  // Smooth Scroll to Tool
  function scrollToHeroTool(tabName) {
    setActiveTab(tabName);
    const heroEl = document.getElementById("hero-tools");
    if (heroEl) {
      heroEl.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Handle parcel tracking lookup
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
        setTrackError(isAr ? "لم نجد أي طرد بهذا الرقم، تحقق من الكود" : "Aucun colis trouvé avec ce numéro de suivi");
      } else {
        setTrackResult(data);
      }
    } catch (err) {
      setTrackError(isAr ? "خطأ في البحث، حاول مجدداً" : "Erreur lors de la recherche du colis");
    } finally {
      setTrackLoading(false);
    }
  }

  const cities = Array.from(new Set(agencies.map(a => a.city).filter(Boolean)));

  // Timeline step descriptions & images (Junior ISEP Style)
  const steps = [
    {
      id: 1,
      title: isAr ? "1. الدعم والإيداع بالوكالة" : "1. DÉPÔT EN AGENCE",
      desc: isAr ? "تسليم الطرد فـ أقرب وكالة وطباعة الباركود الفريد المعتمد." : "Réception de votre colis, enregistrement par code-barres et mise en sécurité instantanée.",
      img: "/boraq_packaging.jpg"
    },
    {
      id: 2,
      title: isAr ? "2. الشحن عبر الطريق الـ 3D" : "2. TRANSPORT ROUTIER EXPRESS",
      desc: isAr ? "انطلاق شاحنة البراق عبر الطريق السريع بين المدن فـ 24 ساعة." : "Acheminement rapide par camion poids lourd connecté avec géolocalisation GPS en temps réel.",
      img: "/boraq_3d_truck.jpg"
    },
    {
      id: 3,
      title: isAr ? "3. الوصول والتتبع المباشر" : "3. ARRIVÉE AGENCE DESTINATION",
      desc: isAr ? "استلام الطرد فـ وكالة الوصول ومسح الرمز لتحديث التتبع." : "Notification instantanée dès le déchargement du colis dans l'agence de votre ville.",
      img: "/boraq_map_tracking.jpg"
    },
    {
      id: 4,
      title: isAr ? "4. التسليم مع تنبيه SMS" : "4. LIVRAISON & NOTIFICATION",
      desc: isAr ? "تسليم الطرد للمستلم بـ أمان مـع إشعار SMS ورسالة توثيق الوصول." : "Remise sécurisée au destinataire final avec confirmation SMS et signature numérique.",
      img: "/boraq_sms_notif.jpg"
    }
  ];

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: isLight ? "#f8fafc" : "#030712", color: isLight ? "#0f172a" : "#f3f4f6", fontFamily: "system-ui, -apple-system, sans-serif", overflowX: "hidden" }}>
      
      {/* ── JUNIOR ISEP STYLE FLOATING GLASS PILL NAVBAR ── */}
      <div style={{ position: "sticky", top: "18px", zIndex: 1000, display: "flex", justifyContent: "center", padding: "0 20px" }}>
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "28px",
          width: "100%",
          maxWidth: "1050px",
          padding: "10px 24px",
          background: isLight ? "rgba(255, 255, 255, 0.88)" : "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "40px",
          boxShadow: isLight ? "0 14px 40px rgba(0,0,0,0.08)" : "0 14px 40px rgba(0,0,0,0.5)"
        }}>
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "900", fontSize: "20px", color: isLight ? "#0f172a" : "#fff", cursor: "pointer" }}
          >
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(14,165,233,0.5)"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span style={{ background: isLight ? "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)" : "linear-gradient(135deg, #ffffff 0%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: "20px", fontWeight: "900" }}>
              Boraq
            </span>
          </div>

          {/* Spaced Nav Links */}
          <nav className="desktop-only-table" style={{ display: "flex", alignItems: "center", gap: "32px", fontSize: "14px", fontWeight: "700" }}>
            <a href="#hero" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ color: isLight ? "#0f172a" : "#ffffff", textDecoration: "none" }}>{isAr ? "الرئيسية" : "Accueil"}</a>
            <a href="#process" style={{ color: isLight ? "#475569" : "#9ca3af", textDecoration: "none" }}>{isAr ? "مسار الشحنة" : "Process"}</a>
            <a href="#services" style={{ color: isLight ? "#475569" : "#9ca3af", textDecoration: "none" }}>{isAr ? "خدماتنا" : "Services"}</a>
            <a href="#hero-tools" onClick={() => scrollToHeroTool("agencies")} style={{ color: isLight ? "#475569" : "#9ca3af", textDecoration: "none" }}>{isAr ? "الوكالات" : "Agences"}</a>
          </nav>

          {/* Right Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={toggleTheme}
              style={{
                background: isLight ? "#f1f5f9" : "rgba(255, 255, 255, 0.08)",
                border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255, 255, 255, 0.15)",
                color: isLight ? "#0f172a" : "#f3f4f6",
                padding: "7px 12px",
                borderRadius: "30px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "800"
              }}
            >
              {isLight ? "🌙 Sombre" : "☀️ Clair"}
            </button>

            <button
              onClick={onOpenLogin}
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                border: "none",
                color: "#ffffff",
                padding: "9px 20px",
                borderRadius: "30px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
                transition: "transform 0.2s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <span>{isAr ? "فضاء الخدامة" : "Espace Pro"}</span>
            </button>
          </div>
        </header>
      </div>

      {/* ── JUNIOR ISEP STYLE HERO SECTION WITH FLOATING STATS BAR ── */}
      <section id="hero" style={{
        position: "relative",
        padding: "70px 20px 100px",
        backgroundImage: "linear-gradient(180deg, rgba(3, 7, 18, 0.75) 0%, rgba(3, 7, 18, 0.98) 100%), url('/boraq_3d_truck.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        textAlign: "center",
        overflow: "hidden"
      }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 18px",
            borderRadius: "30px",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            color: "#38bdf8",
            fontSize: "12px",
            fontWeight: "900",
            letterSpacing: "0.1em",
            marginBottom: "24px"
          }}>
            <span>⚡ LE RÉSEAU LOGISTIQUE ÉCOSYSTEME 2026</span>
          </div>

          <h1 style={{
            fontSize: "clamp(34px, 5.5vw, 60px)",
            fontWeight: "900",
            lineHeight: 1.15,
            marginBottom: "20px",
            background: "linear-gradient(135deg, #ffffff 0%, #e0f2fe 50%, #38bdf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 10px 40px rgba(0,0,0,0.8)"
          }}>
            {isAr ? "شحناتك وبضاعتك بأمان وفخامة إلى جميع المدن" : "Votre colis jusqu'à chez vous."}
          </h1>

          <p style={{ fontSize: "18px", color: "#9ca3af", maxWidth: "680px", margin: "0 auto 40px auto", lineHeight: 1.6 }}>
            {isAr
              ? "البراق للمطابقة واللوجستيك السريع فـ المغرب - تتبع فوري، سرعة فائقة، وشبكة موثوقة عبر كُـل المدن."
              : "Le réseau leader du transport de colis et marchandises au Maroc. Rapidité, sécurité et fiabilité garanties."}
          </p>

          {/* ── 2 Primary Interactive Hero Feature Cards ── */}
          <div id="hero-tools" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            maxWidth: "760px",
            margin: "0 auto"
          }}>
            {/* Card 1: Suivi de Colis */}
            <div
              onClick={() => setActiveTab("tracking")}
              style={{
                padding: "24px 20px",
                borderRadius: "22px",
                background: activeTab === "tracking"
                  ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                  : "rgba(15, 23, 42, 0.85)",
                border: activeTab === "tracking" ? "2px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: activeTab === "tracking" ? "0 14px 40px rgba(2, 132, 199, 0.5)" : "0 4px 20px rgba(0,0,0,0.3)",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                textAlign: "center"
              }}
            >
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#fff" }}>
                {isAr ? "تتبع الشحنة المباشر" : "Suivi de colis en direct"}
              </h3>
            </div>

            {/* Card 2: Nos Agences */}
            <div
              onClick={() => setActiveTab("agencies")}
              style={{
                padding: "24px 20px",
                borderRadius: "22px",
                background: activeTab === "agencies"
                  ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                  : "rgba(15, 23, 42, 0.85)",
                border: activeTab === "agencies" ? "2px solid #f87171" : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: activeTab === "agencies" ? "0 14px 40px rgba(239, 68, 68, 0.5)" : "0 4px 20px rgba(0,0,0,0.3)",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                textAlign: "center"
              }}
            >
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#fff" }}>
                {isAr ? "شبكة وكالات البراق" : "Nos agences au Maroc"}
              </h3>
            </div>
          </div>

          {/* ── Dynamic Active Tool Panel Container ── */}
          <div style={{
            marginTop: "32px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "28px",
            padding: "32px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 35px rgba(56, 189, 248, 0.15)",
            textAlign: isAr ? "right" : "left",
            maxWidth: "760px",
            margin: "32px auto 0 auto"
          }}>
            {/* Tool 1: Suivi de Colis */}
            {activeTab === "tracking" && (
              <div>
                <h3 style={{ margin: "0 0 18px 0", fontSize: "19px", color: "#38bdf8", fontWeight: "800", display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span>{isAr ? "تتبع فوري لـ الشحنة برقم التتبع" : "Recherche Rapide de Colis"}</span>
                </h3>
                <form onSubmit={handleTrack} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={trackCode}
                    onChange={e => setTrackCode(e.target.value)}
                    placeholder={isAr ? "أدخل رقم التتبع (مثال: BRQ-0917629)" : "Entrez votre numéro de suivi (ex: BRQ-0917629)"}
                    style={{
                      flex: 1,
                      minWidth: "250px",
                      padding: "16px 20px",
                      borderRadius: "14px",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#fff",
                      fontSize: "15px",
                      fontWeight: "700",
                      outline: "none"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={trackLoading}
                    style={{
                      padding: "16px 32px",
                      borderRadius: "14px",
                      border: "none",
                      background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: "15px",
                      cursor: "pointer",
                      boxShadow: "0 4px 20px rgba(14,165,233,0.4)"
                    }}
                  >
                    {trackLoading ? (isAr ? "جاري البحث..." : "Recherche...") : (isAr ? "تتبع الآن" : "Rechercher")}
                  </button>
                </form>

                {trackError && (
                  <div style={{ marginTop: "18px", padding: "14px 18px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "14px", fontWeight: 600 }}>
                    {trackError}
                  </div>
                )}

                {trackResult && (
                  <div style={{ marginTop: "24px", padding: "22px", borderRadius: "18px", background: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(56, 189, 248, 0.4)", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <span style={{ fontSize: "18px", fontWeight: "900", color: "#38bdf8" }}>{trackResult.tracking_number}</span>
                      <span style={{ fontSize: "13px", fontWeight: "800", padding: "6px 14px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
                        {trackResult.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "14px", color: "#e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div><b>{isAr ? "المستلم:" : "Destinataire:"}</b> {trackResult.receiver_name || "—"}</div>
                      <div><b>{isAr ? "المنشأ:" : "Origine:"}</b> {trackResult.origin}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tool 2: Nos Agences */}
            {activeTab === "agencies" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h3 style={{ margin: 0, fontSize: "19px", color: "#f87171", fontWeight: "800", display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>{isAr ? "شبكة وكالات البراق عبر المدن" : "Réseau des Agences Boraq"}</span>
                  </h3>
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontWeight: "700"
                    }}
                  >
                    <option value="all">{isAr ? "كل المدن" : "Toutes les villes"}</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {agenciesLoading ? (
                  <div style={{ color: "#94a3b8" }}>{isAr ? "جاري تحميل الوكالات..." : "Chargement des agences..."}</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "16px" }}>
                    {agencies
                      .filter(a => selectedCity === "all" || a.city === selectedCity)
                      .map(a => (
                        <div key={a.id} style={{ padding: "16px", borderRadius: "16px", background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <div style={{ fontWeight: "800", fontSize: "16px", color: "#fff" }}>{a.name}</div>
                          <div style={{ fontSize: "13px", color: "#38bdf8", marginTop: "4px" }}>{a.city}</div>
                          {a.phone && <div style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>Tél: {a.phone}</div>}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Agence " + a.name + " " + (a.city || ""))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "inline-block", marginTop: "12px", fontSize: "13px", color: "#10b981", fontWeight: "800", textDecoration: "none" }}
                          >
                            {isAr ? "خريطة Google Maps ➔" : "Google Maps ➔"}
                          </a>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── JUNIOR ISEP STYLE INFINITE SCROLLING MARQUEE TICKER ── */}
      <div style={{ background: isLight ? "#e2e8f0" : "#0b1329", padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", whiteSpace: "nowrap" }}>
        <div style={{ display: "inline-block", animation: "marquee 22s linear infinite" }}>
          {["Casablanca", "Rabat", "Tanger", "Marrakech", "Agadir", "Fès", "Oujda", "Meknès", "Tétouan", "Kenitra"].map((city, idx) => (
            <span key={idx} style={{ margin: "0 28px", fontSize: "15px", fontWeight: "800", color: isLight ? "#334155" : "#94a3b8", display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8", display: "inline-block" }}></span>
              <span>AGENCE BORAQ {city.toUpperCase()}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── JUNIOR ISEP STYLE 4-STEP EXPEDITION PROCESS TIMELINE SECTION ── */}
      <section id="process" style={{ padding: "90px 24px", background: isLight ? "#ffffff" : "#0a0f1d" }}>
        <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <span style={{ fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.15em", color: "#0ea5e9", background: "rgba(14,165,233,0.12)", padding: "6px 18px", borderRadius: "30px" }}>
              {isAr ? "مسار الشحنة خطوة بـ خطوة" : "UN ACCOMPAGNEMENT SUR-MESURE"}
            </span>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: "900", color: isLight ? "#0f172a" : "#ffffff", marginTop: "16px" }}>
              {isAr ? "كيف تعمل منظومة البراق اللوجستية؟" : "Comment fonctionne le parcours d'expédition ?"}
            </h2>
            <p style={{ fontSize: "16px", color: isLight ? "#64748b" : "#94a3b8", maxWidth: "620px", margin: "12px auto 0 auto" }}>
              {isAr ? "متابعة شفافة ودقيقة للشحنة من لحظة التسليم بالوكالة حتى الاستلام النهائي." : "Un processus étape par étape avec traçabilité intégrale et notifications en temps réel."}
            </p>
          </div>

          {/* 4 Interactive Step Selector Tabs (Junior ISEP Style) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "36px" }}>
            {steps.map(step => (
              <div
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                style={{
                  padding: "20px 18px",
                  borderRadius: "20px",
                  background: activeStep === step.id
                    ? (isLight ? "#0284c7" : "linear-gradient(135deg, #0ea5e9, #2563eb)")
                    : (isLight ? "#f1f5f9" : "rgba(30, 41, 59, 0.6)"),
                  border: activeStep === step.id ? "2px solid #38bdf8" : (isLight ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.08)"),
                  color: activeStep === step.id ? "#ffffff" : (isLight ? "#0f172a" : "#cbd5e1"),
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  boxShadow: activeStep === step.id ? "0 10px 30px rgba(14,165,233,0.4)" : "none"
                }}
              >
                <div style={{ fontSize: "15px", fontWeight: "900", marginBottom: "6px" }}>{step.title}</div>
                <div style={{ fontSize: "13px", opacity: 0.85, lineHeight: 1.4 }}>{step.desc}</div>
              </div>
            ))}
          </div>

          {/* Active Step Dynamic Photo Showcase Container (Junior ISEP Style) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "36px",
            alignItems: "center",
            padding: "36px",
            borderRadius: "28px",
            background: isLight ? "#f8fafc" : "rgba(15, 23, 42, 0.8)",
            border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.15)"
          }}>
            <div style={{ borderRadius: "20px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
              <img
                src={steps.find(s => s.id === activeStep)?.img}
                alt="Process Step"
                style={{ width: "100%", height: "300px", objectFit: "cover", display: "block" }}
              />
            </div>
            <div>
              <span style={{ fontSize: "13px", fontWeight: "900", color: "#38bdf8" }}>
                ETAPE {activeStep} SUR 4
              </span>
              <h3 style={{ fontSize: "28px", fontWeight: "900", color: isLight ? "#0f172a" : "#ffffff", margin: "10px 0 16px 0" }}>
                {steps.find(s => s.id === activeStep)?.title}
              </h3>
              <p style={{ fontSize: "16px", color: isLight ? "#475569" : "#9ca3af", lineHeight: 1.7 }}>
                {steps.find(s => s.id === activeStep)?.desc}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── JUNIOR ISEP STYLE ALTERNATING SERVICES SHOWCASE ── */}
      <section id="services" style={{ padding: "90px 24px", background: isLight ? "#f1f5f9" : "#030712" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "70px" }}>
          
          {/* Row 1: Notification Par SMS */}
          <div
            onClick={() => scrollToHeroTool("tracking")}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "44px",
              alignItems: "center",
              cursor: "pointer",
              padding: "36px",
              borderRadius: "28px",
              background: isLight ? "#ffffff" : "rgba(30, 41, 59, 0.6)",
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: isLight ? "0 20px 40px rgba(0,0,0,0.06)" : "0 20px 40px rgba(0,0,0,0.3)",
              transition: "transform 0.3s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ borderRadius: "22px", overflow: "hidden", boxShadow: "0 20px 45px rgba(0,0,0,0.15)" }}>
              <img src="/boraq_sms_notif.jpg" alt="Notification SMS Boraq" style={{ width: "100%", height: "280px", objectFit: "cover", display: "block" }} />
            </div>
            <div>
              <div style={{ display: "inline-flex", padding: "6px 16px", borderRadius: "30px", background: "rgba(14,165,233,0.15)", color: "#0284c7", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", marginBottom: "14px" }}>
                {isAr ? "خدمة التنبيهات المباشرة" : "SERVICE NOTIFICATION LIVE"}
              </div>
              <h2 style={{ fontSize: "26px", fontWeight: "900", color: isLight ? "#0f172a" : "#fff", marginBottom: "14px", lineHeight: 1.3 }}>
                NOTIFICATION PAR SMS & PUSH
              </h2>
              <p style={{ fontSize: "15px", color: isLight ? "#475569" : "#9ca3af", lineHeight: 1.7 }}>
                {isAr
                  ? "تتبع مباشر للطرد عبر إشعارات فورية ورسائل حالة الشحنة لحظة بلحظة. إخبار المستلم بتاريخ الوصول ومكان الاستلام بـ كل سهولة وإتقان!"
                  : "INFORMEZ VOTRE DESTINATAIRE DE LA DATE D'ARRIVÉE ET DU LIEU DE RÉCEPTION DE VOTRE COLIS, EN TOUTE SIMPLICITÉ ! Grâce au service Notification SMS & Live Push de Boraq Logistics."}
              </p>
            </div>
          </div>

          {/* Row 2: Service Emballage & Fret */}
          <div
            onClick={() => scrollToHeroTool("tracking")}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "44px",
              alignItems: "center",
              cursor: "pointer",
              padding: "36px",
              borderRadius: "28px",
              background: isLight ? "#ffffff" : "rgba(30, 41, 59, 0.6)",
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: isLight ? "0 20px 40px rgba(0,0,0,0.06)" : "0 20px 40px rgba(0,0,0,0.3)",
              transition: "transform 0.3s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div>
              <div style={{ display: "inline-flex", padding: "6px 16px", borderRadius: "30px", background: "rgba(245,158,11,0.15)", color: "#d97706", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", marginBottom: "14px" }}>
                {isAr ? "التغليف والشحن السريع" : "SERVICE EMBALLAGE & FRET"}
              </div>
              <h2 style={{ fontSize: "26px", fontWeight: "900", color: isLight ? "#0f172a" : "#fff", marginBottom: "14px", lineHeight: 1.3 }}>
                SERVICE EMBALLAGE EXPRESS
              </h2>
              <p style={{ fontSize: "15px", color: isLight ? "#475569" : "#9ca3af", lineHeight: 1.7 }}>
                {isAr
                  ? "حلول تغليف متينة ومجهزة خصيصاً لـ حماية جميع أنواع الطرود والبضائع فـ وكالاتنا. كُـل شحنة محمية بـ كود باركود فريد يضمن وصولها سالمة فـ الوقت المحدد!"
                  : "Avec les nouvelles solutions d'emballages Boraq Logistics, vous disposez d'un large choix de formats d'emballages résistants et adaptés à tous vos envois dans nos agences agréées."}
              </p>
            </div>
            <div style={{ borderRadius: "22px", overflow: "hidden", boxShadow: "0 20px 45px rgba(0,0,0,0.15)" }}>
              <img src="/boraq_packaging.jpg" alt="Service Emballage Boraq" style={{ width: "100%", height: "280px", objectFit: "cover", display: "block" }} />
            </div>
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "40px 20px",
        textAlign: "center",
        background: isLight ? "#0f172a" : "#030712",
        color: isLight ? "#94a3b8" : "#6b7280",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        fontSize: "14px"
      }}>
        © {new Date().getFullYear()} Boraq Logistics & Merchandise. Tous droits réservés.
      </footer>
    </div>
  );
}
