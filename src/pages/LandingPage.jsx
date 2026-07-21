import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Active Tool state: 'tracking' | 'agencies' (Simulation tarifaire removed per request)
  const [activeTab, setActiveTab] = useState("tracking");
  
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

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#030712", color: "#f3f4f6", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* ── 2026 Next-Gen Header Navigation Bar ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 36px",
        background: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 500,
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
      }}>
        {/* Brand Logo - Interactive Click to Scroll Top */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: "900", fontSize: "24px", color: "#fff", cursor: "pointer" }}
          title={isAr ? "العودة للأعلى" : "Retour en haut"}
        >
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #38bdf8, #2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(56,189,248,0.5)"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ background: "linear-gradient(135deg, #ffffff 0%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: "22px", fontWeight: "900" }}>
              Boraq
            </span>
            <span style={{ fontSize: "10px", fontWeight: "800", color: "#38bdf8", letterSpacing: "0.15em", marginTop: "3px" }}>
              LOGISTICS
            </span>
          </div>
        </div>

        {/* Clean Spaced Desktop Nav Links */}
        <nav className="desktop-only-table" style={{ display: "flex", alignItems: "center", gap: "36px", fontSize: "14px", fontWeight: "700" }}>
          <a
            href="#hero"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{ color: "#ffffff", textDecoration: "none", transition: "color 0.2s ease" }}
          >
            {isAr ? "الرئيسية" : "Accueil"}
          </a>
          <a
            href="#services"
            style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s ease" }}
            onMouseEnter={e => e.currentTarget.style.color = "#38bdf8"}
            onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}
          >
            {isAr ? "خدماتنا" : "Services"}
          </a>
          <a
            href="#hero-tools"
            onClick={() => scrollToHeroTool("agencies")}
            style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s ease" }}
            onMouseEnter={e => e.currentTarget.style.color = "#38bdf8"}
            onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}
          >
            {isAr ? "شبكة الوكالات" : "Réseau d'Agences"}
          </a>
          <a
            href="#services"
            onClick={() => scrollToHeroTool("tracking")}
            style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s ease" }}
            onMouseEnter={e => e.currentTarget.style.color = "#38bdf8"}
            onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}
          >
            {isAr ? "تتبع الشحنة" : "Suivi de Colis"}
          </a>
        </nav>

        {/* Right Section: Language Toggle & Espace Pro Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#f3f4f6",
              padding: "8px 16px",
              borderRadius: "30px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "800",
              transition: "all 0.2s ease"
            }}
          >
            {isAr ? "Français" : "العربية"}
          </button>

          {/* 2026 Glowing Espace Pro Button */}
          <button
            onClick={onOpenLogin}
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              color: "#ffffff",
              padding: "11px 24px",
              borderRadius: "14px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 0 25px rgba(37, 99, 235, 0.45)",
              transition: "all 0.22s ease"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 0 35px rgba(56, 189, 248, 0.7)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 0 25px rgba(37, 99, 235, 0.45)"; }}
          >
            <div style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <span>{isAr ? "فضاء الخدامة" : "Espace Pro"}</span>
          </button>
        </div>
      </header>

      {/* ── 2026 Next-Gen Hero Banner Section ── */}
      <section id="hero" style={{
        position: "relative",
        padding: "80px 20px 120px",
        backgroundImage: "linear-gradient(180deg, rgba(3, 7, 18, 0.75) 0%, rgba(3, 7, 18, 0.98) 100%), url('/boraq_3d_truck.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        textAlign: "center",
        overflow: "hidden"
      }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          
          {/* Badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 16px",
            borderRadius: "30px",
            background: "rgba(56, 189, 248, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#38bdf8",
            fontSize: "12px",
            fontWeight: "800",
            letterSpacing: "0.08em",
            marginBottom: "20px",
            boxShadow: "0 0 20px rgba(56, 189, 248, 0.2)"
          }}>
            <span>⚡ BORAQ EXPRESS LOGISTICS 2026</span>
          </div>

          <h1 style={{
            fontSize: "clamp(32px, 5.5vw, 58px)",
            fontWeight: "900",
            lineHeight: 1.15,
            marginBottom: "20px",
            background: "linear-gradient(135deg, #ffffff 0%, #e0f2fe 50%, #38bdf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 10px 40px rgba(0,0,0,0.8)"
          }}>
            {isAr ? "شحناتك وبضاعتك بأمان وفخامة إلى جميع المدن" : "Votre colis jusqu'à chez vous."}
          </h1>

          <p style={{ fontSize: "18px", color: "#9ca3af", maxWidth: "700px", margin: "0 auto 48px auto", lineHeight: 1.6 }}>
            {isAr
              ? "البراق للمطابقة واللوجستيك السريع فـ المغرب - تتبع فوري، سرعة فائقة، وشبكة موثوقة عبر كُـل المدن."
              : "Le réseau leader du transport de colis et marchandises au Maroc. Rapidité, sécurité et fiabilité garanties."}
          </p>

          {/* ── 2 Primary Interactive Hero Feature Cards (Simulation Removed) ── */}
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
                borderRadius: "20px",
                background: activeTab === "tracking"
                  ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                  : "rgba(15, 23, 42, 0.85)",
                border: activeTab === "tracking" ? "2px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: activeTab === "tracking" ? "0 12px 35px rgba(2, 132, 199, 0.5)" : "0 4px 20px rgba(0,0,0,0.3)",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                textAlign: "center"
              }}
              onMouseEnter={e => { if (activeTab !== "tracking") e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { if (activeTab !== "tracking") e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px auto"
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
                borderRadius: "20px",
                background: activeTab === "agencies"
                  ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                  : "rgba(15, 23, 42, 0.85)",
                border: activeTab === "agencies" ? "2px solid #f87171" : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: activeTab === "agencies" ? "0 12px 35px rgba(239, 68, 68, 0.5)" : "0 4px 20px rgba(0,0,0,0.3)",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                textAlign: "center"
              }}
              onMouseEnter={e => { if (activeTab !== "agencies") e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { if (activeTab !== "agencies") e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px auto"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#fff" }}>
                {isAr ? "شبكة وكالات البراق" : "Nos agences au Maroc"}
              </h3>
            </div>
          </div>

          {/* ── Dynamic Active Tool Container ── */}
          <div style={{
            marginTop: "32px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: "28px",
            padding: "32px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 30px rgba(56, 189, 248, 0.15)",
            textAlign: isAr ? "right" : "left",
            maxWidth: "760px",
            margin: "32px auto 0 auto"
          }}>
            {/* Tool 1: Suivi de Colis */}
            {activeTab === "tracking" && (
              <div>
                <h3 style={{ margin: "0 0 18px 0", fontSize: "19px", color: "#38bdf8", fontWeight: "800", display: "flex", alignItems: "center", gap: 10 }}>
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
                      border: "1px solid rgba(56, 189, 248, 0.3)",
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
                      background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: "15px",
                      cursor: "pointer",
                      boxShadow: "0 4px 20px rgba(14,165,233,0.4)"
                    }}
                  >
                    {trackLoading ? (isAr ? "جاري البحث..." : "Recherche...") : (isAr ? "تتبع الآن" : "Rechercher")}
                  </button>
                </form>

                {trackError && (
                  <div style={{ marginTop: "18px", padding: "14px 18px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "14px", fontWeight: 600 }}>
                    {trackError}
                  </div>
                )}

                {trackResult && (
                  <div style={{ marginTop: "24px", padding: "22px", borderRadius: "18px", background: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(56, 189, 248, 0.4)", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <span style={{ fontSize: "18px", fontWeight: "900", color: "#38bdf8" }}>{trackResult.tracking_number}</span>
                      <span style={{ fontSize: "13px", fontWeight: "800", padding: "6px 14px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
                        {trackResult.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "14px", color: "#e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                  <h3 style={{ margin: 0, fontSize: "19px", color: "#f87171", fontWeight: "800", display: "flex", alignItems: "center", gap: 10 }}>
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
                        <div key={a.id} style={{ padding: "16px", borderRadius: "16px", background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <div style={{ fontWeight: "800", fontSize: "16px", color: "#fff" }}>{a.name}</div>
                          <div style={{ fontSize: "13px", color: "#38bdf8", marginTop: "4px" }}>{a.city}</div>
                          {a.phone && <div style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>Tél: {a.phone}</div>}
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

      {/* ── 2026 Next-Gen Alternating Service Feature Rows ── */}
      <section id="services" style={{ padding: "90px 24px", background: "#030712" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "80px" }}>
          
          {/* Row 1: Notification Par SMS */}
          <div
            onClick={() => scrollToHeroTool("tracking")}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "44px",
              alignItems: "center",
              cursor: "pointer",
              padding: "32px",
              borderRadius: "28px",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 25px 50px rgba(14,165,233,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ borderRadius: "22px", overflow: "hidden", boxShadow: "0 20px 45px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <img src="/boraq_sms_notif.jpg" alt="Notification SMS Boraq" style={{ width: "100%", height: "280px", objectFit: "cover", display: "block" }} />
            </div>
            <div>
              <div style={{ display: "inline-flex", padding: "6px 16px", borderRadius: "30px", background: "rgba(14,165,233,0.15)", color: "#38bdf8", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", marginBottom: "14px" }}>
                {isAr ? "خدمة التنبيهات المباشرة" : "SERVICE NOTIFICATION LIVE"}
              </div>
              <h2 style={{ fontSize: "26px", fontWeight: "900", color: "#fff", marginBottom: "14px", lineHeight: 1.3 }}>
                NOTIFICATION PAR SMS & PUSH
              </h2>
              <p style={{ fontSize: "15px", color: "#9ca3af", lineHeight: 1.7 }}>
                {isAr
                  ? "تتبع مباشر للطرد عبر إشعارات فورية ورسائل حالة الشحنة لحظة بلحظة. إخبار المستلم بتاريخ الوصول ومكان الاستلام بـ كل سهولة وإتقان!"
                  : "INFORMEZ VOTRE DESTINATAIRE DE LA DATE D'ARRIVÉE ET DU LIEU DE RÉCEPTION DE VOTRE COLIS, EN TOUTE SIMPLICITÉ ! Grâce au service Notification SMS & Live Push de Boraq Logistics."}
              </p>
              <div style={{ marginTop: "20px", color: "#38bdf8", fontWeight: "800", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{isAr ? "جرب تتبع الطرد الآن ➔" : "Essayer le suivi en direct ➔"}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Service Emballage & Fret */}
          <div
            onClick={() => scrollToHeroTool("tracking")}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "44px",
              alignItems: "center",
              cursor: "pointer",
              padding: "32px",
              borderRadius: "28px",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 25px 50px rgba(245,158,11,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div>
              <div style={{ display: "inline-flex", padding: "6px 16px", borderRadius: "30px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", marginBottom: "14px" }}>
                {isAr ? "التغليف والشحن السريع" : "SERVICE EMBALLAGE & FRET"}
              </div>
              <h2 style={{ fontSize: "26px", fontWeight: "900", color: "#fff", marginBottom: "14px", lineHeight: 1.3 }}>
                SERVICE EMBALLAGE EXPRESS
              </h2>
              <p style={{ fontSize: "15px", color: "#9ca3af", lineHeight: 1.7 }}>
                {isAr
                  ? "حلول تغليف متينة ومجهزة خصيصاً لـ حماية جميع أنواع الطرود والبضائع فـ وكالاتنا. كُـل شحنة محمية بـ كود باركود فريد يضمن وصولها سالمة فـ الوقت المحدد!"
                  : "Avec les nouvelles solutions d'emballages Boraq Logistics, vous disposez d'un large choix de formats d'emballages résistants et adaptés à tous vos envois dans nos agences agréées."}
              </p>
              <div style={{ marginTop: "20px", color: "#f59e0b", fontWeight: "800", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{isAr ? "تصفح خدمات التغليف والشحن ➔" : "Découvrir nos solutions emballage ➔"}</span>
              </div>
            </div>
            <div style={{ borderRadius: "22px", overflow: "hidden", boxShadow: "0 20px 45px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <img src="/boraq_packaging.jpg" alt="Service Emballage Boraq" style={{ width: "100%", height: "280px", objectFit: "cover", display: "block" }} />
            </div>
          </div>

          {/* Row 3: Service de Tracking & Réseau */}
          <div
            onClick={() => scrollToHeroTool("agencies")}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "44px",
              alignItems: "center",
              cursor: "pointer",
              padding: "32px",
              borderRadius: "28px",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 25px 50px rgba(16,185,129,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ borderRadius: "22px", overflow: "hidden", boxShadow: "0 20px 45px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <img src="/boraq_map_tracking.jpg" alt="Service Tracking Boraq" style={{ width: "100%", height: "280px", objectFit: "cover", display: "block" }} />
            </div>
            <div>
              <div style={{ display: "inline-flex", padding: "6px 16px", borderRadius: "30px", background: "rgba(16,185,129,0.15)", color: "#10b981", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", marginBottom: "14px" }}>
                {isAr ? "تتبع الخريطة والوكالات" : "SERVICE DE TRACKING GPS"}
              </div>
              <h2 style={{ fontSize: "26px", fontWeight: "900", color: "#fff", marginBottom: "14px", lineHeight: 1.3 }}>
                GÉOLOCALISATION & RÉSEAU D'AGENCES
              </h2>
              <p style={{ fontSize: "15px", color: "#9ca3af", lineHeight: 1.7 }}>
                {isAr
                  ? "تتبع الجغرافي الفوري لشاحنات البراق وطرودك على الخريطة المباشرة مع استعراض كُـل الوكالات المعتمدة ومواقعها الجغرافية على Google Maps."
                  : "Suivez en temps réel la géolocalisation de vos expéditions et retrouvez facilement la position exacte de toutes nos agences partenaires sur la carte."}
              </p>
              <div style={{ marginTop: "20px", color: "#10b981", fontWeight: "800", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{isAr ? "استعرض وكالاتنا على الخريطة ➔" : "Voir le réseau des agences ➔"}</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "36px 20px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.08)", color: "#6b7280", fontSize: "14px" }}>
        © {new Date().getFullYear()} Boraq Logistics & Merchandise. Tous droits réservés.
      </footer>
    </div>
  );
}
