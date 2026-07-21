import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Tab State inside the tracking panel modal: 'tracking' | 'agencies' | 'simulator'
  const [activeTab, setActiveTab] = useState("tracking");

  // Show interactive tracking panel overlay
  const [showToolModal, setShowToolModal] = useState(false);

  // Bottom carousel index: 01 to 05 (matching the screenshot bottom indicator)
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

  // 5 Step Steps for the right sidebar carousel
  const steps = [
    { id: 1, title: isAr ? "دفع الطرود" : "Dépôt colis", desc: isAr ? "استلام الطرود وتسجيلها بالباركود" : "Réception et enregistrement" },
    { id: 2, title: isAr ? "الفرز والتعبئة" : "Tri & Emballage", desc: isAr ? "تجهيز وتغليف الشحنات" : "Préparation et emballage" },
    { id: 3, title: isAr ? "الشحن البري" : "Transport routier", desc: isAr ? "انطلاق شاحنات النقل" : "Expédition et camionnage" },
    { id: 4, title: isAr ? "الوصول للوجهة" : "Arrivée agence", desc: isAr ? "توزيع الشحنات بالوكالات" : "Arrivée et notifications SMS" },
    { id: 5, title: isAr ? "تسليم الطرد" : "Remise destinataire", desc: isAr ? "التسليم للعميل بالرمز الموثق" : "Livraison finale sécurisée" }
  ];

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: "#f0f2f5",
      color: "#1e293b",
      fontFamily: "system-ui, -apple-system, sans-serif",
      margin: 0,
      padding: "20px 40px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxSizing: "border-box"
    }}>
      
      {/* ── 1. ULTRA PREMIUM NAVBAR (ChinaLogist Style) ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 0",
        boxSizing: "border-box"
      }}>
        {/* Logo and Subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: "#111827",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#111827", letterSpacing: "-0.02em" }}>BoraqLogist</div>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
              {isAr ? "شحن لوجستي سريع بالمغرب" : "Livraison colis express au Maroc"}
            </div>
          </div>
        </div>

        {/* Central Rounded Navigation Pill */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "#ffffff",
          padding: "6px 8px",
          borderRadius: "30px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          border: "1px solid rgba(0,0,0,0.03)"
        }} className="desktop-only-table">
          <button
            onClick={() => { setActiveTab("tracking"); setShowToolModal(true); }}
            style={{ background: "#111827", color: "#ffffff", border: "none", padding: "8px 20px", borderRadius: "20px", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
          >
            {isAr ? "تتبع الشحنات" : "Suivi colis"}
          </button>
          <button
            onClick={() => { setActiveTab("agencies"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#64748b", border: "none", padding: "8px 18px", borderRadius: "20px", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
          >
            {isAr ? "الوكالات" : "Nos Agences"}
          </button>
          <button
            onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
            style={{ background: "transparent", color: "#64748b", border: "none", padding: "8px 18px", borderRadius: "20px", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
          >
            {isAr ? "الأسعار" : "Tarifs"}
          </button>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{ background: "transparent", color: "#64748b", border: "none", padding: "8px 18px", borderRadius: "20px", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
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

          {/* Calculate Delivery Rounded Button */}
          <button
            onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
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
            <span>{isAr ? "احسب تسعيرة الشحن" : "Calculer mon tarif"}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>

          {/* Espace Pro Rounded Pill */}
          <button
            onClick={onOpenLogin}
            style={{
              background: "#111827",
              border: "none",
              color: "#ffffff",
              padding: "10px 24px",
              borderRadius: "30px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "800",
              boxShadow: "0 4px 18px rgba(17,24,39,0.3)"
            }}
          >
            <span>{isAr ? "فضاء الخدامة" : "Espace Pro"}</span>
          </button>
        </div>
      </header>

      {/* ── 2. TWO-COLUMN SPLIT HERO SECTION (ChinaLogist Replica) ── */}
      <main style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        gap: "40px",
        alignItems: "center",
        width: "100%",
        marginTop: "30px",
        boxSizing: "border-box"
      }} className="responsive-grid-landing">
        
        {/* LEFT COLUMN: HERO TEXTS & PRIMARY ACTION BUTTONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", textAlign: isAr ? "right" : "left" }}>
          
          <h1 style={{
            fontSize: "clamp(38px, 5.5vw, 68px)",
            fontWeight: "900",
            lineHeight: 1.08,
            color: "#111827",
            margin: 0,
            letterSpacing: "-0.03em"
          }}>
            {isAr ? "توصيل طرود البضائع" : "Livraison de colis"}<br/>
            {isAr ? "بـ كود موحد بالمغرب" : "au Maroc"}<br/>
            <span style={{ color: "#64748b" }}>{isAr ? "تتبع فوري وموثوق" : "clés en main"}</span>

            {/* Micro client badge next to heading */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#ffffff",
              padding: "6px 14px",
              borderRadius: "24px",
              border: "1px solid rgba(0,0,0,0.06)",
              marginLeft: isAr ? "0" : "16px",
              marginRight: isAr ? "16px" : "0",
              fontSize: "13px",
              verticalAlign: "middle"
            }}>
              {/* Stacked tiny driver headshot circles */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <img src="/boraq_packaging.jpg" style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #fff", objectFit: "cover" }} />
                <img src="/boraq_3d_truck.jpg" style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #fff", marginLeft: "-8px", objectFit: "cover" }} />
                <img src="/boraq_map_tracking.jpg" style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #fff", marginLeft: "-8px", objectFit: "cover" }} />
              </div>
              <span style={{ fontWeight: "800", color: "#111827" }}>5000+ {isAr ? "طرد يومياً" : "colis / jour"}</span>
            </div>
          </h1>

          <p style={{ fontSize: "16px", color: "#64748b", lineHeight: 1.6, margin: 0, maxWidth: "520px" }}>
            {isAr
              ? "نقل وتغليف الطرود، تتبع مباشر عبر خريطة GPS المباشرة، إشعارات تلقائية للهاتف، وحلول متطورة لضمان وصول شحنتك بـ أمان."
              : "Prise en charge, emballage sécurisé, suivi GPS en direct de vos camions, notifications SMS automatiques et livraison garantie."}
          </p>

          {/* Primary Action Buttons */}
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
              <span>{isAr ? "تتبع طردك الآن" : "Suivre mon colis"}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>

            <button
              onClick={() => { setActiveTab("simulator"); setShowToolModal(true); }}
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
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <span>{isAr ? "كيف نعمل ؟" : "Comment ça marche"}</span>
            </button>
          </div>

          {/* 4 Feature Badges in Footer Grid of Left Column */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: "14px",
            borderTop: "1px solid rgba(0,0,0,0.08)",
            paddingTop: "24px",
            marginTop: "10px"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <div style={{ fontSize: "12px", fontWeight: "900", color: "#111827" }}>{isAr ? "نقل سريع" : "Transport rapide"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <div style={{ fontSize: "12px", fontWeight: "900", color: "#111827" }}>{isAr ? "تغليف مؤمن" : "Emballage sécurisé"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <div style={{ fontSize: "12px", fontWeight: "900", color: "#111827" }}>{isAr ? "وثيقة موحدة" : "Code-barres unique"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <div style={{ fontSize: "12px", fontWeight: "900", color: "#111827" }}>{isAr ? "توصيل للوجهة" : "Arrivée garantie"}</div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SPLIT CONTAINER WITH HIGH-QUALITY Logistics Image & Overlay Badges */}
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <div style={{
            borderRadius: "32px",
            overflow: "hidden",
            width: "100%",
            height: "480px",
            boxShadow: "0 30px 70px rgba(0,0,0,0.15)",
            border: "6px solid #ffffff"
          }}>
            <img src="/boraq_3d_truck.jpg" alt="Boraq Logistics Deliveries" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* Badge 1: 10+ Years experience (Top Right) */}
          <div style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
            padding: "10px 16px",
            borderRadius: "16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "900", color: "#111827" }}>10+ {isAr ? "سنوات خبرة" : "ans d'excellence"}</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>{isAr ? "الريادة اللوجستية" : "Leader au Maroc"}</div>
            </div>
          </div>

          {/* Badge 2: Delivery to all cities (Bottom Right) */}
          <div style={{
            position: "absolute",
            bottom: "24px",
            right: "24px",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
            padding: "12px 18px",
            borderRadius: "16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <div style={{ fontSize: "13px", fontWeight: "900", color: "#111827" }}>
              {isAr ? "تغطية لكل المدن المغربية" : "Livraison toutes villes"}
            </div>
          </div>
        </div>

      </main>

      {/* ── 3. BOTTOM CAROUSEL TRACKER / STEP BAR & INDICATOR (ChinaLogist Replica) ── */}
      <footer style={{
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
        <div style={{ fontSize: "14px", fontWeight: "800", color: "#64748b" }}>
          <span style={{ color: "#111827", fontSize: "16px", fontWeight: "900" }}>0{carouselIndex}</span> / 05
        </div>

        {/* Center: Horizontal Glass Step List (ChinaLogist Bottom Bar style) */}
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
                  color: isActive ? "#111827" : "#64748b",
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
