import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Tab State for the floating widgets: 'tracking' | 'agencies' | 'simulator'
  const [activeTab, setActiveTab] = useState("tracking");
  const [showToolModal, setShowToolModal] = useState(false);

  // Scroll Position for header animations
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch agencies on mount
  const [agencies, setAgencies] = useState([]);
  const [selectedCity, setSelectedCity] = useState("all");

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

  // Price simulator state
  const [weight, setWeight] = useState(1);
  const [serviceType, setServiceType] = useState("express");
  const [estimatedPrice, setEstimatedPrice] = useState(null);

  // Active tab in the bottom widget: 'track' | 'calculate'
  const [bottomWidgetTab, setBottomWidgetTab] = useState("track");

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
      background: "#ffffff", // Pure crisp white theme matching Bankar screenshots
      color: "#1e293b",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      margin: 0,
      padding: 0,
      boxSizing: "border-box",
      overflowX: "hidden"
    }}>

      {/* ── STICKY FLOATING HEADER (Blends with light sections) ── */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "70px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 40px",
        background: scrollY > 100 ? "rgba(255, 255, 255, 0.95)" : "transparent",
        backdropFilter: "blur(12px)",
        borderBottom: scrollY > 100 ? "1px solid #e2e8f0" : "none",
        boxShadow: scrollY > 100 ? "0 4px 20px rgba(0,0,0,0.03)" : "none",
        zIndex: 1000,
        transition: "all 0.3s ease"
      }}>
        {/* Logo block */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#ff6b00">
            <circle cx="12" cy="12" r="10" stroke="#ff6b00" strokeWidth="2" fill="none" />
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#ff6b00" />
          </svg>
          <span style={{ fontSize: "20px", fontWeight: "950", color: "#0f172a", letterSpacing: "-0.04em" }}>Boraq.</span>
        </div>

        {/* Links */}
        <div style={{ display: "flex", gap: "24px", fontSize: "13px", fontWeight: "800", color: "#64748b" }} className="desktop-only-table">
          <a href="#services" style={{ textDecoration: "none", color: "inherit" }}>{isAr ? "الخدمات" : "Services"}</a>
          <a href="#powering" style={{ textDecoration: "none", color: "inherit" }}>{isAr ? "مزايانا" : "Powering"}</a>
          <a href="#agencies" style={{ textDecoration: "none", color: "inherit" }}>{isAr ? "فروعنا" : "Locations"}</a>
          <a href="#tracking-section" style={{ textDecoration: "none", color: "inherit" }}>{isAr ? "التتبع" : "Track Cargo"}</a>
        </div>

        {/* Brand & Language actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{ background: "transparent", color: "#64748b", border: "none", cursor: "pointer", fontWeight: "800" }}
          >
            {isAr ? "Français" : "العربية"}
          </button>
          
          <button
            onClick={onOpenLogin}
            style={{
              background: "transparent",
              color: "#0f172a",
              border: "1px solid #0f172a",
              padding: "6px 18px",
              borderRadius: "20px",
              fontWeight: "800",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            Espace Pro
          </button>
        </div>
      </header>

      {/* ── STACK OF THE 5 BANKAR-STYLED SECTIONS ── */}
      <main style={{ width: "100%" }}>

        {/* ── SECTION 1: HERO (Bankar Design Cover) ── */}
        <section id="hero" style={{
          minHeight: "175vh",
          background: "#ffffff",
          color: "#0f172a",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box"
        }}>
          
          {/* WHITE TOP PORTION */}
          <div style={{
            minHeight: "100vh",
            width: "100%",
            padding: "120px 80px 40px 80px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%"
            }} className="responsive-grid-landing">
              
              {/* Left text column */}
              <div style={{ maxWidth: "580px", textAlign: isAr ? "right" : "left" }}>
                <h1 style={{
                  fontSize: "clamp(42px, 7vw, 76px)",
                  fontWeight: "900",
                  color: "#0f172a",
                  lineHeight: "1.02",
                  margin: "0 0 16px 0",
                  letterSpacing: "-0.04em"
                }}>
                  Delivering Your Cargo
                </h1>
                
                {/* Worldwide orange tag */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "32px", fontWeight: "900", color: "#ff6b00", marginBottom: "30px" }}>
                  <span>🌐</span>
                  <span>Maroc - Europe</span>
                </div>

                {/* Pickup & destination search bar */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#ffffff",
                  borderRadius: "30px",
                  padding: "8px 12px 8px 24px",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.06)",
                  border: "1.5px solid #e2e8f0",
                  gap: "10px",
                  maxWidth: "460px"
                }}>
                  <input
                    type="text"
                    value={pickupCity}
                    onChange={e => setPickupCity(e.target.value)}
                    placeholder={isAr ? "منين باغي تصيفط؟" : "Pickup location"}
                    style={{ border: "none", outline: "none", fontSize: "14px", width: "160px", color: "#1e293b", fontWeight: "700" }}
                  />
                  <div style={{ width: "1px", height: "24px", background: "#e2e8f0" }} />
                  <input
                    type="text"
                    value={destCity}
                    onChange={e => setDestCity(e.target.value)}
                    placeholder={isAr ? "لفين باغي توصل؟" : "Destination location"}
                    style={{ border: "none", outline: "none", fontSize: "14px", width: "160px", color: "#1e293b", fontWeight: "700" }}
                  />
                  <button
                    onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
                    style={{
                      background: "#ff6b00",
                      border: "none",
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#ffffff",
                      boxShadow: "0 4px 10px rgba(255,107,0,0.3)"
                    }}
                  >
                    🔍
                  </button>
                </div>
              </div>

              {/* Right angled floating 3D container illustration */}
              <div style={{
                position: "relative",
                width: "460px",
                height: "380px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `translateY(${scrollY * 0.1}px)`,
                transition: "transform 0.1s ease-out"
              }}>
                <img src="/boraq_container.jpg" alt="Boraq Container" style={{
                  width: "100%",
                  objectFit: "contain",
                  filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.1))"
                }} />
                
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
          </div>

          {/* DARK BOTTOM PORTION */}
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
              opacity: 0.4,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              paddingBottom: "40px",
              marginBottom: "60px"
            }}>
              {["OXFAM", "DT Global", "NAYBA", "MOVE", "Winsupply", "FERGUSON"].map(p => (
                <span key={p} style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>{p}</span>
              ))}
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
                boxShadow: "0 25px 50px rgba(0,0,0,0.4)"
              }}>
                <img src="/boraq_crane_lift.jpg" style={{ width: "100%", display: "block" }} />
              </div>

              {/* Right text details */}
              <div style={{ textAlign: isAr ? "right" : "left" }}>
                <div style={{ fontSize: "28px", fontWeight: "900", color: "#ff6b00", marginBottom: "10px" }}>
                  #1 Morocco-Europe Logistics Solution
                </div>
                
                <h3 style={{ fontSize: "36px", fontWeight: "900", color: "#ffffff", margin: "0 0 20px 0", lineHeight: 1.15 }}>
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

        {/* ── SECTION 2: SHIPPING & LOGISTICS SERVICES (Bankar Page 2 Top) ── */}
        <section id="services" style={{
          padding: "100px 40px",
          background: "#ffffff",
          color: "#0f172a",
          boxSizing: "border-box"
        }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "38px", fontWeight: "900", color: "#0f172a", margin: "0 0 40px 0" }}>
              {isAr ? "خدمات الشحن واللوجستيك" : "Shipping & Logistics Services"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }} className="responsive-grid-landing">
              
              {/* Card 1: Sea Shipping */}
              <div style={{
                borderRadius: "24px",
                overflow: "hidden",
                background: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                position: "relative",
                height: "380px"
              }}>
                <img src="/boraq_ship.jpg" style={{ width: "100%", height: "70%", objectFit: "cover" }} />
                <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ textAlign: "left" }}>
                    <h4 style={{ fontSize: "18px", fontWeight: "800", margin: 0 }}>Sea Shipping</h4>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>International cargo freight</span>
                  </div>
                  <span style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#ff6b00", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900" }}>➔</span>
                </div>
              </div>

              {/* Card 2: Air Shipping */}
              <div style={{
                borderRadius: "24px",
                overflow: "hidden",
                background: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                position: "relative",
                height: "380px"
              }}>
                <img src="/boraq_route_map.jpg" style={{ width: "100%", height: "70%", objectFit: "cover" }} />
                <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ textAlign: "left" }}>
                    <h4 style={{ fontSize: "18px", fontWeight: "800", margin: 0 }}>Air Shipping</h4>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Priority express flights</span>
                  </div>
                  <span style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#ff6b00", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900" }}>➔</span>
                </div>
              </div>

              {/* Card 3: Train Shipping */}
              <div style={{
                borderRadius: "24px",
                overflow: "hidden",
                background: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                position: "relative",
                height: "380px"
              }}>
                <img src="/boraq_truck_train.jpg" style={{ width: "100%", height: "70%", objectFit: "cover" }} />
                <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ textAlign: "left" }}>
                    <h4 style={{ fontSize: "18px", fontWeight: "800", margin: 0 }}>Train Shipping</h4>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Ground railway transit</span>
                  </div>
                  <span style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#ff6b00", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900" }}>➔</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 3: POWERING LOGISTICS (Bankar Page 2 Middle) ── */}
        <section id="powering" style={{
          padding: "100px 40px",
          background: "#f8fafc", // Contrast soft grey background
          color: "#0f172a",
          boxSizing: "border-box"
        }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "60px", alignItems: "center" }} className="responsive-grid-landing">
              
              {/* Left Column: List highlights */}
              <div style={{ textAlign: isAr ? "right" : "left" }}>
                <h2 style={{ fontSize: "38px", fontWeight: "900", color: "#0f172a", margin: "0 0 16px 0", lineHeight: 1.1 }}>
                  Powering logistics across business
                </h2>
                <p style={{ fontSize: "15px", color: "#64748b", lineHeight: 1.7, marginBottom: "40px" }}>
                  Delight your customers, scale operations, and boost efficiency with our advanced logistics platform, we're here to supercharge your supply chain.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {[
                    { title: "Nationwide carrier network", desc: "Reliable routes between Morocco and European terminals daily" },
                    { title: "Fully-featured logistics software", desc: "Real-time automated status updates for all shipments" },
                    { title: "Exception tracing & live support", desc: "Our operators are available 24/7 to solve shipping delays" }
                  ].map(item => (
                    <div key={item.title} style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                        <span style={{ color: "#ff6b00", fontWeight: "900" }}>✓</span>
                        <h4 style={{ fontSize: "16px", fontWeight: "800", margin: 0 }}>{item.title}</h4>
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 0 20px" }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Containers Stack picture */}
              <div style={{
                borderRadius: "24px",
                overflow: "hidden",
                boxShadow: "0 20px 40px rgba(0,0,0,0.05)"
              }}>
                <img src="/boraq_warehouse.jpg" style={{ width: "100%", display: "block" }} />
              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 4: FIND LOCATIONS / WORLD MAP (Bankar Page 2 Map) ── */}
        <section id="agencies" style={{
          padding: "100px 40px",
          background: "#ffffff",
          color: "#0f172a",
          boxSizing: "border-box"
        }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "38px", fontWeight: "900", color: "#0f172a", margin: "0 0 16px 0" }}>
              Find Locations To Buy, Sell Or Lease Containers
            </h2>
            <p style={{ fontSize: "15px", color: "#64748b", maxWidth: "600px", margin: "0 auto 60px auto" }}>
              Our international partner agencies and logistics depots span Morocco, Spain, France, and Italy.
            </p>

            {/* Interactive World Map container */}
            <div style={{
              position: "relative",
              borderRadius: "24px",
              overflow: "hidden",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 15px 35px rgba(0,0,0,0.03)"
            }}>
              <img src="/boraq_map_tracking.jpg" style={{ width: "100%", display: "block", filter: "grayscale(1) brightness(0.95)" }} />
              
              {/* Map floating popup badge */}
              <div style={{
                position: "absolute",
                top: "40%",
                left: "45%",
                background: "#ffffff",
                borderRadius: "16px",
                padding: "16px 20px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                border: "1px solid #e2e8f0",
                textAlign: "left",
                zIndex: 10
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "18px" }}>🇲🇦</span>
                  <b style={{ fontSize: "14px", color: "#0f172a" }}>Casablanca, MAR</b>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Main Ain Sebaa terminal office</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: TRACK OR CALCULATE (Bankar Page 2 Bottom) ── */}
        <section id="tracking-section" style={{
          minHeight: "80vh",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box"
        }}>
          {/* Background image backdrop */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "url('/boraq_ship.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.15,
            zIndex: 1
          }} />
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "#090e1a", // Deep dark background
            zIndex: 2
          }} />

          <div style={{
            position: "relative",
            zIndex: 10,
            padding: "80px 40px",
            width: "100%",
            maxWidth: "1100px",
            margin: "0 auto"
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "60px",
              alignItems: "center"
            }} className="responsive-grid-landing">
              
              {/* Left Side Header */}
              <div style={{ textAlign: "left" }}>
                <h2 style={{ fontSize: "48px", fontWeight: "900", color: "#ffffff", margin: "0 0 20px 0", lineHeight: 1.05 }}>
                  Track or Calculate your shipments
                </h2>
                
                {/* Custom toggle buttons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "30px" }}>
                  <button
                    onClick={() => setBottomWidgetTab("track")}
                    style={{
                      background: bottomWidgetTab === "track" ? "#ff6b00" : "rgba(255,255,255,0.06)",
                      border: "none",
                      color: "#ffffff",
                      padding: "10px 24px",
                      borderRadius: "20px",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    Shipment Tracking
                  </button>
                  <button
                    onClick={() => setBottomWidgetTab("calculate")}
                    style={{
                      background: bottomWidgetTab === "calculate" ? "#ff6b00" : "rgba(255,255,255,0.06)",
                      border: "none",
                      color: "#ffffff",
                      padding: "10px 24px",
                      borderRadius: "20px",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    Shipment Rate
                  </button>
                </div>
              </div>

              {/* Right Side Floating white Card */}
              <div style={{
                background: "#ffffff",
                borderRadius: "24px",
                padding: "40px 30px",
                boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
                color: "#0f172a",
                textAlign: "left"
              }}>
                <h3 style={{ fontSize: "24px", fontWeight: "900", margin: "0 0 20px 0" }}>
                  {bottomWidgetTab === "track" ? "Quickly Track your Shipments" : "Calculate Shipping Cost"}
                </h3>

                {bottomWidgetTab === "track" ? (
                  <div>
                    <form onSubmit={handleTrack} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <input
                        type="text"
                        value={trackCode}
                        onChange={e => setTrackCode(e.target.value)}
                        placeholder="Enter your shipment code (ex: BRQ-091)"
                        style={{
                          width: "100%",
                          padding: "14px 18px",
                          borderRadius: "12px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          fontWeight: "700",
                          outline: "none"
                        }}
                      />
                      <button type="submit" disabled={trackLoading} style={{ background: "#ff6b00", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", cursor: "pointer" }}>
                        {trackLoading ? "..." : "Track Now"}
                      </button>
                    </form>
                    {trackError && <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "12px", fontWeight: "800" }}>{trackError}</div>}
                    {trackResult && (
                      <div style={{ marginTop: "16px", padding: "14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "13px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontWeight: "900", color: "#ff6b00" }}>{trackResult.tracking_number}</span>
                          <span style={{ color: "#10b981", fontWeight: "800" }}>{trackResult.status}</span>
                        </div>
                        <div><b>Receiver:</b> {trackResult.receiver_name}</div>
                        <div><b>Destination:</b> {trackResult.origin}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <form onSubmit={handleSimulate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <input
                        type="number"
                        min="1"
                        value={weight}
                        onChange={e => setWeight(parseInt(e.target.value) || 1)}
                        placeholder="Enter Weight (kg)"
                        style={{
                          width: "100%",
                          padding: "12px 18px",
                          borderRadius: "12px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          fontWeight: "700"
                        }}
                      />
                      <select
                        value={serviceType}
                        onChange={e => setServiceType(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 18px",
                          borderRadius: "12px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          fontWeight: "700"
                        }}
                      >
                        <option value="express">Express (24H)</option>
                        <option value="standard">Standard (48H)</option>
                      </select>
                      <button type="submit" style={{ background: "#ff6b00", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", cursor: "pointer" }}>
                        Calculate Rate
                      </button>
                    </form>
                    {estimatedPrice !== null && (
                      <div style={{ marginTop: "14px", padding: "14px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "#10b981", fontWeight: "800", display: "flex", justifyContent: "space-between" }}>
                        <span>Estimated Cost:</span>
                        <span>{estimatedPrice} MAD</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "40px 0 20px 0",
        textAlign: "center",
        borderTop: "1px solid #e2e8f0",
        fontSize: "12px",
        color: "#64748b",
        background: "#f8fafc"
      }}>
        © {new Date().getFullYear()} BORAQ. All rights reserved. International Transport Brokerage.
      </footer>

      {/* ── POPUP TOOL MODAL OVERLAY (For Floating quick access if needed) ── */}
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
                  {agencies.length === 0 ? (
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
          </div>
        </div>
      )}

    </div>
  );
}
