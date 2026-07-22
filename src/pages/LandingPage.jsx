import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // State inside tool modal: 'tracking' | 'agencies' | 'simulator'
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

  // Accordion active row state for "This is how we work"
  const [activeAccordion, setActiveAccordion] = useState("strategy");

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
        setTrackError(isAr ? "لم نجد أي شحنة بهذا الرقم" : "Aucun envoi trouvé avec ce numéro");
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
    <div dir={isAr ? "rtl" : "ltr"} className="landing-page-wrapper" style={{
      minHeight: "100vh",
      background: "#030712", // Pure premium Shiftler black background
      color: "#ffffff",
      fontFamily: "system-ui, -apple-system, sans-serif",
      margin: 0,
      boxSizing: "border-box",
      overflowX: "hidden"
    }}>
      
      {/* ── 1. NAVBAR (Shiftler Replica style) ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxSizing: "border-box"
      }}>
        {/* Brand Logo with Animated Lightning bolt */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <svg className="logo-lightning-bolt" width="26" height="26" viewBox="0 0 24 24" fill="#3b82f6">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <div>
            <div className="logo-text-shift" style={{ fontSize: "24px", fontWeight: "900", letterSpacing: "-0.04em", lineHeight: "1" }}>Boraq</div>
            <div style={{ fontSize: "10px", color: "#9ca3af", fontWeight: "600", marginTop: "2px" }}>
              {isAr ? "نقل البضائع الدولي" : "International Freight"}
            </div>
          </div>
        </div>

        {/* Menu Links */}
        <nav className="desktop-nav" style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          fontSize: "13px",
          fontWeight: "700"
        }}>
          <a href="#services-grid" style={{ color: "#ffffff", textDecoration: "none" }}>{isAr ? "الخدمات" : "Services"}</a>
          <button
            onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#9ca3af", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}
          >
            {isAr ? "تتبع الشحنات" : "Suivi Cargo"}
          </button>
          <button
            onClick={() => { setActiveTab("agencies"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#9ca3af", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}
          >
            {isAr ? "الشبكة والوكالات" : "Réseau National"}
          </button>
          <button
            onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#9ca3af", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}
          >
            {isAr ? "الأسعار" : "Tarifs"}
          </button>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{ background: "transparent", color: "#9ca3af", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}
          >
            {isAr ? "Français" : "العربية"}
          </button>
        </nav>

        {/* Right Call & Track actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "13px" }}>
          <span style={{ color: "#9ca3af" }} className="desktop-only-table">
            📞 {isAr ? "اتصل بنا: " : "Call Us On: "} <b>+212 522 000 000</b>
          </span>

          <button
            onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
            style={{
              background: "#3b82f6",
              color: "#ffffff",
              border: "none",
              padding: "8px 20px",
              borderRadius: "20px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(59,130,246,0.3)"
            }}
          >
            {isAr ? "تتبع الآن" : "Track Now"}
          </button>

          <button
            onClick={onOpenLogin}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#ffffff",
              padding: "8px 18px",
              borderRadius: "20px",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            {isAr ? "فضاء الخدامة" : "Espace Pro"}
          </button>
        </div>
      </header>

      {/* ── 2. HERO AREA (Be Globally Connected) ── */}
      <section style={{
        padding: "80px 0 60px 0",
        textAlign: "center",
        position: "relative"
      }}>
        <h1 style={{
          fontSize: "clamp(42px, 7vw, 90px)",
          fontWeight: "900",
          color: "#ffffff",
          margin: "0 0 20px 0",
          letterSpacing: "-0.04em",
          lineHeight: "1.05"
        }}>
          {isAr ? "كن متصلاً بالعالم" : "Be Globally Connected"}
        </h1>

        {/* Airplane Hero Visual (Transversal flying look) */}
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          zIndex: 2
        }}>
          <img src="/boraq_plane.jpg" className="hero-floating-visual" alt="Air Cargo Delivery" style={{
            width: "100%",
            borderRadius: "20px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
          }} />

          {/* Overlay left paragraph block */}
          <div style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            maxWidth: "280px",
            textAlign: "left",
            background: "rgba(3,7,18,0.75)",
            backdropFilter: "blur(8px)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.08)"
          }} className="desktop-only-table">
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0, lineHeight: 1.5 }}>
              {isAr
                ? "شحن جوي وبحري سريع من المغرب نحو كافة الدول الأوروبية. خدمة شحن الحمولات والمعدات الصناعية والسلع بدقة متناهية."
                : "Fast international cargo transit from Morocco to European destinations. Ensuring high-priority delivery and secure handling."}
            </p>
          </div>

          {/* Overlay right selector thumbnails */}
          <div style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            display: "flex",
            gap: "10px"
          }} className="desktop-only-table">
            <div style={{ width: "40px", height: "40px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", overflow: "hidden" }}>
              <img src="/boraq_collage.jpg" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ width: "40px", height: "40px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", overflow: "hidden" }}>
              <img src="/boraq_3d_truck.jpg" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>
        </div>

        <div style={{ fontSize: "16px", fontWeight: "700", color: "#9ca3af", marginTop: "30px", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          {isAr ? "شحن جوي ودولي سريع" : "Fast International Air & Land Delivery"}
        </div>
      </section>

      {/* ── 3. MIDDLE BRAND VALUE PROPOSITION (Change & Anticipate) ── */}
      <section style={{
        padding: "60px 0",
        textAlign: "center",
        maxWidth: "800px",
        margin: "0 auto",
        borderTop: "1px solid rgba(255,255,255,0.06)"
      }}>
        <h2 style={{
          fontSize: "clamp(22px, 3.5vw, 36px)",
          fontWeight: "800",
          color: "#ffffff",
          lineHeight: "1.4",
          margin: "0 0 20px 0"
        }}>
          {isAr ? "لا نتكيف مع التغيير، بل نتوقعه! 💡" : "We don't adapt to change, we anticipate it! 💡"}
        </h2>
        <p style={{
          fontSize: "18px",
          color: "#9ca3af",
          lineHeight: "1.6",
          margin: "0 0 30px 0"
        }}>
          {isAr ? "حلولنا اللوجستية الرقمية تربط تجارتك وشحناتك دولياً بـ أمان وسلاسة." : "Our digital solutions have transformed brands and empowered businesses "}
          <span style={{ color: "#6366f1", fontWeight: "800" }}>{isAr ? "عالمياً. 🚀" : "globally. 🚀"}</span>
        </p>

        {/* 4 Rounded Pills */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          {["Professional", "Affordable", "Modern", "Trustworthy"].map(p => (
            <span key={p} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#d1d5db",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700"
            }}>{p}</span>
          ))}
        </div>
      </section>

      {/* ── 4. VERTICAL SERVICES GRID SECTION (SERVICES Backdrop) ── */}
      <section id="services-grid" style={{
        padding: "80px 0",
        position: "relative"
      }}>
        {/* Massive backdrop text SERVICE */}
        <div style={{
          position: "absolute",
          top: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "clamp(80px, 15vw, 190px)",
          fontWeight: "900",
          color: "rgba(255,255,255,0.02)",
          letterSpacing: "0.1em",
          userSelect: "none",
          zIndex: 1
        }}>
          SERVICE
        </div>

        {/* The Grid of 4 vertical cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          position: "relative",
          zIndex: 2,
          maxWidth: "1100px",
          margin: "0 auto"
        }} className="responsive-grid-landing">
          
          {/* Card 1: Rail Freight */}
          <div className="tilt-card-3d" style={{
            height: "380px",
            borderRadius: "16px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer"
          }}>
            <img src="/boraq_train.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "45%",
              background: "linear-gradient(to top, rgba(3,7,18,0.95) 0%, transparent 100%)",
              display: "flex",
              alignItems: "flex-end",
              padding: "20px",
              boxSizing: "border-box"
            }}>
              <div>
                <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>
                  Boraq Logistics
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff" }}>
                  Rail Freight
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Air Freight */}
          <div className="tilt-card-3d" style={{
            height: "380px",
            borderRadius: "16px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer"
          }}>
            <img src="/boraq_plane.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "45%",
              background: "linear-gradient(to top, rgba(3,7,18,0.95) 0%, transparent 100%)",
              display: "flex",
              alignItems: "flex-end",
              padding: "20px",
              boxSizing: "border-box"
            }}>
              <div>
                <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>
                  Boraq Logistics
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff" }}>
                  Air Freight
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Land Express */}
          <div className="tilt-card-3d" style={{
            height: "380px",
            borderRadius: "16px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer"
          }}>
            <img src="/boraq_truck.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "45%",
              background: "linear-gradient(to top, rgba(3,7,18,0.95) 0%, transparent 100%)",
              display: "flex",
              alignItems: "flex-end",
              padding: "20px",
              boxSizing: "border-box"
            }}>
              <div>
                <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>
                  Boraq Logistics
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff" }}>
                  Land Express
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Sea Freight */}
          <div className="tilt-card-3d" style={{
            height: "380px",
            borderRadius: "16px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer"
          }}>
            <img src="/boraq_ship.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "45%",
              background: "linear-gradient(to top, rgba(3,7,18,0.95) 0%, transparent 100%)",
              display: "flex",
              alignItems: "flex-end",
              padding: "20px",
              boxSizing: "border-box"
            }}>
              <div>
                <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>
                  Boraq Logistics
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff" }}>
                  Sea Freight
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 5. HOW WE WORK SECTION (Accordion style) ── */}
      <section style={{
        padding: "60px 0",
        maxWidth: "800px",
        margin: "0 auto",
        borderTop: "1px solid rgba(255,255,255,0.06)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "900", color: "#ffffff", margin: 0 }}>
            {isAr ? "هكذا نعمل" : "This is how "}
            <span style={{ color: "#3b82f6" }}>{isAr ? "بتميز" : "we work"}</span>
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Row 1: Strategy */}
          <div
            onClick={() => setActiveAccordion("strategy")}
            style={{
              padding: "24px 0",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "20px", fontWeight: "800", color: activeAccordion === "strategy" ? "#3b82f6" : "#ffffff" }}>
                Strategy
              </span>
              <span>{activeAccordion === "strategy" ? "▲" : "▼"}</span>
            </div>
            {activeAccordion === "strategy" && (
              <p style={{ fontSize: "14px", color: "#9ca3af", marginTop: "12px", lineHeight: "1.6", animation: "fadeInUp 0.3s ease" }}>
                {isAr
                  ? "نقوم بالتخطيط والتنسيق اللوجستي المسبق للشاحنات وخطوط الملاحة لضمان الوصول السريع وتقليل التكاليف الإدارية."
                  : "We map optimal routing networks across borders, ensuring custom clearance documentation is processed ahead of departure."}
              </p>
            )}
          </div>

          {/* Row 2: Reliability */}
          <div
            onClick={() => setActiveAccordion("reliability")}
            style={{
              padding: "24px 0",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "20px", fontWeight: "800", color: activeAccordion === "reliability" ? "#3b82f6" : "#ffffff" }}>
                Reliability
              </span>
              <span>{activeAccordion === "reliability" ? "▲" : "▼"}</span>
            </div>
            {activeAccordion === "reliability" && (
              <p style={{ fontSize: "14px", color: "#9ca3af", marginTop: "12px", lineHeight: "1.6", animation: "fadeInUp 0.3s ease" }}>
                {isAr
                  ? "التزام كامل بمواعيد التسليم المحددة وأمان الشحنات مع تغطية شاملة للتأمين وضمان التعويض."
                  : "On-time cargo delivery with real-time GPS coordinates and verified proof of delivery scans at every hub."}
              </p>
            )}
          </div>
        </div>
      </section>

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

      {/* ── POPUP TOOL MODAL OVERLAY (For Clean interactive tracking/agencies panels) ── */}
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
