import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Active Tab state for Hero tools: 'tracking' | 'agencies' | 'simulator'
  const [activeTab, setActiveTab] = useState("tracking");

  // Outlined Navbar active nav underline state
  const [activeNav, setActiveNav] = useState("accueil");

  // Mouse Parallax Follow & Lerp state for floating portfolio hover preview
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Smooth mouse interpolation (lerp) for cursor follow effect
  useEffect(() => {
    let animationFrameId;
    const lerp = () => {
      setMousePos(prev => {
        const dx = targetPos.x - prev.x;
        const dy = targetPos.y - prev.y;
        return {
          x: prev.x + dx * 0.12,
          y: prev.y + dy * 0.12
        };
      });
      animationFrameId = requestAnimationFrame(lerp);
    };
    animationFrameId = requestAnimationFrame(lerp);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetPos]);

  const handleMouseMove = (e) => {
    setTargetPos({ x: e.clientX, y: e.clientY });
  };

  // Tracking tool state
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  // Agencies tool state
  const [agencies, setAgencies] = useState([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState("all");

  // Tariff simulator state
  const [weight, setWeight] = useState(1);
  const [serviceType, setServiceType] = useState("express");
  const [estimatedPrice, setEstimatedPrice] = useState(null);

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

  // Handle price simulation
  function handleSimulate(e) {
    if (e) e.preventDefault();
    const baseRate = serviceType === "express" ? 35 : 20;
    const perKg = serviceType === "express" ? 5 : 3;
    const total = baseRate + weight * perKg;
    setEstimatedPrice(total);
  }

  const cities = Array.from(new Set(agencies.map(a => a.city).filter(Boolean)));

  // 4 Prestations (With generated 3D image links)
  const prestations = [
    {
      id: "01",
      tag: isAr ? "التغليف والترميز" : "CODE-BARRES & EMBALLAGE",
      title: isAr ? "حلول تغليف وحماية متكاملة لجميع الشحنات" : "Emballage Express & Sécurisé",
      desc: isAr ? "كل طرد يتم تغليفه بـ مواد عالية الجودة وتعيين رمز باركود فريد يضمن الحماية وتسهيل التتبع والفرز." : "Des solutions d'emballages ultra-résistantes adaptées à tous vos formats de colis, associées à un code-barres unique.",
      img: "/boraq_packaging.jpg"
    },
    {
      id: "02",
      tag: isAr ? "التتبع الجغرافي" : "GÉOLOCALISATION GPS",
      title: isAr ? "تتبع فوري ومباشر لموقع الشاحنة على الخريطة" : "Suivi en Temps Réel sur Carte",
      desc: isAr ? "راقب خط سير شحنتك لحظة بلحظة بفضل أجهزة التتبع GPS المثبتة فـ شاحناتنا الكبيرة المتصلة بالشبكة." : "Suivez le trajet exact de vos marchandises grâce aux balises GPS embarquées dans nos camions poids lourds.",
      img: "/boraq_map_tracking.jpg"
    },
    {
      id: "03",
      tag: isAr ? "التنبيهات الفورية" : "NOTIFICATIONS LIVE",
      title: isAr ? "إشعارات رسائل SMS وPush مباشرة لـ الهواتف" : "Alertes SMS & Push Mobiles",
      desc: isAr ? "إعلام فوري للمستلم فور وصول الطرد لوكالة المقصد لتسهيل وتسريع عملية الاستلام والتسليم بـ أمان." : "Notification instantanée par SMS envoyée au destinataire pour l'informer de l'arrivée de son colis à destination.",
      img: "/boraq_sms_notif.jpg"
    },
    {
      id: "04",
      tag: isAr ? "فضاء الخدامة والـ Back-Office" : "ESPACE PRO & CHAUFFEURS",
      title: isAr ? "منصة إدارية متكاملة لـ السائقين والأطقم" : "Back-Office & Application Staff",
      desc: isAr ? "فضاء خاص بـ السائقين والوكلاء لمسح الكود باركود، تحديث الحالات، وإدارة مسارات التسليم بكل سلاسة." : "Portail sécurisé pour nos chauffeurs et agents pour flasher les colis, valider les livraisons et optimiser les trajets.",
      img: "/boraq_3d_truck.jpg"
    }
  ];

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#0a0f1d", color: "#f3f4f6", fontFamily: "system-ui, -apple-system, sans-serif", overflowX: "hidden" }}>
      
      {/* ── SANDHILL OUTLINED NAVBAR HEADER ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 40px",
        background: "rgba(10, 15, 29, 0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 1000
      }}>
        {/* Outlined Logo Container (Sandhill replica) */}
        <div
          onClick={() => { setActiveNav("accueil"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1.5px solid rgba(255, 255, 255, 0.45)",
            background: "rgba(255, 255, 255, 0.05)",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#ffffff"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.45)"}
        >
          <div style={{
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            background: "linear-gradient(135deg, #a855f7, #6366f1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: "17px", fontWeight: "900", color: "#ffffff", letterSpacing: "0.08em" }}>
            BORAQ LOGISTICS
          </span>
        </div>

        {/* Clean Spaced Navigation Menu Links with Active White Underline */}
        <nav style={{ display: "flex", alignItems: "center", gap: "36px", fontSize: "14px", fontWeight: "700" }}>
          <a
            href="#hero"
            onClick={(e) => { e.preventDefault(); setActiveNav("accueil"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{
              color: "#ffffff",
              textDecoration: "none",
              paddingBottom: "4px",
              borderBottom: activeNav === "accueil" ? "2px solid #ffffff" : "2px solid transparent",
              transition: "border-color 0.25s ease"
            }}
          >
            {isAr ? "الرئيسية" : "Accueil"}
          </a>

          <a
            href="#prestations-section"
            onClick={(e) => { e.preventDefault(); setActiveNav("prestations"); document.getElementById("prestations-section")?.scrollIntoView({ behavior: "smooth" }); }}
            style={{
              color: "#ffffff",
              textDecoration: "none",
              paddingBottom: "4px",
              borderBottom: activeNav === "prestations" ? "2px solid #ffffff" : "2px solid transparent",
              transition: "border-color 0.25s ease"
            }}
          >
            {isAr ? "خدماتنا" : "Nos Prestations"}
          </a>

          <a
            href="#hero-tools"
            onClick={(e) => { e.preventDefault(); setActiveNav("suivi"); document.getElementById("hero-tools")?.scrollIntoView({ behavior: "smooth" }); }}
            style={{
              color: "#ffffff",
              textDecoration: "none",
              paddingBottom: "4px",
              borderBottom: activeNav === "suivi" ? "2px solid #ffffff" : "2px solid transparent",
              transition: "border-color 0.25s ease"
            }}
          >
            {isAr ? "تتبع الشحنة" : "Suivi de Colis"}
          </a>
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

      {/* ── PREMIUM HERO BANNER SECTION ── */}
      <section id="hero" style={{
        position: "relative",
        padding: "90px 20px 120px",
        background: "radial-gradient(circle at top, #1e1b4b 0%, #0a0f1d 70%)",
        textAlign: "center",
        overflow: "hidden"
      }}>
        {/* Glow element */}
        <div style={{
          position: "absolute",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "200px",
          background: "rgba(168, 85, 247, 0.15)",
          filter: "blur(120px)",
          borderRadius: "50%",
          pointerEvents: "none"
        }} />

        <div style={{ maxWidth: "900px", margin: "0 auto", position: "relative", zIndex: 2 }}>
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

          {/* ── 3 Tab Option Panels Selector ── */}
          <div id="hero-tools" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            maxWidth: "840px",
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
                  : "rgba(30, 41, 59, 0.45)",
                border: activeTab === "tracking" ? "2.5px solid #c084fc" : "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: activeTab === "tracking" ? "0 14px 40px rgba(168, 85, 247, 0.4)" : "none",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                textAlign: "center"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto"
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#fff" }}>
                {isAr ? "تتبع فوري لـ الشحنة" : "Suivi de colis"}
              </h3>
            </div>

            {/* Card 2: Nos Agences */}
            <div
              onClick={() => setActiveTab("agencies")}
              style={{
                padding: "24px 20px",
                borderRadius: "22px",
                background: activeTab === "agencies"
                  ? "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)"
                  : "rgba(30, 41, 59, 0.45)",
                border: activeTab === "agencies" ? "2.5px solid #c084fc" : "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: activeTab === "agencies" ? "0 14px 40px rgba(168, 85, 247, 0.4)" : "none",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                textAlign: "center"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto"
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#fff" }}>
                {isAr ? "شبكة الوكالات المعتمدة" : "Nos agences"}
              </h3>
            </div>

            {/* Card 3: Simulation Tarifaire */}
            <div
              onClick={() => setActiveTab("simulator")}
              style={{
                padding: "24px 20px",
                borderRadius: "22px",
                background: activeTab === "simulator"
                  ? "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)"
                  : "rgba(30, 41, 59, 0.45)",
                border: activeTab === "simulator" ? "2.5px solid #c084fc" : "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: activeTab === "simulator" ? "0 14px 40px rgba(168, 85, 247, 0.4)" : "none",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                textAlign: "center"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto"
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#fff" }}>
                {isAr ? "حاسبة الشحن والتسعيرة" : "Simulation tarifaire"}
              </h3>
            </div>
          </div>

          {/* ── Active Tool Panel Container ── */}
          <div style={{
            marginTop: "32px",
            background: "rgba(10, 15, 29, 0.95)",
            border: "1.5px solid rgba(168, 85, 247, 0.35)",
            borderRadius: "24px",
            padding: "32px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            textAlign: isAr ? "right" : "left",
            maxWidth: "840px",
            margin: "32px auto 0 auto"
          }}>
            {/* Tool 1: Suivi de Colis */}
            {activeTab === "tracking" && (
              <div>
                <h3 style={{ margin: "0 0 18px 0", fontSize: "19px", color: "#c084fc", fontWeight: "800" }}>
                  {isAr ? "تتبع فوري لـ الشحنة برقم التتبع" : "Recherche Rapide de Colis"}
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
                  <div style={{ marginTop: "24px", padding: "22px", borderRadius: "18px", background: "rgba(20, 24, 45, 0.9)", border: "1px solid rgba(168, 85, 247, 0.4)" }}>
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
                  <h3 style={{ margin: 0, fontSize: "19px", color: "#c084fc", fontWeight: "800" }}>
                    {isAr ? "شبكة وكالات البراق عبر المدن" : "Réseau des Agences Boraq"}
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
                        <div key={a.id} style={{ padding: "16px", borderRadius: "16px", background: "rgba(20, 24, 45, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
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

            {/* Tool 3: Simulation Tarifaire */}
            {activeTab === "simulator" && (
              <div>
                <h3 style={{ margin: "0 0 18px 0", fontSize: "19px", color: "#c084fc", fontWeight: "800" }}>
                  {isAr ? "حساب تسعيرة الشحن التقريبية" : "Calculateur Tarifaire Boraq"}
                </h3>
                <form onSubmit={handleSimulate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", alignItems: "flex-end" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "800", color: "#94a3b8", marginBottom: "8px" }}>
                      {isAr ? "وزن الطرد (كلغ):" : "Poids du colis (kg):"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={weight}
                      onChange={e => setWeight(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "#fff",
                        fontSize: "15px",
                        fontWeight: "700"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "800", color: "#94a3b8", marginBottom: "8px" }}>
                      {isAr ? "نوع الخدمة:" : "Type de service:"}
                    </label>
                    <select
                      value={serviceType}
                      onChange={e => setServiceType(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        background: "rgba(25, 30, 55, 0.9)",
                        color: "#fff",
                        fontSize: "15px",
                        fontWeight: "700"
                      }}
                    >
                      <option value="express">{isAr ? "شحن سريع (خلال 24 ساعة)" : "Expédition Express (24H)"}</option>
                      <option value="standard">{isAr ? "شحن عادي (خلال 48 ساعة)" : "Expédition Standard (48H)"}</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: "14px 28px",
                      borderRadius: "12px",
                      border: "none",
                      background: "linear-gradient(135deg, #a855f7, #6366f1)",
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: "15px",
                      cursor: "pointer",
                      boxShadow: "0 4px 20px rgba(168,85,247,0.4)"
                    }}
                  >
                    {isAr ? "احسب السعر" : "Simuler Tarif"}
                  </button>
                </form>

                {estimatedPrice !== null && (
                  <div style={{ marginTop: "24px", padding: "18px", borderRadius: "14px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "700", color: "#cbd5e1" }}>{isAr ? "التسعيرة المقدرة للمغرب:" : "Tarif d'envoi estimé au Maroc:"}</span>
                    <span style={{ fontSize: "22px", fontWeight: "900", color: "#10b981" }}>{estimatedPrice} MAD</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SANDHILL PORTFOLIO HOVER FOLLOW PRESTATIONS SECTION ── */}
      <section
        id="prestations-section"
        onMouseMove={handleMouseMove}
        style={{
          padding: "100px 40px",
          background: "#0c0a1e",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          position: "relative"
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          
          <div style={{ marginBottom: "60px" }}>
            <span style={{ fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.15em", color: "#fd9a63", background: "rgba(253, 154, 99, 0.15)", padding: "6px 18px", borderRadius: "30px" }}>
              {isAr ? "خدماتنا اللوجستية الاحترافية" : "NOTRE PORTFOLIO LOGISTIQUE"}
            </span>
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: "900", color: "#ffffff", marginTop: "16px" }}>
              {isAr ? "خدمات وحلول البراق المتطورة لـ النقل" : "Explorez nos prestations sur-mesure"}
            </h2>
          </div>

          {/* Minimalist Index List */}
          <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            {prestations.map((p, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={p.id}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "36px 0",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    position: "relative"
                  }}
                >
                  {/* Left elements */}
                  <div style={{ display: "flex", alignItems: "center", gap: "28px", zIndex: 1 }}>
                    <span style={{ fontSize: "16px", fontWeight: "800", color: isHovered ? "#fd9a63" : "rgba(255, 255, 255, 0.3)" }}>
                      {p.id}
                    </span>
                    <h3 style={{
                      margin: 0,
                      fontSize: "clamp(20px, 3vw, 36px)",
                      fontWeight: "900",
                      color: isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
                      transform: isHovered ? `translateX(${isAr ? "-15px" : "15px"})` : "translateX(0)",
                      transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}>
                      {p.title}
                    </h3>
                  </div>

                  {/* Right tag (Desktop only) */}
                  <div style={{ zIndex: 1 }} className="desktop-only-table">
                    <span style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      letterSpacing: "0.1em",
                      color: isHovered ? "#a855f7" : "rgba(255, 255, 255, 0.4)",
                      border: isHovered ? "1px solid #a855f7" : "1px solid rgba(255, 255, 255, 0.15)",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      transition: "all 0.3s ease"
                    }}>
                      {p.tag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ── FLOATING PREVIEW IMAGE FOLLOW CURSOR (SANDHILL EXCLUSIVE) ── */}
        {hoveredIdx !== null && (
          <div
            style={{
              position: "fixed",
              left: mousePos.x + 25,
              top: mousePos.y + 25,
              width: "320px",
              height: "200px",
              pointerEvents: "none",
              zIndex: 9999,
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 30px 60px rgba(0,0,0,0.6), 0 0 25px rgba(168, 85, 247, 0.25)",
              border: "1.5px solid rgba(255, 255, 255, 0.25)",
              transform: "translate(-50%, -50%)",
              willChange: "left, top",
              animation: "fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            <img
              src={prestations[hoveredIdx].img}
              alt="Boraq Hover Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "40px 20px",
        textAlign: "center",
        background: "#0a0f1d",
        color: "#64748b",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        fontSize: "14px"
      }}>
        © {new Date().getFullYear()} Boraq Logistics & Merchandise. Tous droits réservés.
      </footer>

      {/* Mini fade scale animation style */}
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
