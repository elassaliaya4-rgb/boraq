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
      
      {/* ── NAVBAR ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxSizing: "border-box",
        marginBottom: "30px"
      }}>
        {/* Brand Logo */}
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

        {/* Central Nav Links */}
        <nav className="desktop-nav" style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          fontSize: "13px",
          fontWeight: "700"
        }}>
          <button
            onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontWeight: "700" }}
          >
            {isAr ? "تتبع الشحنات" : "Suivi Cargo"}
          </button>
          <button
            onClick={() => { setActiveTab("agencies"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontWeight: "700" }}
          >
            {isAr ? "وكالاتنا" : "Nos agences"}
          </button>
          <button
            onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontWeight: "700" }}
          >
            {isAr ? "الأسعار" : "Simulation"}
          </button>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontWeight: "700" }}
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

      {/* ── 6-SLIDES COHESIVE PRESENTATION GRID (Replica of the mockup) ── */}
      <main style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
        gap: "24px",
        width: "100%",
        boxSizing: "border-box"
      }} className="responsive-grid-landing">
        
        {/* ── SLIDE 1: HERO / COVER PANEL ── */}
        <div style={{
          height: "360px",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.06)"
        }} className="tilt-card-3d">
          <img src="/boraq_truck.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
          
          {/* Header elements inside slide */}
          <div style={{ position: "absolute", top: "20px", left: "20px", right: "20px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
            <span>{isAr ? "الوكالات المعتمدة" : "Ain Sebaa, Casablanca"}</span>
            <span>+212 522 000 000</span>
          </div>

          <div style={{
            position: "absolute",
            bottom: "30px",
            left: "30px",
            right: "30px",
            textAlign: isAr ? "right" : "left"
          }}>
            {/* Slide Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", letterSpacing: "-0.03em" }}>Boraq</span>
              <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700" }}>Transport & Logistics</span>
            </div>
            
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
              {isAr ? "حمولتكم، مسؤوليتنا" : "Votre cargaison, notre responsabilité"}
            </h2>
          </div>
        </div>

        {/* ── SLIDE 2: ABOUT US PANEL ── */}
        <div style={{
          height: "360px",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "30px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: isAr ? "right" : "left"
        }} className="tilt-card-3d">
          <img src="/boraq_ship.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, position: "absolute", top: 0, left: 0, zIndex: 1 }} />
          
          <div style={{ zIndex: 2, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#3b82f6", fontWeight: "800", textTransform: "uppercase", marginBottom: "10px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
              {isAr ? "من نحن" : "À propos de nous"}
            </div>
            
            <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", margin: "0 0 16px 0" }}>
              {isAr ? "ضمان الموثوقية والدقة اللوجستية" : "Garant de confiance & précision"}
            </h3>
            
            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6, margin: 0, maxWidth: "440px" }}>
              {isAr
                ? "لأكثر من 10 سنوات، تعمل البراق كشريك معتمد لوجستياً بين المغرب وأوروبا لنقل حمولات البضائع والحلول التجارية المتكاملة والآمنة."
                : "Depuis plus de 10 ans, Boraq assure des liaisons logistiques quotidiennes entre le Maroc et l'Europe pour le transport de marchandises industrielles."}
            </p>
          </div>

          <div style={{ zIndex: 2, position: "relative", fontSize: "11px", color: "#64748b" }}>
            BORAQ LOGISTICS INTERNATIONAL
          </div>
        </div>

        {/* ── SLIDE 3: ENGAGEMENTS / TRUST PANEL ── */}
        <div style={{
          height: "360px",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "30px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: isAr ? "right" : "left"
        }} className="tilt-card-3d">
          <img src="/boraq_train.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, position: "absolute", top: 0, left: 0, zIndex: 1 }} />
          
          <div style={{ zIndex: 2, position: "relative" }}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", margin: "0 0 18px 0" }}>
              {isAr ? "لماذا يثق بنا العملاء؟" : "Pourquoi nous faire confiance?"}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12px" }}>
              <div>
                <div style={{ fontWeight: "800", color: "#3b82f6", marginBottom: "4px" }}>{isAr ? "أسعار معقولة" : "Prix abordable"}</div>
                <div style={{ color: "#94a3b8" }}>{isAr ? "تعريفات تنافسية للغاية" : "Tarifs optimisés"}</div>
              </div>
              <div>
                <div style={{ fontWeight: "800", color: "#3b82f6", marginBottom: "4px" }}>{isAr ? "سرعة التوصيل" : "Vitesse d'expédition"}</div>
                <div style={{ color: "#94a3b8" }}>{isAr ? "التزام تام بالمواعيد" : "Respect strict des délais"}</div>
              </div>
              <div>
                <div style={{ fontWeight: "800", color: "#3b82f6", marginBottom: "4px" }}>{isAr ? "تتبع ذكي" : "Suivi en temps réel"}</div>
                <div style={{ color: "#94a3b8" }}>{isAr ? "تتبع فوري ومستمر" : "Traçabilité par code-barres"}</div>
              </div>
              <div>
                <div style={{ fontWeight: "800", color: "#3b82f6", marginBottom: "4px" }}>{isAr ? "مرونة لوجستية" : "Haute flexibilité"}</div>
                <div style={{ color: "#94a3b8" }}>{isAr ? "حلول نقل مخصصة" : "Flotte de véhicules adaptée"}</div>
              </div>
            </div>
          </div>

          <div style={{ zIndex: 2, position: "relative", fontSize: "11px", color: "#3b82f6", fontWeight: "700" }}>
            {isAr ? "موثوقية الشحن والتتبع ➔" : "Fiabilité de transport & traçabilité ➔"}
          </div>
        </div>

        {/* ── SLIDE 4: SERVICES / DESTINATIONS PANEL ── */}
        <div style={{
          height: "360px",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "30px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: isAr ? "right" : "left"
        }} className="tilt-card-3d">
          <img src="/boraq_plane.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, position: "absolute", top: 0, left: 0, zIndex: 1 }} />
          
          <div style={{ zIndex: 2, position: "relative" }}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", margin: "0 0 16px 0" }}>
              {isAr ? "خدمات النقل الدولي" : "Nos services logistiques"}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontWeight: "800", color: "#ffffff" }}>Transport FTL / LTL</div>
                <span style={{ color: "#94a3b8" }}>{isAr ? "شحن حمولات كاملة ومجزأة" : "Camion complet et groupage"}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontWeight: "800", color: "#ffffff" }}>Express Delivery</div>
                <span style={{ color: "#94a3b8" }}>{isAr ? "توصيل سريع مستعجل" : "Expéditions prioritaires"}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontWeight: "800", color: "#ffffff" }}>Multimodal Transit</div>
                <span style={{ color: "#94a3b8" }}>{isAr ? "شحن بري بحري وجوي" : "Routier, mer et air combinés"}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontWeight: "800", color: "#ffffff" }}>Outsourcing</div>
                <span style={{ color: "#94a3b8" }}>{isAr ? "إدارة وتخزين لوجستي" : "Entreposage et logistique"}</span>
              </div>
            </div>
          </div>

          <div style={{ zIndex: 2, position: "relative", fontSize: "11px", color: "#64748b" }}>
            {isAr ? "نعمل بين المغرب وأوروبا" : "Réseau Maroc vers l'Europe"}
          </div>
        </div>

        {/* ── SLIDE 5: CARGO TYPES PANEL ── */}
        <div style={{
          height: "360px",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "30px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: isAr ? "right" : "left"
        }} className="tilt-card-3d">
          <img src="/boraq_ship.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, position: "absolute", top: 0, left: 0, zIndex: 1 }} />
          
          <div style={{ zIndex: 2, position: "relative" }}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", margin: "0 0 6px 0" }}>
              {isAr ? "ننقل 99% من أنواع البضائع" : "Nous transportons 99% du fret"}
            </h3>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              {isAr ? "تصنيف حمولات الشحن الصناعي والتجاري" : "Classification de chargement industriel"}
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "18px" }}>
              {["Liquide", "Dangereux", "Inflammable", "Fragile", "Lourd", "Vrac"].map(c => (
                <div key={c} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "12px 6px",
                  borderRadius: "8px",
                  textAlign: "center",
                  fontSize: "12px",
                  fontWeight: "700"
                }}>
                  {c}
                </div>
              ))}
            </div>
          </div>

          <div style={{ zIndex: 2, position: "relative", fontSize: "11px", color: "#64748b" }}>
            COMPLIANCE ET NORMES INTERNATIONALES
          </div>
        </div>

        {/* ── SLIDE 6: CONTACTS PANEL ── */}
        <div style={{
          height: "360px",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "30px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: isAr ? "right" : "left"
        }} className="tilt-card-3d">
          <img src="/boraq_truck.jpg" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, position: "absolute", top: 0, left: 0, zIndex: 1 }} />
          
          <div style={{ zIndex: 2, position: "relative" }}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", margin: "0 0 16px 0" }}>
              {isAr ? "اتصل بنا" : "Contacts & Dépôts"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#cbd5e1" }}>
              <div>
                <b>📍 {isAr ? "المقر الرئيسي:" : "Siège:"}</b> Ain Sebaa, Casablanca, Maroc
              </div>
              <div>
                <b>📞 {isAr ? "الهاتف:" : "Tél:"}</b> +212 522 000 000
              </div>
              <div>
                <b>✉️ {isAr ? "البريد الإلكتروني:" : "Email:"}</b> contact@boraq.online
              </div>
              <div>
                <b>🌐 {isAr ? "الفروع الدولية:" : "Dépôts:"}</b> France, Espagne, Italie
              </div>
            </div>
          </div>

          <div style={{ zIndex: 2, position: "relative" }}>
            <button
              onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
              style={{
                background: "#3b82f6",
                color: "#ffffff",
                border: "none",
                padding: "8px 24px",
                borderRadius: "20px",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(59,130,246,0.3)"
              }}
            >
              {isAr ? "تتبع شحنتك الآن ➔" : "Suivre mon cargo ➔"}
            </button>
          </div>
        </div>

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
