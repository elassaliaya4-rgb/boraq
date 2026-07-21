import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Active Tab state: 'tracking' | 'agencies'
  const [activeTab, setActiveTab] = useState("tracking");

  // Step Timeline tab state: 1 | 2 | 3 | 4 | 5
  const [activeStep, setActiveStep] = useState(1);

  // Mouse Parallax Tilt state for the showcase card
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  
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

  // Smooth mouse move parallax tilt handler
  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    setTilt({ x: x * 18, y: -y * 18 }); // Max 18 degrees rotation
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  // Smooth Scroll to Top / Hero Tool
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

  // 5 Steps (Junior ISEP Exact Replica of Screenshot 2)
  const steps = [
    {
      id: 1,
      title: "PREMIER CONTACT",
      desc: "À l'écoute de votre besoin, un agent en agence vous accompagne dès le premier dépôt de votre colis.",
      badge: "19 Agences à votre écoute",
      img: "/boraq_packaging.jpg"
    },
    {
      id: 2,
      title: "CAHIER DES CHARGES",
      desc: "Chaque colis reçoit un code-barres unique sécurisé avec étude immédiate du tarif d'expédition.",
      badge: "Enregistrement Barcode 100%",
      img: "/boraq_packaging.jpg"
    },
    {
      id: 3,
      title: "SUIVI DE MISSION",
      desc: "Le transport par camion poids lourd connecté est suivi en temps réel par géolocalisation GPS.",
      badge: "75 Camions connectés en direct",
      img: "/boraq_3d_truck.jpg"
    },
    {
      id: 4,
      title: "RECEPTION DESTINATION",
      desc: "Arrivée du colis à la ville de destination avec notification SMS envoyée sur le mobile du récepteur.",
      badge: "Alerte SMS instantanée",
      img: "/boraq_map_tracking.jpg"
    },
    {
      id: 5,
      title: "LIVRAISON & GARANTIE",
      desc: "Remise sécurisée du colis en agence contre signature numérique avec assurance pérennité 100%.",
      badge: "Garantie de réception assurée",
      img: "/boraq_sms_notif.jpg"
    }
  ];

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#160c33", color: "#f3f4f6", fontFamily: "system-ui, -apple-system, sans-serif", overflowX: "hidden" }}>
      
      {/* ── JUNIOR ISEP EXACT NAVBAR ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 40px",
        background: "rgba(22, 12, 51, 0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 1000
      }}>
        {/* Brand Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "900", fontSize: "22px", color: "#fff", cursor: "pointer" }}
        >
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #a855f7, #6366f1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(168,85,247,0.4)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: "22px", fontWeight: "900", color: "#ffffff" }}>
            Boraq <span style={{ color: "#a855f7", fontSize: "12px", letterSpacing: "0.1em" }}>LOGISTICS</span>
          </span>
        </div>

        {/* Desktop Nav Links (Screenshot 3 style) */}
        <nav className="desktop-only-table" style={{ display: "flex", alignItems: "center", gap: "32px", fontSize: "15px", fontWeight: "700" }}>
          <a href="#hero" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ color: "#ffffff", textDecoration: "none", borderBottom: "2px solid #a855f7", paddingBottom: "4px" }}>{isAr ? "الرئيسية" : "Accueil"}</a>
          <a href="#process" style={{ color: "#cbd5e1", textDecoration: "none" }}>{isAr ? "مسار الشحنة" : "Nos Prestations"}</a>
          <a href="#hero-tools" onClick={() => scrollToHeroTool("agencies")} style={{ color: "#cbd5e1", textDecoration: "none" }}>{isAr ? "شبكة الوكالات" : "Notre Structure"}</a>
          <a href="#hero-tools" onClick={() => scrollToHeroTool("tracking")} style={{ color: "#cbd5e1", textDecoration: "none" }}>{isAr ? "تتبع الشحنة" : "Suivi de Colis"}</a>
        </nav>

        {/* Right CTA Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "800"
            }}
          >
            {isAr ? "Français" : "العربية"}
          </button>

          {/* Screenshot 3: Gradient Orange/Pink to Purple rounded button */}
          <button
            onClick={onOpenLogin}
            style={{
              background: "linear-gradient(135deg, #fd9a63 0%, #a855f7 100%)",
              border: "none",
              color: "#ffffff",
              padding: "10px 24px",
              borderRadius: "24px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "800",
              boxShadow: "0 4px 18px rgba(253, 154, 99, 0.4)",
              transition: "transform 0.2s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <span>{isAr ? "فضاء الخدامة" : "Espace Pro"}</span>
          </button>
        </div>
      </header>

      {/* ── JUNIOR ISEP HERO BANNER ── */}
      <section id="hero" style={{
        position: "relative",
        padding: "80px 40px 100px",
        background: "linear-gradient(180deg, #160c33 0%, #21104e 100%)",
        textAlign: "center"
      }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 18px",
            borderRadius: "30px",
            background: "rgba(168, 85, 247, 0.15)",
            border: "1px solid rgba(168, 85, 247, 0.35)",
            color: "#c084fc",
            fontSize: "13px",
            fontWeight: "900",
            letterSpacing: "0.1em",
            marginBottom: "24px"
          }}>
            <span>⚡ BORAQ EXPRESS LOGISTICS 2026</span>
          </div>

          <h1 style={{
            fontSize: "clamp(34px, 5.5vw, 60px)",
            fontWeight: "900",
            lineHeight: 1.15,
            marginBottom: "20px",
            background: "linear-gradient(135deg, #ffffff 0%, #f3e8ff 50%, #c084fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 10px 40px rgba(0,0,0,0.8)"
          }}>
            {isAr ? "شحناتك وبضاعتك بأمان وفخامة إلى جميع المدن" : "Votre colis jusqu'à chez vous."}
          </h1>

          <p style={{ fontSize: "18px", color: "#cbd5e1", maxWidth: "680px", margin: "0 auto 40px auto", lineHeight: 1.6 }}>
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
                  ? "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)"
                  : "rgba(33, 16, 78, 0.85)",
                border: activeTab === "tracking" ? "2px solid #c084fc" : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: activeTab === "tracking" ? "0 14px 40px rgba(168, 85, 247, 0.5)" : "0 4px 20px rgba(0,0,0,0.3)",
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
                  ? "linear-gradient(135deg, #fd9a63 0%, #a855f7 100%)"
                  : "rgba(33, 16, 78, 0.85)",
                border: activeTab === "agencies" ? "2px solid #fd9a63" : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: activeTab === "agencies" ? "0 14px 40px rgba(253, 154, 99, 0.5)" : "0 4px 20px rgba(0,0,0,0.3)",
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
            background: "rgba(22, 12, 51, 0.95)",
            border: "1px solid rgba(168, 85, 247, 0.35)",
            borderRadius: "28px",
            padding: "32px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 35px rgba(168, 85, 247, 0.15)",
            textAlign: isAr ? "right" : "left",
            maxWidth: "760px",
            margin: "32px auto 0 auto"
          }}>
            {/* Tool 1: Suivi de Colis */}
            {activeTab === "tracking" && (
              <div>
                <h3 style={{ margin: "0 0 18px 0", fontSize: "19px", color: "#c084fc", fontWeight: "800", display: "flex", alignItems: "center", gap: 10 }}>
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
                      border: "1px solid rgba(168, 85, 247, 0.3)",
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
                      background: "linear-gradient(135deg, #a855f7, #6366f1)",
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: "15px",
                      cursor: "pointer",
                      boxShadow: "0 4px 20px rgba(168,85,247,0.4)"
                    }}
                  >
                    {trackLoading ? "..." : (isAr ? "تتبع الآن" : "Rechercher")}
                  </button>
                </form>

                {trackError && (
                  <div style={{ marginTop: "18px", padding: "14px 18px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "14px", fontWeight: 600 }}>
                    {trackError}
                  </div>
                )}

                {trackResult && (
                  <div style={{ marginTop: "24px", padding: "22px", borderRadius: "18px", background: "rgba(33, 16, 78, 0.9)", border: "1px solid rgba(168, 85, 247, 0.4)", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <span style={{ fontSize: "18px", fontWeight: "900", color: "#c084fc" }}>{trackResult.tracking_number}</span>
                      <span style={{ fontSize: "13px", fontWeight: "800", padding: "6px 14px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
                        {trackResult.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "14px", color: "#cbd5e1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                  <h3 style={{ margin: 0, fontSize: "19px", color: "#c084fc", fontWeight: "800", display: "flex", alignItems: "center", gap: 10 }}>
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
                        <div key={a.id} style={{ padding: "16px", borderRadius: "16px", background: "rgba(33, 16, 78, 0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <div style={{ fontWeight: "800", fontSize: "16px", color: "#fff" }}>{a.name}</div>
                          <div style={{ fontSize: "13px", color: "#c084fc", marginTop: "4px" }}>{a.city}</div>
                          {a.phone && <div style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "4px" }}>Tél: {a.phone}</div>}
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

      {/* ── JUNIOR ISEP 5-STEP TIMELINE PROCESS SECTION (EXACT REPLICA OF SCREENSHOT 2) ── */}
      <section id="process" style={{
        padding: "100px 40px",
        background: "linear-gradient(180deg, #160c33 0%, #1e114a 100%)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
      }}>
        <div style={{ maxWidth: "1150px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <span style={{ fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.15em", color: "#fd9a63", background: "rgba(253, 154, 99, 0.15)", padding: "6px 18px", borderRadius: "30px" }}>
              UN ACCOMPAGNEMENT SUR MESURE
            </span>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: "900", color: "#ffffff", marginTop: "16px" }}>
              Comment fonctionne le parcours d'expédition ?
            </h2>
            <p style={{ fontSize: "16px", color: "#94a3b8", maxWidth: "620px", margin: "12px auto 0 auto" }}>
              Profitez de la fiabilité du réseau Boraq Logistics à chaque étape de votre expédition.
            </p>
          </div>

          {/* TWO-COLUMN LAYOUT (SCREENSHOT 2) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "50px",
            alignItems: "center"
          }}>
            
            {/* LEFT COLUMN: Numbered Vertical Timeline Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
              {/* Connecting vertical line */}
              <div style={{
                position: "absolute",
                top: "30px",
                bottom: "30px",
                left: isAr ? "auto" : "20px",
                right: isAr ? "20px" : "auto",
                width: "2px",
                background: "linear-gradient(180deg, #fd9a63, #a855f7)",
                zIndex: 1
              }} />

              {steps.map((s, idx) => {
                const isActive = activeStep === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveStep(s.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "20px",
                      cursor: "pointer",
                      padding: "16px",
                      borderRadius: "18px",
                      background: isActive ? "rgba(33, 16, 78, 0.85)" : "transparent",
                      border: isActive ? "1px solid rgba(253, 154, 99, 0.4)" : "1px solid transparent",
                      boxShadow: isActive ? "0 10px 30px rgba(253, 154, 99, 0.15)" : "none",
                      transition: "all 0.3s ease",
                      zIndex: 2
                    }}
                  >
                    {/* Number Circle */}
                    <div style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: isActive ? "linear-gradient(135deg, #fd9a63, #a855f7)" : "rgba(255,255,255,0.1)",
                      border: isActive ? "none" : "1px solid rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: "900",
                      flexShrink: 0,
                      boxShadow: isActive ? "0 0 15px rgba(253, 154, 99, 0.5)" : "none"
                    }}>
                      {s.id}
                    </div>

                    {/* Step Title & Subtitle */}
                    <div>
                      <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "900", color: isActive ? "#ffffff" : "#cbd5e1" }}>
                        {s.title}
                      </h4>
                      <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: isActive ? "#cbd5e1" : "#94a3b8", lineHeight: 1.4 }}>
                        {s.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RIGHT COLUMN: LARGE TILT INTERACTIVE CONTAINER CARD (SCREENSHOT 2) */}
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                background: "rgba(22, 12, 51, 0.95)",
                border: "1px solid rgba(253, 154, 99, 0.3)",
                borderRadius: "28px",
                padding: "36px",
                boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 35px rgba(253,154,99,0.15)",
                transition: "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)",
                transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                willChange: "transform"
              }}
            >
              {/* Image Frame */}
              <div style={{ borderRadius: "20px", overflow: "hidden", marginBottom: "28px", boxShadow: "0 15px 35px rgba(0,0,0,0.4)" }}>
                <img
                  src={steps[activeStep - 1].img}
                  alt="Boraq Showcase"
                  style={{ width: "100%", height: "260px", objectFit: "cover", display: "block" }}
                />
              </div>

              {/* Title & Stats */}
              <h3 style={{ fontSize: "28px", fontWeight: "900", color: "#ffffff", marginBottom: "16px", lineHeight: 1.2 }}>
                {steps[activeStep - 1].badge}
              </h3>

              {/* Gradient CTA Contact Button */}
              <button
                onClick={() => scrollToHeroTool("tracking")}
                style={{
                  background: "linear-gradient(135deg, #fd9a63 0%, #a855f7 100%)",
                  border: "none",
                  color: "#ffffff",
                  padding: "14px 28px",
                  borderRadius: "18px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "800",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: "0 6px 20px rgba(253, 154, 99, 0.4)",
                  width: "100%",
                  maxWidth: "240px",
                  marginTop: "16px"
                }}
              >
                <span>{isAr ? "احجز رحلتك / تتبع 📞" : "Prendre RDV 📞"}</span>
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "40px 20px",
        textAlign: "center",
        background: "#160c33",
        color: "#94a3b8",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        fontSize: "14px"
      }}>
        © {new Date().getFullYear()} Boraq Logistics & Merchandise. Tous droits réservés.
      </footer>
    </div>
  );
}
