import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Tab State inside tools panel modal: 'tracking' | 'agencies' | 'simulator'
  const [activeTab, setActiveTab] = useState("tracking");

  // Show interactive tracking panel overlay
  const [showToolModal, setShowToolModal] = useState(false);

  // Bottom/Slide Section indicator: 1 | 2 | 3 (For the cinematic showcase sections)
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
        setTrackError(isAr ? "لم نجد أي طرد بهذا الرقم" : "Aucun colis trouvé");
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

  // Mock floating dispatch items for interactive preview grid (Section 2 & 3)
  const floatWidgets = [
    { label: "EXPEDITION", val: "Tanger ➔ Casablanca", color: "#10b981", time: "14:32" },
    { label: "STATUS", val: "En route - Camion Connecté", color: "#a855f7", time: "En direct" },
    { label: "SMS SENT", val: "Alerte récepteur envoyé", color: "#f59e0b", time: "14:35" }
  ];

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: "#080710", // Ultra premium dark cinematic background
      color: "#f3f4f6",
      fontFamily: "system-ui, -apple-system, sans-serif",
      margin: 0,
      padding: "20px 40px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxSizing: "border-box",
      overflowX: "hidden",
      position: "relative"
    }}>
      
      {/* ── 3D Textured stones atmospheric background elements ── */}
      <div style={{
        position: "absolute",
        top: "15%",
        left: "5%",
        width: "120px",
        height: "120px",
        background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(20px)",
        pointerEvents: "none",
        zIndex: 1
      }} />
      <div style={{
        position: "absolute",
        bottom: "20%",
        right: "8%",
        width: "180px",
        height: "180px",
        background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(30px)",
        pointerEvents: "none",
        zIndex: 1
      }} />

      {/* ── 1. CINEMATIC GLASS HEADER NAVBAR ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 0",
        boxSizing: "border-box",
        zIndex: 10,
        position: "relative"
      }}>
        {/* Logo and Subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #a855f7, #6366f1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(168,85,247,0.4)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff", letterSpacing: "-0.02em" }}>BoraqLogist</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700" }}>
              {isAr ? "شحن لوجستي سريع بالمغرب" : "Livraison colis express au Maroc"}
            </div>
          </div>
        </div>

        {/* Central Rounded Navigation Pill */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255,255,255,0.06)",
          padding: "6px 8px",
          borderRadius: "30px",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)"
        }} className="desktop-only-table">
          <button
            onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
            style={{ background: "#ffffff", color: "#080710", border: "none", padding: "8px 20px", borderRadius: "20px", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
          >
            {isAr ? "تتبع الشحنات" : "Suivi colis"}
          </button>
          <button
            onClick={() => { setActiveTab("agencies"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#cbd5e1", border: "none", padding: "8px 18px", borderRadius: "20px", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
          >
            {isAr ? "الوكالات" : "Nos Agences"}
          </button>
          <button
            onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#cbd5e1", border: "none", padding: "8px 18px", borderRadius: "20px", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
          >
            {isAr ? "الأسعار" : "Tarifs"}
          </button>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{ background: "transparent", color: "#cbd5e1", border: "none", padding: "8px 18px", borderRadius: "20px", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
          >
            {isAr ? "Français" : "العربية"}
          </button>
        </nav>

        {/* Right CTA Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Phone Circle button */}
          <a href="tel:+212522000000" style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#ffffff"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </a>

          {/* Calculate Delivery button */}
          <button
            onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              padding: "10px 24px",
              borderRadius: "30px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <span>{isAr ? "احسب تسعيرة الشحن" : "Calculer mon tarif"}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>

          {/* Espace Pro Pill */}
          <button
            onClick={onOpenLogin}
            style={{
              background: "linear-gradient(135deg, #fd9a63 0%, #a855f7 100%)",
              border: "none",
              color: "#ffffff",
              padding: "10px 24px",
              borderRadius: "30px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "800",
              boxShadow: "0 4px 18px rgba(253,154,99,0.4)"
            }}
          >
            <span>{isAr ? "فضاء الخدامة" : "Espace Pro"}</span>
          </button>
        </div>
      </header>

      {/* ── 2. TWO-COLUMN SPLIT HERO SECTION WITH DYNAMIC GRAPHICS (Subject & Scene) ── */}
      <main style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        gap: "40px",
        alignItems: "center",
        width: "100%",
        marginTop: "30px",
        boxSizing: "border-box",
        zIndex: 5,
        position: "relative"
      }} className="responsive-grid-landing">
        
        {/* LEFT COLUMN: SLEEK CONTRAST MODERN TYPOGRAPHY & TRANSITIONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", textAlign: isAr ? "right" : "left" }}>
          
          {carouselIndex === 1 && (
            <div style={{ animation: "fadeInUp 0.6s ease" }}>
              <div style={{ display: "inline-flex", padding: "6px 14px", borderRadius: "20px", background: "rgba(168,85,247,0.15)", color: "#c084fc", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", marginBottom: "16px" }}>
                SECTION 1 / 3 ✦ FAST DELIVERY ROUTES
              </div>
              <h1 style={{ fontSize: "clamp(34px, 5.5vw, 60px)", fontWeight: "900", lineHeight: 1.08, color: "#ffffff", margin: 0, letterSpacing: "-0.03em" }}>
                {isAr ? "توصيل طرود البضائع" : "Livraison de colis"}<br/>
                {isAr ? "بـ كود موحد بالمغرب" : "au Maroc"}<br/>
                <span style={{ color: "#a855f7" }}>boraq.online</span>
              </h1>
            </div>
          )}

          {carouselIndex === 2 && (
            <div style={{ animation: "fadeInUp 0.6s ease" }}>
              <div style={{ display: "inline-flex", padding: "6px 14px", borderRadius: "20px", background: "rgba(99,102,241,0.15)", color: "#818cf8", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", marginBottom: "16px" }}>
                SECTION 2 / 3 ✦ BORAQ REVOLUTION
              </div>
              <h1 style={{ fontSize: "clamp(34px, 5.5vw, 60px)", fontWeight: "900", lineHeight: 1.08, color: "#ffffff", margin: 0, letterSpacing: "-0.03em" }}>
                Revolutionizing<br/>
                Delivery & Logistics<br/>
                <span style={{ color: "#6366f1" }}>with Boraq</span>
              </h1>
            </div>
          )}

          {carouselIndex === 3 && (
            <div style={{ animation: "fadeInUp 0.6s ease" }}>
              <div style={{ display: "inline-flex", padding: "6px 14px", borderRadius: "20px", background: "rgba(253,154,99,0.15)", color: "#fdba74", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", marginBottom: "16px" }}>
                SECTION 3 / 3 ✦ START ORDER
              </div>
              <h1 style={{ fontSize: "clamp(34px, 5.5vw, 60px)", fontWeight: "900", lineHeight: 1.08, color: "#ffffff", margin: 0, letterSpacing: "-0.03em" }}>
                Your Next Fast<br/>
                Delivery Starts Here<br/>
                <span style={{ color: "#fd9a63" }}>with boraq.online</span>
              </h1>
            </div>
          )}

          <p style={{ fontSize: "16px", color: "#94a3b8", lineHeight: 1.6, margin: 0, maxWidth: "520px" }}>
            {isAr
              ? "نقل وتغليف الطرود، تتبع مباشر عبر خريطة GPS المباشرة، إشعارات تلقائية للهاتف، وحلول متطورة لضمان وصول شحنتك بـ أمان."
              : "Prise en charge, emballage sécurisé, suivi GPS en direct de vos camions, notifications SMS automatiques et livraison garantie."}
          </p>

          {/* Primary Action Buttons */}
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <button
              onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
              style={{
                background: "linear-gradient(135deg, #a855f7, #6366f1)",
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
                boxShadow: "0 6px 20px rgba(168,85,247,0.4)"
              }}
            >
              <span>{isAr ? "تتبع طردك الآن" : "Suivre mon colis"}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>

            <button
              onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffffff",
                padding: "16px 30px",
                borderRadius: "30px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <span>{isAr ? "كيف نعمل ؟" : "Comment ça marche"}</span>
            </button>
          </div>

          {/* 4 Feature Icons Badge Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: "14px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "24px",
            marginTop: "10px"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <div style={{ fontSize: "12px", fontWeight: "900", color: "#cbd5e1" }}>{isAr ? "نقل سريع" : "Transport rapide"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <div style={{ fontSize: "12px", fontWeight: "900", color: "#cbd5e1" }}>{isAr ? "تغليف مؤمن" : "Emballage sécurisé"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fd9a63" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <div style={{ fontSize: "12px", fontWeight: "900", color: "#cbd5e1" }}>{isAr ? "وثيقة موحدة" : "Code-barres unique"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <div style={{ fontSize: "12px", fontWeight: "900", color: "#cbd5e1" }}>{isAr ? "توصيل للوجهة" : "Arrivée garantie"}</div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: 3D ENVIRONMENT SHOWCASE CARD WITH FLOATING UI WIDGETS */}
        <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          
          {/* Main 3D Framed Showcase Image */}
          <div style={{
            borderRadius: "32px",
            overflow: "hidden",
            width: "100%",
            height: "440px",
            boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            position: "relative"
          }}>
            <img src="/boraq_3d_truck.jpg" alt="Boraq Logistics Showcase" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            
            {/* Interactive glass bottom dispatch timeline bar inside the container */}
            <div style={{
              position: "absolute",
              bottom: "16px",
              left: "16px",
              right: "16px",
              background: "rgba(8, 7, 16, 0.75)",
              backdropFilter: "blur(16px)",
              borderRadius: "20px",
              padding: "16px",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxSizing: "border-box"
            }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "900", color: "#a855f7", textTransform: "uppercase" }}>STATUS REPORT</span>
                <div style={{ fontSize: "14px", fontWeight: "900", color: "#ffffff" }}>Tanger ➔ Casablanca</div>
              </div>
              <span style={{ fontSize: "12px", fontWeight: "800", color: "#10b981", background: "rgba(16,185,129,0.15)", padding: "4px 10px", borderRadius: "12px" }}>
                En Route
              </span>
            </div>
          </div>

          {/* Floating UI Widget 1: Real-time Dispatch Info (Fades & Fleshes over) */}
          <div style={{
            position: "absolute",
            top: "30px",
            left: "-20px",
            background: "rgba(10, 15, 29, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            padding: "14px 18px",
            boxShadow: "0 15px 30px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            animation: "floatSlow 4s ease-in-out infinite",
            zIndex: 10
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
            <div>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "800" }}>DISPATCH GPS</div>
              <div style={{ fontSize: "13px", fontWeight: "900", color: "#fff" }}>Camion Connecté 2026</div>
            </div>
          </div>

          {/* Floating UI Widget 2: Fast Shipping Options (Fades & Fleshes over) */}
          <div style={{
            position: "absolute",
            bottom: "80px",
            right: "-20px",
            background: "rgba(10, 15, 29, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            padding: "14px 18px",
            boxShadow: "0 15px 30px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            animation: "floatSlow 4s ease-in-out infinite 2s",
            zIndex: 10
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <div>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "800" }}>EXPRESS DELIVERY</div>
              <div style={{ fontSize: "13px", fontWeight: "900", color: "#fff" }}>Livraison sous 24H</div>
            </div>
          </div>

        </div>

      </main>

      {/* ── 3. BOTTOM CAROUSEL TIMELINE BAR & DIRECTIONAL NAVIGATION ── */}
      <footer style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "20px 0 10px 0",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        marginTop: "40px",
        boxSizing: "border-box",
        zIndex: 5,
        position: "relative"
      }}>
        {/* Left Side: Numeric Indicator 01 to 03 */}
        <div style={{ fontSize: "14px", fontWeight: "800", color: "#94a3b8" }}>
          <span style={{ color: "#ffffff", fontSize: "16px", fontWeight: "900" }}>0{carouselIndex}</span> / 03
        </div>

        {/* Center: Horizontal Slide Timeline Pills */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255,255,255,0.04)",
          padding: "6px 12px",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.08)"
        }} className="desktop-only-table">
          <div
            onClick={() => setCarouselIndex(1)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              background: carouselIndex === 1 ? "rgba(255,255,255,0.1)" : "transparent",
              color: carouselIndex === 1 ? "#ffffff" : "#94a3b8",
              fontWeight: "800",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            01. Fast Routes
          </div>
          <div
            onClick={() => setCarouselIndex(2)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              background: carouselIndex === 2 ? "rgba(255,255,255,0.1)" : "transparent",
              color: carouselIndex === 2 ? "#ffffff" : "#94a3b8",
              fontWeight: "800",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            02. Boraq Revolution
          </div>
          <div
            onClick={() => setCarouselIndex(3)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              background: carouselIndex === 3 ? "rgba(255,255,255,0.1)" : "transparent",
              color: carouselIndex === 3 ? "#ffffff" : "#94a3b8",
              fontWeight: "800",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            03. Final Call
          </div>
        </div>

        {/* Right Side: Directional Navigation buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setCarouselIndex(prev => Math.max(1, prev - 1))}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>

          <button
            onClick={() => setCarouselIndex(prev => Math.min(3, prev + 1))}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff"
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
          background: "rgba(8, 7, 16, 0.6)",
          backdropFilter: "blur(16px)",
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
            border: "1.5px solid rgba(255, 255, 255, 0.12)",
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
                  borderBottom: activeTab === "tracking" ? "2.5px solid #a855f7" : "none",
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
                  color: activeTab === "agencies" ? "#ffffff" : "#94a3b8",
                  borderBottom: activeTab === "agencies" ? "2.5px solid #a855f7" : "none",
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
                  borderBottom: activeTab === "simulator" ? "2.5px solid #a855f7" : "none",
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
                    placeholder={isAr ? "أدخل رقم التتبع (مثال: BRQ-0917629)" : "Entrez votre numéro de suivi (ex: BRQ-0917629)"}
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
                      background: "linear-gradient(135deg, #a855f7, #6366f1)",
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
                      <span style={{ fontWeight: "900", color: "#a855f7" }}>{trackResult.tracking_number}</span>
                      <span style={{ color: "#10b981", fontWeight: "800" }}>{trackResult.status}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#94a3b8" }}>
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
                  <button type="submit" style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", cursor: "pointer" }}>
                    {isAr ? "احسب السعر" : "Calculer"}
                  </button>
                </form>

                {estimatedPrice !== null && (
                  <div style={{ marginTop: "18px", padding: "14px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontWeight: "800", display: "flex", justifyContent: "space-between" }}>
                    <span>{isAr ? "التسعيرة المقدرة للمغرب:" : "Prix d'envoi estimé:"}</span>
                    <span>{estimatedPrice} MAD</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mini styles block for animation routines */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>

    </div>
  );
}
