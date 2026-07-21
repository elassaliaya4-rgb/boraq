import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Tab State inside the tool modal: 'tracking' | 'agencies' | 'simulator'
  const [activeTab, setActiveTab] = useState("tracking");

  // Show tool modal overlay
  const [showToolModal, setShowToolModal] = useState(false);

  // Active step slider index: 1 to 5 (Bottom pagination indicator)
  const [carouselIndex, setCarouselIndex] = useState(1);

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
        setTrackError(isAr ? "لم نجد أي شحنة بهذا الرقم" : "Aucun colis trouvé");
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
    const baseRate = serviceType === "express" ? 35 : 20;
    const total = baseRate + weight * 5;
    setEstimatedPrice(total);
  }

  const cities = Array.from(new Set(agencies.map(a => a.city).filter(Boolean)));

  // 5 Step Steps for the right sidebar carousel
  const steps = [
    { id: 1, title: isAr ? "دفع الطرود" : "Dépôt colis", desc: isAr ? "استلام الطرود وتسجيلها بالباركود" : "Réception et enregistrement" },
    { id: 2, title: isAr ? "الفرز والتعبئة" : "Tri & Emballage", desc: isAr ? "تجهيز وتغليف الشحنات" : "Préparation et emballage" },
    { id: 3, title: isAr ? "الشحن البري" : "Transport routier", desc: isAr ? "انطلاق شاحنات النقل" : "Expédition et camionnage" },
    { id: 4, title: isAr ? "الوصول للوجهة" : "Arrivée agence", desc: isAr ? "توزيع الشحنات بالوكالات" : "Arrivée et notifications SMS" },
    { id: 5, title: isAr ? "تسليم الطرد" : "Remise destinataire", desc: isAr ? "التسليم للعميل بالرمز الموثق" : "Livraison finale sécurisée" }
  ];

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="landing-page-wrapper" style={{
      minHeight: "100vh",
      background: "#f3f4f6", // Off-white clean light background matching ChinaLogist
      color: "#1f2937",
      fontFamily: "system-ui, -apple-system, sans-serif",
      margin: 0,
      padding: "20px 40px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxSizing: "border-box"
    }}>
      
      {/* ── 1. NAVBAR (Exact ChinaLogist Replica) ── */}
      <header className="landing-page-header" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 0",
        boxSizing: "border-box"
      }}>
        {/* Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <svg className="logo-lightning-bolt" width="28" height="28" viewBox="0 0 24 24" fill="#3b82f6">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <div>
            <div className="logo-text-shift" style={{ fontSize: "28px", fontWeight: "900", letterSpacing: "-0.04em", lineHeight: "1" }}>Boraq</div>
            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", marginTop: "2px" }}>
              {isAr ? "شحن لوجستي سريع بالمغرب" : "Livraison colis express au Maroc"}
            </div>
          </div>
        </div>

        {/* Central Menu Links (Exact Style: rounded black pill for active link) */}
        <nav className="desktop-nav" style={{
          display: "flex",
          alignItems: "center",
          gap: "28px",
          fontSize: "14px",
          fontWeight: "700"
        }}>
          <button style={{
            background: "#111827",
            color: "#ffffff",
            border: "none",
            padding: "8px 20px",
            borderRadius: "20px",
            fontWeight: "800",
            cursor: "pointer"
          }}>
            {isAr ? "الرئيسية" : "Accueil"}
          </button>
          <button
            onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#4b5563", border: "none", cursor: "pointer", fontWeight: "800" }}
          >
            {isAr ? "تتبع الشحنات" : "Suivi colis"}
          </button>
          <button
            onClick={() => { setActiveTab("agencies"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#4b5563", border: "none", cursor: "pointer", fontWeight: "800" }}
          >
            {isAr ? "الوكالات المعتمدة" : "Nos agences"}
          </button>
          <button
            onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#4b5563", border: "none", cursor: "pointer", fontWeight: "800" }}
          >
            {isAr ? "حاسبة الأسعار" : "Simulateur"}
          </button>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{ background: "transparent", color: "#4b5563", border: "none", cursor: "pointer", fontWeight: "800" }}
          >
            {isAr ? "Français" : "العربية"}
          </button>
        </nav>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Phone Circle button */}
          <a href="tel:+212522000000" style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.03)",
            color: "#111827"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </a>

          {/* Espace Pro Rounded Pill Button */}
          <button
            onClick={onOpenLogin}
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              color: "#111827",
              padding: "10px 24px",
              borderRadius: "30px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "800",
              boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <span>{isAr ? "فضاء الخدامة" : "Espace Pro"}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </header>

      {/* ── 2. SPLIT HERO SECTION (Exact ChinaLogist Layout) ── */}
      <main style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        gap: "40px",
        alignItems: "center",
        width: "100%",
        marginTop: "30px",
        boxSizing: "border-box"
      }} className="responsive-grid-landing">
        
        {/* Left Side: Content Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", textAlign: isAr ? "right" : "left" }}>
          
          <h1 style={{
            fontSize: "clamp(38px, 5.5vw, 68px)",
            fontWeight: "900",
            lineHeight: 1.08,
            color: "#111827",
            margin: 0,
            letterSpacing: "-0.03em"
          }}>
            {isAr ? "نقل وشحن البضائع" : "Transport de marchandises"}<br/>
            {isAr ? "من المغرب إلى أوروبا" : "du Maroc vers l'Europe"}<br/>
            <span style={{ color: "#6b7280" }}>{isAr ? "تسليم مفتاح" : "clé en main"}</span>
          </h1>

          <p style={{ fontSize: "16px", color: "#4b5563", lineHeight: 1.6, margin: 0, maxWidth: "520px" }}>
            {isAr
              ? "نؤمن النقل الدولي للبضائع والسلع والحلول اللوجستية بين المغرب ومختلف الدول الأوروبية مع توفير التتبع والتوثيق المتكامل."
              : "Nous assurons le transport international routier de marchandises et de fret industriel entre le Maroc et l'Europe."}
          </p>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <button
              onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
              style={{
                background: "#111827",
                border: "none",
                color: "#ffffff",
                padding: "16px 36px",
                borderRadius: "30px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "900",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 6px 20px rgba(17,24,39,0.3)"
              }}
            >
              <span>{isAr ? "احسب تسعيرة الشحن" : "Calculer la livraison"}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>

            <button
              onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
              style={{
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.08)",
                color: "#111827",
                padding: "16px 30px",
                borderRadius: "30px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.04)"
              }}
            >
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <span>{isAr ? "تتبع شحنتك" : "Suivre mon colis"}</span>
            </button>
          </div>

        </div>

        {/* Right Column: Clean Interactive Tool Box (Replaces Image 4) */}
        <div style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          border: "1px solid rgba(0,0,0,0.06)",
          width: "100%",
          boxSizing: "border-box"
        }}>
          {/* Tabs Selector */}
          <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px", marginBottom: "20px" }}>
            <button
              onClick={() => setActiveTab("tracking")}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "14px",
                fontWeight: "800",
                color: activeTab === "tracking" ? "#111827" : "#9ca3af",
                borderBottom: activeTab === "tracking" ? "2px solid #111827" : "none",
                paddingBottom: "8px",
                cursor: "pointer"
              }}
            >
              {isAr ? "تتبع الشحنات" : "Suivi Cargo"}
            </button>
            <button
              onClick={() => setActiveTab("simulator")}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "14px",
                fontWeight: "800",
                color: activeTab === "simulator" ? "#111827" : "#9ca3af",
                borderBottom: activeTab === "simulator" ? "2px solid #111827" : "none",
                paddingBottom: "8px",
                cursor: "pointer"
              }}
            >
              {isAr ? "حساب التعريفة" : "Simulateur"}
            </button>
          </div>

          {activeTab === "tracking" ? (
            <div>
              <form onSubmit={handleTrack} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input
                  type="text"
                  value={trackCode}
                  onChange={e => setTrackCode(e.target.value)}
                  placeholder={isAr ? "أدخل رقم التتبع (مثال: BRQ-892)" : "N° de suivi (ex: BRQ-892)"}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1.5px solid #e2e8f0",
                    fontSize: "14px",
                    fontWeight: "600",
                    outline: "none"
                  }}
                />
                <button type="submit" disabled={trackLoading} style={{
                  background: "#111827",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  fontWeight: "800",
                  cursor: "pointer"
                }}>
                  {trackLoading ? "..." : (isAr ? "تتبع الشحنة" : "Rechercher")}
                </button>
              </form>

              {trackError && <div style={{ color: "#ef4444", fontSize: "13px", fontWeight: "700", marginTop: "10px" }}>{trackError}</div>}

              {trackResult && (
                <div style={{ marginTop: "16px", padding: "14px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontWeight: "800" }}>{trackResult.tracking_number}</span>
                    <span style={{ color: "#10b981", fontWeight: "700" }}>{trackResult.status}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    <div><b>{isAr ? "المرسل إليه:" : "Destinataire:"}</b> {trackResult.receiver_name}</div>
                    <div><b>{isAr ? "المدينة:" : "Ville:"}</b> {trackResult.origin}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <form onSubmit={handleSimulate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#6b7280" }}>{isAr ? "وزن الحمولة (كلغ):" : "Poids (kg):"}</label>
                  <input
                    type="number"
                    min="1"
                    value={weight}
                    onChange={e => setWeight(parseInt(e.target.value) || 1)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #e2e8f0", marginTop: "4px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#6b7280" }}>{isAr ? "نوع الشحن:" : "Mode d'expédition:"}</label>
                  <select
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #e2e8f0", marginTop: "4px" }}
                  >
                    <option value="express">{isAr ? "شحن سريع" : "Express (Route)"}</option>
                    <option value="standard">{isAr ? "شحن عادي" : "Standard"}</option>
                  </select>
                </div>
                <button type="submit" style={{
                  background: "#111827",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  fontWeight: "800",
                  cursor: "pointer"
                }}>
                  {isAr ? "احسب السعر" : "Calculer"}
                </button>
              </form>

              {estimatedPrice !== null && (
                <div style={{ marginTop: "14px", padding: "10px", borderRadius: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontWeight: "800", display: "flex", justifyContent: "space-between" }}>
                  <span>{isAr ? "التسعيرة التقريبية:" : "Prix Estimé:"}</span>
                  <span>{estimatedPrice} MAD</span>
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {/* ── 3. BOTTOM SLIDER PROCESS INDICATOR (Exact ChinaLogist Style) ── */}
      <footer className="landing-page-footer" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "20px 0 10px 0",
        borderTop: "1px solid rgba(0,0,0,0.08)",
        marginTop: "40px",
        boxSizing: "border-box"
      }}>
        {/* Left Side: Numeric Indicator 01 / 05 */}
        <div style={{ fontSize: "14px", fontWeight: "800", color: "#6b7280" }}>
          <span style={{ color: "#111827", fontSize: "16px", fontWeight: "900" }}>0{carouselIndex}</span> / 05
        </div>

        {/* Center: Horizontal Slide steps */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255,255,255,0.7)",
          padding: "6px 12px",
          borderRadius: "24px",
          border: "1px solid rgba(0,0,0,0.05)"
        }} className="desktop-only-table">
          {steps.map(s => {
            const isActive = carouselIndex === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setCarouselIndex(s.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  background: isActive ? "#ffffff" : "transparent",
                  color: isActive ? "#111827" : "#4b5563",
                  fontWeight: "800",
                  fontSize: "12px",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>{s.id}. {s.title}</span>
                {isActive && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: Directional Arrow buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setCarouselIndex(prev => Math.max(1, prev - 1))}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>

          <button
            onClick={() => setCarouselIndex(prev => Math.min(5, prev + 1))}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </footer>

      {/* ── 4. POPUP TOOL MODAL OVERLAY (For Clean interactive tracking/agencies panels) ── */}
      {showToolModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(17, 24, 39, 0.4)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "24px",
            width: "100%",
            maxWidth: "600px",
            padding: "30px",
            boxShadow: "0 25px 70px rgba(0,0,0,0.15)",
            position: "relative",
            textAlign: isAr ? "right" : "left"
          }}>
            {/* Modal Header Tabs */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px", borderBottom: "1px solid #f1f5f9", paddingBottom: "14px" }}>
              <button
                onClick={() => setActiveTab("tracking")}
                style={{
                  background: "transparent",
                  border: "none",
                  paddingBottom: "8px",
                  fontSize: "15px",
                  fontWeight: "800",
                  color: activeTab === "tracking" ? "#111827" : "#64748b",
                  borderBottom: activeTab === "tracking" ? "2.5px solid #111827" : "none",
                  cursor: "pointer"
                }}
              >
                {isAr ? "تتبع الشحنة" : "Suivi de colis"}
              </button>
              <button
                onClick={() => setActiveTab("agencies")}
                style={{
                  background: "transparent",
                  border: "none",
                  paddingBottom: "8px",
                  fontSize: "15px",
                  fontWeight: "800",
                  color: activeTab === "agencies" ? "#111827" : "#64748b",
                  borderBottom: activeTab === "agencies" ? "2.5px solid #111827" : "none",
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
                  color: activeTab === "simulator" ? "#111827" : "#64748b",
                  borderBottom: activeTab === "simulator" ? "2.5px solid #111827" : "none",
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
                  background: "#f1f5f9",
                  border: "none",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                    placeholder={isAr ? "أدخل رقم التتبع (مثال: BRQ-0917629)" : "Entrez votre numéro de suivi (ex: BRQ-0917629)"}
                    style={{
                      flex: 1,
                      padding: "14px 18px",
                      borderRadius: "12px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      fontWeight: "700",
                      outline: "none"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={trackLoading}
                    style={{
                      background: "#111827",
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

                {trackError && <div style={{ color: "#ef4444", fontSize: "14px", fontWeight: "700", marginTop: "14px" }}>{trackError}</div>}

                {trackResult && (
                  <div style={{ marginTop: "20px", padding: "18px", borderRadius: "14px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontWeight: "900", color: "#111827" }}>{trackResult.tracking_number}</span>
                      <span style={{ color: "#10b981", fontWeight: "800" }}>{trackResult.status}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>
                      <div><b>{isAr ? "المستلم:" : "Destinataire:"}</b> {trackResult.receiver_name}</div>
                      <div><b>{isAr ? "الوجهة:" : "Origine:"}</b> {trackResult.origin}</div>
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
                    border: "1.5px solid #cbd5e1",
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
                        <div key={a.id} style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                          <div style={{ fontWeight: "800", color: "#111827" }}>{a.name}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{a.city} {a.phone ? `| Tél: ${a.phone}` : ""}</div>
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
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>{isAr ? "وزن الطرد (كلغ):" : "Poids (kg):"}</label>
                    <input
                      type="number"
                      min="1"
                      value={weight}
                      onChange={e => setWeight(parseInt(e.target.value) || 1)}
                      style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #cbd5e1", fontWeight: "700", marginTop: "4px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>{isAr ? "نوع الشحن:" : "Type d'expédition:"}</label>
                    <select
                      value={serviceType}
                      onChange={e => setServiceType(e.target.value)}
                      style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #cbd5e1", fontWeight: "700", marginTop: "4px" }}
                    >
                      <option value="express">{isAr ? "سريع (24 ساعة)" : "Express (24H)"}</option>
                      <option value="standard">{isAr ? "عادي (48 ساعة)" : "Standard (48H)"}</option>
                    </select>
                  </div>
                  <button type="submit" style={{ background: "#111827", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", cursor: "pointer" }}>
                    {isAr ? "احسب السعر" : "Calculer"}
                  </button>
                </form>

                {estimatedPrice !== null && (
                  <div style={{ marginTop: "18px", padding: "14px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontWeight: "800", display: "flex", justifyContent: "space-between" }}>
                    <span>{isAr ? "التسعيرة المقدرة للمغرب:" : "Prix d'envoi estimé:"}</span>
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
