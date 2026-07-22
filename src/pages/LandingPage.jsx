import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Tab State inside tool modal: 'tracking' | 'agencies' | 'simulator'
  const [activeTab, setActiveTab] = useState("tracking");
  const [showToolModal, setShowToolModal] = useState(false);

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

  // Scroll Position for Parallax and Slide highlights
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
        setTrackError(isAr ? "لم نجد أي شحنة بهذا الرقم" : "Aucun envoi trouvé");
      } else {
        setTrackResult(data);
      }
    } catch (err) {
      setTrackError(isAr ? "خطأ في البحث" : "Erreur de recherche");
    } finally {
      setTrackLoading(false);
    }
  }

  // Handle tariff simulation
  function handleSimulate(e) {
    if (e) e.preventDefault();
    const baseRate = serviceType === "express" ? 45 : 30;
    const total = baseRate + weight * 7;
    setEstimatedPrice(total);
  }

  const cities = Array.from(new Set(agencies.map(a => a.city).filter(Boolean)));

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: "#090e1a", // Deep slate-blue/black matching mockup background
      color: "#e2e8f0",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      margin: 0,
      padding: "20px 40px",
      boxSizing: "border-box",
      overflowX: "hidden"
    }}>
      
      {/* ── CONSISTENT TOP NAVBAR ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxSizing: "border-box",
        marginBottom: "30px",
        position: "sticky",
        top: 0,
        background: "#090e1ab8",
        backdropFilter: "blur(12px)",
        zIndex: 100
      }}>
        {/* Brand Logo with Animated Lightning Bolt */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <svg className="logo-lightning-bolt" width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <div>
            <div className="logo-text-shift" style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "-0.04em", lineHeight: "1" }}>Boraq</div>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", marginTop: "2px" }}>
              {isAr ? "شحن دولي لوجستي" : "Transport & Logistics"}
            </div>
          </div>
        </div>

        {/* Central Nav Links (Switches Active Presentation Page via anchors) */}
        <nav className="desktop-nav" style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          fontSize: "13px",
          fontWeight: "700"
        }}>
          <a href="#home-slide" style={{ color: "#94a3b8", textDecoration: "none", fontWeight: "800" }}>{isAr ? "الرئيسية" : "Accueil"}</a>
          <a href="#about-slide" style={{ color: "#94a3b8", textDecoration: "none", fontWeight: "800" }}>{isAr ? "من نحن" : "À Propos"}</a>
          <a href="#services-slide" style={{ color: "#94a3b8", textDecoration: "none", fontWeight: "800" }}>{isAr ? "خدماتنا" : "Prestations"}</a>
          <a href="#fret-slide" style={{ color: "#94a3b8", textDecoration: "none", fontWeight: "800" }}>{isAr ? "أنواع الشحن" : "Fret"}</a>
          <a href="#contacts-slide" style={{ color: "#94a3b8", textDecoration: "none", fontWeight: "800" }}>{isAr ? "اتصل بنا" : "Contacts"}</a>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontWeight: "800", fontSize: "13px" }}
          >
            {isAr ? "Français" : "العربية"}
          </button>
        </nav>

        {/* Right CTA Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "#94a3b8" }} className="desktop-only-table">
            📞 +212 522 000 000
          </span>
          <button
            onClick={onOpenLogin}
            style={{
              background: "#3b82f6",
              border: "none",
              color: "#ffffff",
              padding: "8px 20px",
              borderRadius: "20px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(59,130,246,0.3)"
            }}
          >
            {isAr ? "فضاء الخدامة" : "Espace Pro"}
          </button>
        </div>
      </header>

      {/* ── COHESIVE VERTICAL PRESENTATION FLOW ── */}
      <main style={{
        display: "flex",
        flexDirection: "column",
        gap: "60px",
        width: "100%",
        maxWidth: "1000px",
        margin: "0 auto",
        boxSizing: "border-box"
      }}>
        
        {/* SLIDE 1: HOME PAGE / COVER (Mockup image 1 design) */}
        <section id="home-slide" style={{
          height: "460px",
          borderRadius: "24px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          transform: `perspective(1000px) rotateX(${Math.max(-5, 5 - scrollY * 0.02)}deg)`,
          transition: "transform 0.1s ease-out"
        }} className="tilt-card-3d">
          <img src="/boraq_truck.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }} />
          
          {/* Header info overlays */}
          <div style={{ position: "absolute", top: "24px", left: "24px", right: "24px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
            <span>Ain Sebaa, Casablanca, Maroc</span>
            <span>+212 522 000 000</span>
          </div>

          <div style={{
            position: "absolute",
            bottom: "40px",
            left: "40px",
            right: "40px",
            textAlign: isAr ? "right" : "left"
          }}>
            {/* Slide Logo Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span style={{ fontSize: "24px", fontWeight: "900", color: "#ffffff", letterSpacing: "-0.03em" }}>Boraq</span>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Transport & Logistics</span>
            </div>
            
            <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: "900", color: "#ffffff", margin: "0 0 20px 0", lineHeight: 1.15 }}>
              {isAr ? "حمولتكم، مسؤوليتنا" : "Votre cargaison, notre responsabilité"}
            </h1>

            {/* Direct access to Suivi/Simulateur popup */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
                style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "30px", fontWeight: "800", cursor: "pointer" }}
              >
                {isAr ? "تتبع الشحنة ➔" : "Suivre mon envoi ➔"}
              </button>
              <button
                onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", padding: "12px 28px", borderRadius: "30px", fontWeight: "800", cursor: "pointer" }}
              >
                {isAr ? "احسب التسعيرة" : "Simuler tarif"}
              </button>
            </div>
          </div>
        </section>

        {/* SLIDE 2: ABOUT US (Mockup image 2 design) */}
        <section id="about-slide" style={{
          height: "460px",
          borderRadius: "24px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "40px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: isAr ? "right" : "left",
          transform: `perspective(1000px) rotateX(${Math.max(-5, 5 - Math.abs(scrollY - 500) * 0.01)}deg)`,
          transition: "transform 0.1s ease-out"
        }} className="tilt-card-3d">
          <img src="/boraq_ship.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, position: "absolute", top: 0, left: 0, zIndex: 1 }} />
          
          <div style={{ zIndex: 2, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#3b82f6", fontWeight: "800", textTransform: "uppercase", marginBottom: "12px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
              {isAr ? "من نحن" : "À PROPOS DE NOUS"}
            </div>

            <h2 style={{ fontSize: "clamp(22px, 4vw, 36px)", fontWeight: "900", color: "#ffffff", margin: "0 0 20px 0", lineHeight: 1.2 }}>
              {isAr ? "الربط اللوجستي الدولي الموثوق" : "Garant de confiance & précision internationale"}
            </h2>

            <p style={{ fontSize: "15px", color: "#cbd5e1", lineHeight: 1.7, margin: 0, maxWidth: "600px" }}>
              {isAr
                ? "لأكثر من 10 سنوات، تعمل البراق كشريك معتمد لوجستياً بين المغرب وأوروبا لنقل شحنات البضائع والحلول التجارية المتكاملة والآمنة، نضمن الفحص الدقيق والالتزام بالمواعيد."
                : "Depuis plus de 10 ans, Boraq Logistics est le partenaire stratégique agréé pour le transport routier international de marchandises et de fret industriel entre le Maroc et l'Europe."}
            </p>
          </div>

          <div style={{ zIndex: 2, position: "relative", fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
            BORAQ LOGISTICS INTERNATIONAL S.A.
          </div>
        </section>

        {/* SLIDE 3: PRESTATIONS & SERVICES */}
        <section id="services-slide" style={{
          height: "460px",
          borderRadius: "24px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "40px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: isAr ? "right" : "left",
          transform: `perspective(1000px) rotateX(${Math.max(-5, 5 - Math.abs(scrollY - 1000) * 0.01)}deg)`,
          transition: "transform 0.1s ease-out"
        }} className="tilt-card-3d">
          <img src="/boraq_plane.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, position: "absolute", top: 0, left: 0, zIndex: 1 }} />
          
          <div style={{ zIndex: 2, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#3b82f6", fontWeight: "800", textTransform: "uppercase", marginBottom: "12px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
              {isAr ? "خدماتنا" : "DESTINATIONS & SOLUTIONS"}
            </div>

            <h2 style={{ fontSize: "28px", fontWeight: "900", color: "#ffffff", margin: "0 0 24px 0" }}>
              {isAr ? "حلول النقل والخدمات اللوجستية" : "Solutions logistiques intégrées"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "13px" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>Transport FTL / LTL</div>
                <span style={{ color: "#94a3b8", fontSize: "11px" }}>{isAr ? "حمولة كاملة أو شحن جزئي للمستودعات" : "Transit routier en camions complets ou groupage"}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>Livraison Express</div>
                <span style={{ color: "#94a3b8", fontSize: "11px" }}>{isAr ? "شحن سريع مستعجل تحت الرقابة" : "Livraisons rapides et urgentes sous douane"}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>Transport Multimodal</div>
                <span style={{ color: "#94a3b8", fontSize: "11px" }}>{isAr ? "نقل بري، بحري وجوي متكامل" : "Réseau combiné routier, maritime et aérien"}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>Logistique & Dépôt</div>
                <span style={{ color: "#94a3b8", fontSize: "11px" }}>{isAr ? "تخزين وتوزيع وتخليص جمركي" : "Entreposage moderne et gestion de stock"}</span>
              </div>
            </div>
          </div>

          <div style={{ zIndex: 2, position: "relative", fontSize: "11px", color: "#64748b" }}>
            LIAISON DIRECTE MAROC ➔ EUROPE
          </div>
        </section>

        {/* SLIDE 4: CARGO TYPES (Fret) */}
        <section id="fret-slide" style={{
          height: "460px",
          borderRadius: "24px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "40px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: isAr ? "right" : "left",
          transform: `perspective(1000px) rotateX(${Math.max(-5, 5 - Math.abs(scrollY - 1500) * 0.01)}deg)`,
          transition: "transform 0.1s ease-out"
        }} className="tilt-card-3d">
          <img src="/boraq_ship.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, position: "absolute", top: 0, left: 0, zIndex: 1 }} />
          
          <div style={{ zIndex: 2, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#3b82f6", fontWeight: "800", textTransform: "uppercase", marginBottom: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
              {isAr ? "تصنيف الحمولات" : "TYPES DE FRET ACCEPTE"}
            </div>

            <h2 style={{ fontSize: "28px", fontWeight: "900", color: "#ffffff", margin: "0 0 6px 0" }}>
              {isAr ? "ننقل 99% من أنواع البضائع الصناعية" : "Nous transportons 99% des marchandises"}
            </h2>
            <p style={{ fontSize: "12px", color: "#cbd5e1", margin: "0 0 20px 0" }}>
              {isAr ? "مطابقة تامة لمعايير السلامة والتخليص الجمركي الدولي" : "Conformité totale avec les réglementations de transport international routier"}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {[
                { name: "Liquide", ar: "سائل" },
                { name: "Dangereux", ar: "خطير" },
                { name: "Inflammable", ar: "قابل للاشتعال" },
                { name: "Fragile", ar: "قابل للكسر" },
                { name: "Lourd", ar: "ثقيل" },
                { name: "Vrac", ar: "صب" }
              ].map(c => (
                <div key={c.name} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "16px 10px",
                  borderRadius: "10px",
                  textAlign: "center",
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "#ffffff"
                }}>
                  {isAr ? c.ar : c.name}
                </div>
              ))}
            </div>
          </div>

          <div style={{ zIndex: 2, position: "relative", fontSize: "11px", color: "#64748b" }}>
            ADAPTATION ET COMPLIANCE AUX NORMES T.I.R.
          </div>
        </section>

        {/* SLIDE 5: CONTACTS */}
        <section id="contacts-slide" style={{
          height: "460px",
          borderRadius: "24px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "40px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: isAr ? "right" : "left",
          transform: `perspective(1000px) rotateX(${Math.max(-5, 5 - Math.abs(scrollY - 2000) * 0.01)}deg)`,
          transition: "transform 0.1s ease-out"
        }} className="tilt-card-3d">
          <img src="/boraq_truck.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, position: "absolute", top: 0, left: 0, zIndex: 1 }} />
          
          <div style={{ zIndex: 2, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#3b82f6", fontWeight: "800", textTransform: "uppercase", marginBottom: "12px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
              {isAr ? "قنوات الاتصال" : "CONTACTS & DEPOTS"}
            </div>

            <h2 style={{ fontSize: "28px", fontWeight: "900", color: "#ffffff", margin: "0 0 20px 0" }}>
              {isAr ? "اتصل بقسم اللوجستيك الدولي" : "Faites décoller vos expéditions"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }} className="responsive-grid-landing">
              {/* Details list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", color: "#cbd5e1" }}>
                <div><b>📍 {isAr ? "المقر الرئيسي للمغرب:" : "Siège Maroc:"}</b> Zone Industrielle Ain Sebaa, Casablanca</div>
                <div><b>📞 {isAr ? "الهاتف المباشر:" : "Tél Opérationnel:"}</b> +212 522 000 000</div>
                <div><b>✉️ {isAr ? "البريد الإلكتروني:" : "Email Pro:"}</b> contact@boraq.online</div>
                <div><b>🌐 {isAr ? "الوكالات التابعة بأوروبا:" : "Dépôts Partenaires:"}</b> Espagne, France, Italie</div>
              </div>

              {/* Direct Action Button */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <button
                  onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
                  style={{
                    background: "#3b82f6",
                    color: "#ffffff",
                    border: "none",
                    padding: "16px 30px",
                    borderRadius: "30px",
                    fontWeight: "800",
                    fontSize: "14px",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(59,130,246,0.4)"
                  }}
                >
                  {isAr ? "تتبع شحنتك الآن ➔" : "Suivre mon cargo ➔"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ zIndex: 2, position: "relative", fontSize: "11px", color: "#64748b" }}>
            ASSISTANCE COMMERCIALE DISPONIBLE 24/7
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "40px 0 10px 0",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        fontSize: "12px",
        color: "#6b7280",
        marginTop: "40px"
      }}>
        © {new Date().getFullYear()} BORAQ. All rights reserved. International Transport Brokerage.
      </footer>

      {/* ── POPUP TOOL MODAL OVERLAY (For Clean interactive tracking/agencies/simulator panels) ── */}
      {showToolModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(3,7,18,0.6)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0c0a1e",
            borderRadius: "24px",
            width: "100%",
            maxWidth: "600px",
            padding: "30px",
            boxShadow: "0 25px 70px rgba(0,0,0,0.7)",
            border: "1.5px solid rgba(255,255,255,0.12)",
            position: "relative",
            textAlign: isAr ? "right" : "left",
            color: "#ffffff"
          }}>
            {/* Modal Header Tabs */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "14px" }}>
              <button
                onClick={() => setActiveTab("tracking")}
                style={{
                  background: "transparent",
                  border: "none",
                  paddingBottom: "8px",
                  fontSize: "15px",
                  fontWeight: "800",
                  color: activeTab === "tracking" ? "#ffffff" : "#94a3b8",
                  borderBottom: activeTab === "tracking" ? "2.5px solid #3b82f6" : "none",
                  cursor: "pointer"
                }}
              >
                {isAr ? "تتبع الشحنة" : "Suivi Cargo"}
              </button>
              <button
                onClick={() => setActiveTab("agencies")}
                style={{
                  background: "transparent",
                  border: "none",
                  paddingBottom: "8px",
                  fontSize: "15px",
                  fontWeight: "800",
                  color: activeTab === "agencies" ? "#ffffff" : "#94a3b8",
                  borderBottom: activeTab === "agencies" ? "2.5px solid #3b82f6" : "none",
                  cursor: "pointer"
                }}
              >
                {isAr ? "الوكالات المعتمدة" : "Nos agences"}
              </button>
              <button
                onClick={() => setActiveTab("simulator")}
                style={{
                  background: "transparent",
                  border: "none",
                  paddingBottom: "8px",
                  fontSize: "15px",
                  fontWeight: "800",
                  color: activeTab === "simulator" ? "#ffffff" : "#94a3b8",
                  borderBottom: activeTab === "simulator" ? "2.5px solid #3b82f6" : "none",
                  cursor: "pointer"
                }}
              >
                {isAr ? "حاسبة الشحن" : "Simulation"}
              </button>

              {/* Close Modal button */}
              <button
                onClick={() => setShowToolModal(false)}
                style={{
                  marginLeft: isAr ? "none" : "auto",
                  marginRight: isAr ? "auto" : "none",
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* TAB CONTENT 1: Tracking */}
            {activeTab === "tracking" && (
              <div>
                <form onSubmit={handleTrack} style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    value={trackCode}
                    onChange={e => setTrackCode(e.target.value)}
                    placeholder={isAr ? "أدخل رقم التتبع (مثال: BRQ-091)" : "N° de suivi (ex: BRQ-091)"}
                    style={{
                      flex: 1,
                      padding: "14px 18px",
                      borderRadius: "12px",
                      border: "1.5px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.05)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "700",
                      outline: "none"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={trackLoading}
                    style={{
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      padding: "14px 24px",
                      borderRadius: "12px",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    {trackLoading ? "..." : (isAr ? "تتبع" : "Rechercher")}
                  </button>
                </form>

                {trackError && <div style={{ color: "#f87171", fontSize: "14px", fontWeight: "700", marginTop: "14px" }}>{trackError}</div>}

                {trackResult && (
                  <div style={{ marginTop: "20px", padding: "18px", borderRadius: "14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontWeight: "900", color: "#3b82f6" }}>{trackResult.tracking_number}</span>
                      <span style={{ color: "#10b981", fontWeight: "800" }}>{trackResult.status}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                      <div><b>{isAr ? "المستلم:" : "Destinataire:"}</b> {trackResult.receiver_name}</div>
                      <div><b>{isAr ? "المدينة:" : "Ville:"}</b> {trackResult.origin}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: Agencies */}
            {activeTab === "agencies" && (
              <div>
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1.5px solid rgba(255,255,255,0.15)",
                    background: "#0c0a1e",
                    color: "#ffffff",
                    fontWeight: "700",
                    marginBottom: "16px"
                  }}
                >
                  <option value="all">{isAr ? "كل المدن" : "Toutes les villes"}</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                  {agenciesLoading ? (
                    <div>{isAr ? "جاري التحميل..." : "Chargement..."}</div>
                  ) : (
                    agencies
                      .filter(a => selectedCity === "all" || a.city === selectedCity)
                      .map(a => (
                        <div key={a.id} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ fontWeight: "800", color: "#ffffff" }}>{a.name}</div>
                          <div style={{ fontSize: "12px", color: "#94a3b8" }}>{a.city} {a.phone ? `| Tél: ${a.phone}` : ""}</div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Price Simulator */}
            {activeTab === "simulator" && (
              <div>
                <form onSubmit={handleSimulate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#94a3b8" }}>{isAr ? "وزن الطرد (كلغ):" : "Poids (kg):"}</label>
                    <input
                      type="number"
                      min="1"
                      value={weight}
                      onChange={e => setWeight(parseInt(e.target.value) || 1)}
                      style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#ffffff", fontWeight: "700", marginTop: "4px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#94a3b8" }}>{isAr ? "نوع الشحن:" : "Type d'expédition:"}</label>
                    <select
                      value={serviceType}
                      onChange={e => setServiceType(e.target.value)}
                      style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid rgba(255,255,255,0.15)", background: "#0c0a1e", color: "#ffffff", fontWeight: "700", marginTop: "4px" }}
                    >
                      <option value="express">{isAr ? "سريع (24 ساعة)" : "Express (24H)"}</option>
                      <option value="standard">{isAr ? "عادي (48 ساعة)" : "Standard (48H)"}</option>
                    </select>
                  </div>
                  <button type="submit" style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", cursor: "pointer" }}>
                    {isAr ? "احسب السعر" : "Calculer"}
                  </button>
                </form>

                {estimatedPrice !== null && (
                  <div style={{ marginTop: "18px", padding: "14px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontWeight: "800", display: "flex", justifyContent: "space-between" }}>
                    <span>{isAr ? "التسعيرة المقدرة:" : "Prix d'envoi estimé:"}</span>
                    <span>{estimatedPrice} MAD</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
