import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Tab State inside tool modal: 'tracking' | 'agencies' | 'simulator'
  const [activeTab, setActiveTab] = useState("tracking");
  const [showToolModal, setShowToolModal] = useState(false);

  // Scroll Position for Parallax zoom
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
      try {
        const { data, error } = await supabase.from("agencies").select("*").order("city");
        if (!error && data) setAgencies(data);
      } catch (e) {
        console.error(e);
      }
    }
    fetchAgencies();
  }, []);

  // Tracking database states
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  // Input states for the Bankar widget
  const [pickupCity, setPickupCity] = useState("");
  const [destCity, setDestCity] = useState("");

  const [agencies, setAgencies] = useState([]);
  const [selectedCity, setSelectedCity] = useState("all");

  // Price simulator state
  const [weight, setWeight] = useState(1);
  const [serviceType, setServiceType] = useState("express");
  const [estimatedPrice, setEstimatedPrice] = useState(null);

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
      background: "#090e1a", // Deep slate-blue/black matching mockup background
      color: "#e2e8f0",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      margin: 0,
      padding: 0,
      boxSizing: "border-box",
      overflowX: "hidden"
    }}>

      {/* ── CONSTISTENT FLOATING HEADER (Appears after scrolling past Hero) ── */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "65px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 40px",
        background: "rgba(9, 14, 26, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        opacity: scrollY > 600 ? 1 : 0,
        transform: scrollY > 600 ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)",
        pointerEvents: scrollY > 600 ? "auto" : "none",
        zIndex: 1000
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <a href="#slide-1" style={{ color: "#ffffff", textDecoration: "none", fontSize: "13px", fontWeight: "800" }}>{isAr ? "الرئيسية" : "Accueil"}</a>
          <a href="#slide-2" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: "800" }}>{isAr ? "لماذا نحن" : "Engagement"}</a>
          <a href="#slide-3" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: "800" }}>{isAr ? "الحمولات" : "Fret"}</a>
          <a href="#slide-4" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: "800" }}>{isAr ? "من نحن" : "À Propos"}</a>
          <a href="#slide-5" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: "800" }}>{isAr ? "الخدمات" : "Services"}</a>
          <a href="#slide-6" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: "800" }}>{isAr ? "اتصل بنا" : "Contacts"}</a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontWeight: "800" }}
          >
            {isAr ? "Français" : "العربية"}
          </button>
          <button
            onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
            style={{ background: "#3b82f6", color: "#ffffff", border: "none", padding: "6px 18px", borderRadius: "20px", fontWeight: "800", cursor: "pointer", fontSize: "12px" }}
          >
            {isAr ? "تتبع الشحنة" : "Suivre cargo"}
          </button>
        </div>
      </header>

      {/* ── VERTICAL STACK OF 6 VIEWPORT SLIDES ── */}
      <main style={{ width: "100%" }}>

        {/* ── NEW HERO / COVER SECTION (Bankar Style - Slide 1) ── */}
        <section id="slide-1" style={{
          minHeight: "180vh",
          background: "#ffffff", // Pure crisp white top background
          color: "#1e293b",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box"
        }}>
          
          {/* WHITE TOP PORTION (approx 100vh) */}
          <div style={{
            minHeight: "100vh",
            width: "100%",
            padding: "20px 80px",
            boxSizing: "border-box",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            
            {/* Local white Navbar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              paddingBottom: "14px",
              zIndex: 10
            }}>
              {/* Logo block */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#ff6b00">
                  <circle cx="12" cy="12" r="10" stroke="#ff6b00" strokeWidth="2" fill="none" />
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#ff6b00" />
                </svg>
                <span style={{ fontSize: "24px", fontWeight: "900", color: "#090e1a", letterSpacing: "-0.04em" }}>Boraq.</span>
              </div>

              {/* Links */}
              <div style={{ display: "flex", gap: "24px", fontSize: "13px", fontWeight: "800", color: "#64748b" }} className="desktop-only-table">
                <span style={{ cursor: "pointer", color: "#ff6b00" }} onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}>Track Package</span>
                <a href="#slide-5" style={{ textDecoration: "none", color: "inherit" }}>Services</a>
                <span style={{ cursor: "pointer" }} onClick={() => { setActiveTab("agencies"); setShowToolModal(true); }}>Locations</span>
                <span style={{ cursor: "pointer" }} onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}>Simulator</span>
              </div>

              {/* Orange pill button */}
              <button
                onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
                style={{
                  background: "#ff6b00",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: "20px",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(255,107,0,0.3)"
                }}
              >
                {isAr ? "اتصل بنا" : "Contact us"}
              </button>
            </div>

            {/* Hero Main Content */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              marginTop: "40px",
              zIndex: 10
            }} className="responsive-grid-landing">
              
              {/* Left text column */}
              <div style={{ maxWidth: "550px", textAlign: isAr ? "right" : "left" }}>
                <h1 style={{
                  fontSize: "clamp(36px, 6vw, 68px)",
                  fontWeight: "900",
                  color: "#0f172a",
                  lineHeight: "1.05",
                  margin: "0 0 10px 0",
                  letterSpacing: "-0.03em"
                }}>
                  Delivering Your Cargo
                </h1>
                
                {/* Worldwide orange tag */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "28px", fontWeight: "800", color: "#ff6b00", marginBottom: "30px" }}>
                  <span>🌐</span>
                  <span>Maroc - Europe</span>
                </div>

                {/* Pickup & destination search bar */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#ffffff",
                  borderRadius: "30px",
                  padding: "6px 10px 6px 20px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  border: "1.5px solid #e2e8f0",
                  gap: "10px"
                }}>
                  <input
                    type="text"
                    value={pickupCity}
                    onChange={e => setPickupCity(e.target.value)}
                    placeholder={isAr ? "مدينة الإرسال" : "Enter pickup location"}
                    style={{ border: "none", outline: "none", fontSize: "13px", width: "160px", color: "#1e293b", fontWeight: "700" }}
                  />
                  <div style={{ width: "1px", height: "24px", background: "#e2e8f0" }} />
                  <input
                    type="text"
                    value={destCity}
                    onChange={e => setDestCity(e.target.value)}
                    placeholder={isAr ? "مدينة الاستلام" : "Enter destination location"}
                    style={{ border: "none", outline: "none", fontSize: "13px", width: "160px", color: "#1e293b", fontWeight: "700" }}
                  />
                  <button
                    onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
                    style={{
                      background: "#0f172a",
                      border: "none",
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#ffffff"
                    }}
                  >
                    🔍
                  </button>
                </div>
              </div>

              {/* Right angled floating 3D container illustration */}
              <div style={{
                position: "relative",
                width: "440px",
                height: "360px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `translateY(${scrollY * 0.1}px)`,
                transition: "transform 0.1s ease-out"
              }}>
                <img src="/boraq_container.jpg" alt="Boraq Container" style={{
                  width: "100%",
                  objectFit: "contain",
                  filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.15))"
                }} className="hero-floating-visual" />
                
                {/* 360° circular orange badge */}
                <div style={{
                  position: "absolute",
                  top: "60px",
                  left: "20px",
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#ff6b00",
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "900",
                  boxShadow: "0 10px 20px rgba(255,107,0,0.4)"
                }}>
                  <span>360°</span>
                  <span>🔄</span>
                </div>
              </div>

            </div>

            {/* Spacer */}
            <div style={{ height: "40px" }} />
          </div>

          {/* DARK BOTTOM PORTION (Slide-down card) */}
          <div style={{
            background: "#090e1a",
            borderTopLeftRadius: "40px",
            borderTopRightRadius: "40px",
            padding: "80px 80px",
            boxSizing: "border-box",
            position: "relative",
            zIndex: 20
          }}>
            {/* Partners Logo row */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px",
              opacity: 0.5,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              paddingBottom: "40px",
              marginBottom: "60px"
            }}>
              <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>OXFAM</span>
              <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>DT Global</span>
              <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>NAYBA</span>
              <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>MOVE</span>
              <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>Winsupply</span>
              <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>FERGUSON</span>
            </div>

            {/* 2-Column Info layout */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
              gap: "60px",
              alignItems: "center"
            }} className="responsive-grid-landing">
              
              {/* Left container visual */}
              <div style={{
                borderRadius: "24px",
                overflow: "hidden",
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
              }}>
                <img src="/boraq_crane_lift.jpg" style={{ width: "100%", display: "block" }} />
              </div>

              {/* Right text details */}
              <div style={{ textAlign: isAr ? "right" : "left" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "#ff6b00", marginBottom: "10px" }}>
                  #1 Morocco-Europe Logistics Solution
                </div>
                
                <h3 style={{ fontSize: "36px", fontWeight: "900", color: "#ffffff", margin: "0 0 20px 0" }}>
                  {isAr ? "حلول النقل البري والبحري المتكاملة" : "Nationwide Delivery Logistics Solution"}
                </h3>

                <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.7, marginBottom: "30px" }}>
                  {isAr
                    ? "تلتزم شركة البراق بتقديم خطوط ربط تجارية يومية ودائمة لنقل البضائع والمعدات الصناعية والسلع من المغرب إلى شتى الوجهات الأوروبية بدقة واحترافية متناهية."
                    : "Boraq Logistics is a premium international cargo company specializing in freight connections between Morocco and Europe. We provide daily links, secure customs operations, and custom transport services for all cargo categories."}
                </p>

                {/* Call to actions */}
                <div style={{ display: "flex", gap: "16px" }}>
                  <button
                    onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
                    style={{
                      background: "#ff6b00",
                      color: "#ffffff",
                      border: "none",
                      padding: "14px 30px",
                      borderRadius: "30px",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    {isAr ? "احسب التسعيرة ➔" : "Get a Quote ➔"}
                  </button>
                  <button
                    onClick={() => { setActiveTab("agencies"); setShowToolModal(true); }}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#ffffff",
                      padding: "14px 30px",
                      borderRadius: "30px",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    {isAr ? "اعرف المزيد" : "Learn More"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── SLIDE 2: WHY TRUST US (User Number 2) ── */}
        <section id="slide-2" style={{
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box"
        }}>
          {/* Background image parallax */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "url('/boraq_port_terminal.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `scale(${1.1 - (scrollY - 1400) * 0.0001}) translateY(${(scrollY - 1400) * 0.08}px)`,
            zIndex: 1
          }} />
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, rgba(9, 14, 26, 0.95) 0%, rgba(9, 14, 26, 0.75) 100%)",
            zIndex: 2
          }} />

          {/* Small logo top-left */}
          <div style={{ position: "absolute", top: "100px", left: "80px", display: "flex", alignItems: "center", gap: "8px", zIndex: 10 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6"><circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#3b82f6" strokeWidth="2" fill="none" /></svg>
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>Boraq</span>
          </div>

          <div style={{
            position: "relative",
            zIndex: 10,
            paddingLeft: "80px",
            paddingRight: "80px",
            width: "100%",
            textAlign: isAr ? "right" : "left"
          }}>
            <h2 style={{ fontSize: "36px", fontWeight: "900", color: "#ffffff", margin: "0 0 30px 0" }}>
              {isAr ? "لماذا يثق بنا العملاء؟" : "Pourquoi les clients nous font confiance"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px", maxWidth: "900px" }}>
              <div>
                <h4 style={{ fontSize: "18px", color: "#ff6b00", margin: "0 0 8px 0" }}>{isAr ? "الموثوقية والأمان" : "Fiabilité & Sécurité"}</h4>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{isAr ? "تأمين وحماية كاملة للبضائع المشحونة" : "Gestion de transport sécurisé avec suivi constant"}</p>
              </div>
              <div>
                <h4 style={{ fontSize: "18px", color: "#ff6b00", margin: "0 0 8px 0" }}>{isAr ? "أسعار منافسة" : "Prix Compétitif"}</h4>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{isAr ? "تكلفة شحن محسوبة دون رسوم خفية" : "Fret optimisé pour l'Europe et le Maroc"}</p>
              </div>
              <div>
                <h4 style={{ fontSize: "18px", color: "#ff6b00", margin: "0 0 8px 0" }}>{isAr ? "السرعة والدقة" : "Vitesse d'expédition"}</h4>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{isAr ? "احترام تام لمواعيد التسليم المحددة" : "Respect strict des délais d'expédition"}</p>
              </div>
              <div>
                <h4 style={{ fontSize: "18px", color: "#ff6b00", margin: "0 0 8px 0" }}>{isAr ? "خدمة متكاملة" : "Service 24/7"}</h4>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{isAr ? "متابعة وتخليص جمركي دون تعقيدات" : "Support opérationnel dédié pour tous vos chargements"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SLIDE 3: TYPES OF CARGO (User Number 3) ── */}
        <section id="slide-3" style={{
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box"
        }}>
          {/* Background image parallax */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "url('/boraq_warehouse.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `scale(${1.1 - (scrollY - 2000) * 0.0001}) translateY(${(scrollY - 2000) * 0.08}px)`,
            zIndex: 1
          }} />
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, rgba(9, 14, 26, 0.95) 0%, rgba(9, 14, 26, 0.75) 100%)",
            zIndex: 2
          }} />

          {/* Small logo top-left */}
          <div style={{ position: "absolute", top: "100px", left: "80px", display: "flex", alignItems: "center", gap: "8px", zIndex: 10 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6"><circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#3b82f6" strokeWidth="2" fill="none" /></svg>
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>Boraq</span>
          </div>

          <div style={{
            position: "relative",
            zIndex: 10,
            paddingLeft: "80px",
            paddingRight: "80px",
            width: "100%",
            textAlign: isAr ? "right" : "left"
          }}>
            <h2 style={{ fontSize: "40px", fontWeight: "900", color: "#ffffff", margin: "0 0 10px 0" }}>
              {isAr ? "ننقل 99% من أنواع البضائع" : "Nous transportons 99% du fret"}
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "30px" }}>
              {isAr ? "تصنيف حمولات النقل الدولي" : "Normes de sécurité et conformité T.I.R. internationale"}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", maxWidth: "900px" }}>
              {["Liquide", "Dangereux", "Inflammable", "Fragile", "Lourd", "Vrac"].map(c => (
                <div key={c} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "20px 10px",
                  borderRadius: "10px",
                  textAlign: "center",
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#ffffff"
                }}>
                  {c}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SLIDE 4: À PROPOS (User Number 4) ── */}
        <section id="slide-4" style={{
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box"
        }}>
          {/* Background image parallax */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "url('/boraq_crane_lift.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `scale(${1.1 - (scrollY - 2600) * 0.0001}) translateY(${(scrollY - 2600) * 0.08}px)`,
            zIndex: 1
          }} />
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, rgba(9, 14, 26, 0.95) 0%, rgba(9, 14, 26, 0.75) 100%)",
            zIndex: 2
          }} />

          {/* Small logo top-left */}
          <div style={{ position: "absolute", top: "100px", left: "80px", display: "flex", alignItems: "center", gap: "8px", zIndex: 10 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6"><circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#3b82f6" strokeWidth="2" fill="none" /></svg>
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>Boraq</span>
          </div>

          <div style={{
            position: "relative",
            zIndex: 10,
            paddingLeft: "80px",
            paddingRight: "80px",
            maxWidth: "750px",
            textAlign: isAr ? "right" : "left"
          }}>
            <h2 style={{ fontSize: "48px", fontWeight: "900", color: "#ffffff", margin: "0 0 24px 0" }}>
              {isAr ? "من نحن" : "À propos"}
            </h2>
            
            <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: 1.8, marginBottom: "16px" }}>
              {isAr
                ? "منذ أكثر من 10 سنوات، تعد شركة البراق الضامن للموثوقية والدقة اللوجستية في نقل البضائع دولياً."
                : "Voilà plus de 10 ans que la société Boraq est le garant de la fiabilité et de la précision dans la logistique."}
            </p>
            <p style={{ fontSize: "16px", color: "#94a3b8", lineHeight: 1.8, marginBottom: "16px" }}>
              {isAr
                ? "نحل كافة مهام الشحن واللوجستيك والتخليص الجمركي، بدءاً من الحمولات البسيطة وصولاً إلى المعدات الصناعية المعقدة."
                : "Nous résolvons tous les défis de transport, du colis industriel à la cargaison de grande envergure ou de technologie complexe."}
            </p>
            <p style={{ fontSize: "16px", color: "#94a3b8", lineHeight: 1.8 }}>
              {isAr
                ? "مهمتنا: تأمين وتوزيع سلاسل التوريد والاتصال بين المغرب وأوروبا لنمو أعمال عملائنا."
                : "Notre mission : Assurer des chaînes d'approvisionnement continues et économiques, favorisant la croissance de nos clients."}
            </p>
          </div>
        </section>

        {/* ── SLIDE 5: SERVICES (User Number 5) ── */}
        <section id="slide-5" style={{
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "url('/boraq_route_map.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `scale(${1.1 - (scrollY - 3200) * 0.0001}) translateY(${(scrollY - 3200) * 0.08}px)`,
            zIndex: 1
          }} />
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, rgba(9, 14, 26, 0.95) 0%, rgba(9, 14, 26, 0.75) 100%)",
            zIndex: 2
          }} />

          {/* Small logo top-left */}
          <div style={{ position: "absolute", top: "100px", left: "80px", display: "flex", alignItems: "center", gap: "8px", zIndex: 10 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6"><circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none" /><path d="M2 12h20M12 2a15.3(15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#3b82f6" strokeWidth="2" fill="none" /></svg>
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>Boraq</span>
          </div>

          <div style={{
            position: "relative",
            zIndex: 10,
            paddingLeft: "80px",
            paddingRight: "80px",
            width: "100%",
            textAlign: isAr ? "right" : "left"
          }}>
            <h2 style={{ fontSize: "40px", fontWeight: "900", color: "#ffffff", margin: "0 0 30px 0" }}>
              {isAr ? "خدمات النقل والوجهات" : "Nos solutions & prestations logistiques"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", maxWidth: "900px" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h4 style={{ color: "#ffffff", margin: "0 0 8px 0" }}>FTL / LTL Groupage</h4>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{isAr ? "شاحنات كاملة وحلول تجميع مرنة" : "Transport en camions complets et lots partiels Maroc-Europe"}</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h4 style={{ color: "#ffffff", margin: "0 0 8px 0" }}>Express prioritaires</h4>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{isAr ? "خدمة توصيل مستعجل وسريعة" : "Expéditions urgentes et prioritaires sous douane"}</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h4 style={{ color: "#ffffff", margin: "0 0 8px 0" }}>Transit Multimodal</h4>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{isAr ? "تكامل بري وبحري دولي" : "Combinaison optimale route, mer et air"}</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h4 style={{ color: "#ffffff", margin: "0 0 8px 0" }}>Outsourcing logistique</h4>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{isAr ? "إدارة وتوزيع وتخزين البضائع" : "Gestion logistique et stockage de stock"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SLIDE 6: CONTACTS (User Number 6) ── */}
        <section id="slide-6" style={{
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "url('/boraq_truck_train.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `scale(${1.1 - (scrollY - 3800) * 0.0001}) translateY(${(scrollY - 3800) * 0.08}px)`,
            zIndex: 1
          }} />
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, rgba(9, 14, 26, 0.95) 0%, rgba(9, 14, 26, 0.75) 100%)",
            zIndex: 2
          }} />

          {/* Small logo top-left */}
          <div style={{ position: "absolute", top: "100px", left: "80px", display: "flex", alignItems: "center", gap: "8px", zIndex: 10 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6"><circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#3b82f6" strokeWidth="2" fill="none" /></svg>
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>Boraq</span>
          </div>

          <div style={{
            position: "relative",
            zIndex: 10,
            paddingLeft: "80px",
            paddingRight: "80px",
            width: "100%",
            textAlign: isAr ? "right" : "left"
          }}>
            <h2 style={{ fontSize: "40px", fontWeight: "900", color: "#ffffff", margin: "0 0 24px 0" }}>
              {isAr ? "اتصل بنا" : "Contacts"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "40px" }} className="responsive-grid-landing">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "16px", color: "#cbd5e1" }}>
                <div>📍 Zone Industrielle Ain Sebaa, Casablanca, Maroc</div>
                <div>📞 +212 522 000 000</div>
                <div>✉️ contact@boraq.online</div>
                <div>🌐 Dépôts partenaires: France, Espagne, Italie</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", justifyContent: "center" }}>
                <button
                  onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
                  style={{
                    background: "#ff6b00", // Branded orange button
                    color: "#ffffff",
                    border: "none",
                    padding: "16px 30px",
                    borderRadius: "30px",
                    fontWeight: "800",
                    fontSize: "14px",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(255,107,0,0.4)"
                  }}
                >
                  {isAr ? "تتبع شحنتك الآن ➔" : "Suivre mon cargo ➔"}
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

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
                  borderBottom: activeTab === "tracking" ? "2.5px solid #ff6b00" : "none",
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
                  borderBottom: activeTab === "agencies" ? "2.5px solid #ff6b00" : "none",
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
                  borderBottom: activeTab === "simulator" ? "2.5px solid #ff6b00" : "none",
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
                      background: "#ff6b00",
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
                      <span style={{ fontWeight: "900", color: "#ff6b00" }}>{trackResult.tracking_number}</span>
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
                  <button type="submit" style={{ background: "#ff6b00", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", cursor: "pointer" }}>
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
