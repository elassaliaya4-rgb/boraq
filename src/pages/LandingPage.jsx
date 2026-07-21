import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // Active Tool state: 'tracking' | 'agencies'
  const [activeTab, setActiveTab] = useState("tracking");

  // Step Timeline tab state: 1 | 2 | 3 | 4 | 5
  const [activeStep, setActiveStep] = useState(1);

  // Testimonial slider state
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  
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

  // Smooth Scroll to Tool
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

  // Testimonials data (Junior ISEP Style)
  const testimonials = [
    {
      quote: "Une expérience unique ! La rapidité et le suivi GPS en temps réel de Boraq Logistics en font la meilleure référence de transport au Maroc. L’accompagnement et les notifications SMS garantissent un suivi parfait.",
      name: "M. Vincent PHILIPAUX",
      role: "CHAMPAGNE & LOGISTIQUE",
      city: "Casablanca"
    },
    {
      quote: "Une expertise et vivacité d’esprit propres à l'équipe Boraq ! Merci pour la qualité de votre accompagnement, vous avez fait du suivi de colis un outil simple et incontournable pour nos expéditions.",
      name: "M. David LE CLANCHE",
      role: "SUPPLYZEN MAROC",
      city: "Rabat"
    },
    {
      quote: "Très satisfaite de mon expérience avec le réseau d'agences Boraq. Prix compétitifs, livraison express en 24h et sécurité garantie par code-barres unique !",
      name: "Mme Hélène BELKADI",
      role: "TEA HOUSE DISTRIBUTION",
      city: "Tanger"
    }
  ];

  // 5 Steps (Junior ISEP Style)
  const steps = [
    {
      id: 1,
      title: "PREMIER CONTACT & DÉPÔT",
      subtitle: "Dépôt de votre colis dans l'agence agréée la plus proche.",
      desc: "À l'écoute de votre besoin, un agent agence vous accueille, pèse votre colis et génère votre récépissé d'expédition."
    },
    {
      id: 2,
      title: "ENREGISTREMENT BARCODE",
      subtitle: "Création du code-barres unique et scellé de sécurité.",
      desc: "Chaque colis reçoit un identifiant unique scanné instantanément dans notre base de données sécurisée."
    },
    {
      id: 3,
      title: "TRANSPORT HIGHWAY EXPRESS",
      subtitle: "Acheminement par nos camions poids lourds connectés.",
      desc: "Trajet inter-villes avec géolocalisation GPS en direct et suivi de la flotte sur notre plateforme."
    },
    {
      id: 4,
      title: "RECEPTION AGENCE DESTINATION",
      subtitle: "Contrôle à l'arrivée et envoi du SMS au destinataire.",
      desc: "Dès le déchargement, une notification automatique est envoyée sur le mobile de votre destinataire."
    },
    {
      id: 5,
      title: "LIVRAISON & GARANTIE 100%",
      subtitle: "Remise au destinataire avec signature numérique.",
      desc: "Remise sécurisée du colis en agence ou à domicile contre preuve de réception et archivage."
    }
  ];

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#f8fafc", color: "#1e1b4b", fontFamily: "'Open Sans', system-ui, -apple-system, sans-serif" }}>
      
      {/* ── JUNIOR ISEP CLEAN NAVBAR ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 40px",
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
      }}>
        {/* Brand Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "900", fontSize: "22px", color: "#1e1b4b", cursor: "pointer" }}
        >
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: "22px", fontWeight: "900", color: "#1e1b4b" }}>
            Boraq <span style={{ color: "#6366f1", fontSize: "12px", letterSpacing: "0.1em" }}>LOGISTICS</span>
          </span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="desktop-only-table" style={{ display: "flex", alignItems: "center", gap: "32px", fontSize: "14px", fontWeight: "700" }}>
          <a href="#hero" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ color: "#1e1b4b", textDecoration: "none" }}>{isAr ? "الرئيسية" : "Accueil"}</a>
          <a href="#services-cards" style={{ color: "#64748b", textDecoration: "none" }}>{isAr ? "خدماتنا" : "Nos Prestations"}</a>
          <a href="#process" style={{ color: "#64748b", textDecoration: "none" }}>{isAr ? "مسار الشحنة" : "Notre Structure"}</a>
          <a href="#testimonials" style={{ color: "#64748b", textDecoration: "none" }}>{isAr ? "آراء العملاء" : "Avis Clients"}</a>
        </nav>

        {/* Right CTA Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              color: "#1e1b4b",
              padding: "8px 16px",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "700"
            }}
          >
            {isAr ? "Français" : "العربية"}
          </button>

          <button
            onClick={onOpenLogin}
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              border: "none",
              color: "#ffffff",
              padding: "10px 24px",
              borderRadius: "24px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "800",
              boxShadow: "0 6px 20px rgba(99, 102, 241, 0.35)",
              transition: "transform 0.2s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <span>{isAr ? "فضاء الخدامة" : "Espace Pro"}</span>
          </button>
        </div>
      </header>

      {/* ── JUNIOR ISEP HERO SECTION ── */}
      <section id="hero" style={{ padding: "80px 40px 90px", background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)" }}>
        <div style={{ maxWidth: "1150px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "50px", alignItems: "center" }}>
          
          {/* Left Contents Block */}
          <div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              borderRadius: "20px",
              background: "rgba(99, 102, 241, 0.1)",
              color: "#4f46e5",
              fontSize: "13px",
              fontWeight: "800",
              marginBottom: "20px"
            }}>
              <span>⚡ LOGISTIQUE SUR-MESURE AU MAROC</span>
            </div>

            <h1 style={{ fontSize: "clamp(32px, 4.5vw, 54px)", fontWeight: "900", color: "#0f172a", lineHeight: 1.15, marginBottom: "20px" }}>
              Transport & Livraison<br/>
              <span style={{ background: "linear-gradient(135deg, #6366f1, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Sur-Mesure 2026
              </span>
            </h1>

            <p style={{ fontSize: "18px", color: "#475569", lineHeight: 1.6, marginBottom: "36px" }}>
              Soyez moteur de vos expéditions ! Augmentez la rapidité de vos envois et touchez de nouveaux destinataires dans tout le Royaume grâce au réseau Boraq Logistics.
            </p>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <button
                onClick={() => scrollToHeroTool("tracking")}
                style={{
                  padding: "14px 28px",
                  borderRadius: "14px",
                  border: "none",
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  color: "#fff",
                  fontWeight: "800",
                  fontSize: "15px",
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(99, 102, 241, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}
              >
                <span>{isAr ? "تتبع طردك الآن ➔" : "Suivre un colis ➔"}</span>
              </button>

              <button
                onClick={() => scrollToHeroTool("agencies")}
                style={{
                  padding: "14px 28px",
                  borderRadius: "14px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#1e1b4b",
                  fontWeight: "800",
                  fontSize: "15px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                }}
              >
                <span>{isAr ? "دليل الوكالات" : "Nos agences"}</span>
              </button>
            </div>
          </div>

          {/* Right Video / Graphic Frame */}
          <div style={{ borderRadius: "24px", overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.12)", border: "1px solid #e2e8f0", background: "#ffffff" }}>
            <img src="/boraq_3d_truck.jpg" alt="Boraq Logistics 3D Truck" style={{ width: "100%", height: "360px", objectFit: "cover", display: "block" }} />
          </div>

        </div>
      </section>

      {/* ── JUNIOR ISEP TRUSTED CLIENTS MARQUEE ── */}
      <section style={{ padding: "40px 20px", background: "#ffffff", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: "1150px", margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "24px" }}>
            Ces agences et villes qui nous font confiance
          </h3>

          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div style={{ display: "inline-block", animation: "marquee 22s linear infinite" }}>
              {["Casablanca Centre", "Rabat Agdal", "Tanger Méditerranée", "Marrakech Guéliz", "Agadir Marina", "Fès Ville Nouvelle", "Oujda Station", "Meknès"].map((hub, idx) => (
                <span key={idx} style={{ margin: "0 32px", fontSize: "16px", fontWeight: "800", color: "#334155", display: "inline-flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366f1" }}></span>
                  <span>AGENCE {hub.toUpperCase()}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── DYNAMIC HERO TOOL CONTAINER (Tracking & Agencies) ── */}
      <section id="hero-tools" style={{ padding: "70px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginBottom: "24px" }}>
            <button
              onClick={() => setActiveTab("tracking")}
              style={{
                padding: "12px 24px",
                borderRadius: "14px",
                border: activeTab === "tracking" ? "2px solid #6366f1" : "1px solid #cbd5e1",
                background: activeTab === "tracking" ? "#6366f1" : "#ffffff",
                color: activeTab === "tracking" ? "#ffffff" : "#1e1b4b",
                fontWeight: "800",
                fontSize: "15px",
                cursor: "pointer"
              }}
            >
              {isAr ? "تتبع الشحنة المباشر" : "Suivi de colis en direct"}
            </button>

            <button
              onClick={() => setActiveTab("agencies")}
              style={{
                padding: "12px 24px",
                borderRadius: "14px",
                border: activeTab === "agencies" ? "2px solid #6366f1" : "1px solid #cbd5e1",
                background: activeTab === "agencies" ? "#6366f1" : "#ffffff",
                color: activeTab === "agencies" ? "#ffffff" : "#1e1b4b",
                fontWeight: "800",
                fontSize: "15px",
                cursor: "pointer"
              }}
            >
              {isAr ? "شبكة الوكالات" : "Nos agences"}
            </button>
          </div>

          <div style={{ background: "#ffffff", padding: "32px", borderRadius: "24px", boxShadow: "0 20px 45px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
            {activeTab === "tracking" ? (
              <div>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#1e1b4b", fontWeight: "800" }}>
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
                      minWidth: "240px",
                      padding: "14px 18px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      fontSize: "15px",
                      fontWeight: "700"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={trackLoading}
                    style={{
                      padding: "14px 28px",
                      borderRadius: "12px",
                      border: "none",
                      background: "#6366f1",
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: "15px",
                      cursor: "pointer"
                    }}
                  >
                    {trackLoading ? "..." : (isAr ? "تتبع الآن" : "Rechercher")}
                  </button>
                </form>

                {trackError && <div style={{ marginTop: "16px", color: "#ef4444", fontWeight: "700" }}>{trackError}</div>}

                {trackResult && (
                  <div style={{ marginTop: "20px", padding: "20px", borderRadius: "16px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: "900", fontSize: "18px", color: "#6366f1" }}>{trackResult.tracking_number}</div>
                    <div style={{ marginTop: "8px", fontSize: "14px", color: "#475569" }}>
                      Statut: <b>{trackResult.status}</b> | Destinataire: <b>{trackResult.receiver_name}</b>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#1e1b4b", fontWeight: "800" }}>
                  {isAr ? "شبكة الوكالات المعتمدة" : "Nos Agences au Maroc"}
                </h3>
                {agenciesLoading ? (
                  <div>Chargement...</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
                    {agencies.map(a => (
                      <div key={a.id} style={{ padding: "14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontWeight: "800", fontSize: "15px", color: "#1e1b4b" }}>{a.name}</div>
                        <div style={{ fontSize: "13px", color: "#6366f1" }}>{a.city}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── JUNIOR ISEP INTERACTIVE HOVER CARDS GRID (Nos Services / Prestations) ── */}
      <section id="services-cards" style={{ padding: "90px 40px", background: "#ffffff" }}>
        <div style={{ maxWidth: "1150px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <div style={{ fontSize: "13px", fontWeight: "900", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>
              EN SAVOIR PLUS
            </div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: "900", color: "#0f172a" }}>
              Découvrez nos prestations sur-mesure
            </h2>
            <p style={{ fontSize: "16px", color: "#64748b", maxWidth: "600px", margin: "10px auto 0 auto" }}>
              Bénéficiez d'un accompagnement complet pour vos envois et la gestion de vos marchandises.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
            
            {/* Card 1: UI/UX & Barcode */}
            <div style={{
              position: "relative",
              borderRadius: "20px",
              overflow: "hidden",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
              transition: "transform 0.3s ease, boxShadow 0.3s ease",
              cursor: "pointer"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(99, 102, 241, 0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.04)"; }}
            >
              <img src="/boraq_packaging.jpg" alt="Barcode & Emballage" style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }} />
              <div style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#1e1b4b", marginBottom: "8px" }}>
                  Code-Barres Unique & Emballage
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5 }}>
                  Création d'une identité barcode unique et scellés de sécurité pour chaque colis.
                </p>
              </div>
            </div>

            {/* Card 2: SEO & Tracking GPS */}
            <div style={{
              position: "relative",
              borderRadius: "20px",
              overflow: "hidden",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
              transition: "transform 0.3s ease, boxShadow 0.3s ease",
              cursor: "pointer"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(99, 102, 241, 0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.04)"; }}
            >
              <img src="/boraq_map_tracking.jpg" alt="Tracking GPS" style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }} />
              <div style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#1e1b4b", marginBottom: "8px" }}>
                  Tracking GPS Temps Réel
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5 }}>
                  Suivi de la flotte camion et géolocalisation continue des expéditions sur la carte.
                </p>
              </div>
            </div>

            {/* Card 3: Notification SMS & Push */}
            <div style={{
              position: "relative",
              borderRadius: "20px",
              overflow: "hidden",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
              transition: "transform 0.3s ease, boxShadow 0.3s ease",
              cursor: "pointer"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(99, 102, 241, 0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.04)"; }}
            >
              <img src="/boraq_sms_notif.jpg" alt="Notification SMS" style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }} />
              <div style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#1e1b4b", marginBottom: "8px" }}>
                  Alertes SMS & Push Mobile
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5 }}>
                  Avertissement automatique du destinataire dès l'arrivée du colis en agence.
                </p>
              </div>
            </div>

            {/* Card 4: Back-Office & Espace Pro */}
            <div style={{
              position: "relative",
              borderRadius: "20px",
              overflow: "hidden",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
              transition: "transform 0.3s ease, boxShadow 0.3s ease",
              cursor: "pointer"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(99, 102, 241, 0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.04)"; }}
            >
              <img src="/boraq_3d_truck.jpg" alt="Espace Pro" style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }} />
              <div style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#1e1b4b", marginBottom: "8px" }}>
                  Espace Pro & Back-Office
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5 }}>
                  Gestion simplifiée des expéditions pour les chauffeurs, agences et administrateurs.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── JUNIOR ISEP 5-STEP TIMELINE SECTION (Un accompagnement sur mesure) ── */}
      <section id="process" style={{ padding: "90px 40px", background: "#f8fafc" }}>
        <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: "900", color: "#0f172a" }}>
              Un accompagnement sur mesure
            </h2>
            <p style={{ fontSize: "16px", color: "#64748b", marginTop: "10px" }}>
              Profitez de la fiabilité du réseau Boraq Logistics à chaque étape de votre expédition.
            </p>
          </div>

          {/* 5 Step Progress Tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "32px" }}>
            {steps.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveStep(s.id)}
                style={{
                  padding: "16px 14px",
                  borderRadius: "16px",
                  border: activeStep === s.id ? "2px solid #6366f1" : "1px solid #e2e8f0",
                  background: activeStep === s.id ? "#6366f1" : "#ffffff",
                  color: activeStep === s.id ? "#ffffff" : "#1e1b4b",
                  fontWeight: "800",
                  fontSize: "13px",
                  textAlign: "center",
                  cursor: "pointer",
                  boxShadow: activeStep === s.id ? "0 8px 25px rgba(99, 102, 241, 0.3)" : "none",
                  transition: "all 0.2s ease"
                }}
              >
                ETAPE {s.id}
              </button>
            ))}
          </div>

          {/* Step Active Card */}
          <div style={{ background: "#ffffff", padding: "36px", borderRadius: "24px", boxShadow: "0 20px 45px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "13px", fontWeight: "900", color: "#6366f1", textTransform: "uppercase", marginBottom: "8px" }}>
              {steps[activeStep - 1].subtitle}
            </div>
            <h3 style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", marginBottom: "14px" }}>
              {steps[activeStep - 1].title}
            </h3>
            <p style={{ fontSize: "16px", color: "#475569", lineHeight: 1.7 }}>
              {steps[activeStep - 1].desc}
            </p>
          </div>

        </div>
      </section>

      {/* ── JUNIOR ISEP TESTIMONIAL SLIDER SECTION (Ils parlent de nous) ── */}
      <section id="testimonials" style={{ padding: "90px 40px", background: "#ffffff" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          
          <div style={{ fontSize: "13px", fontWeight: "900", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
            TESTIMONIALS
          </div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: "900", color: "#0f172a", marginBottom: "40px" }}>
            Ils parlent de nous
          </h2>

          {/* Testimonial Card */}
          <div style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
            padding: "40px 36px",
            borderRadius: "28px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 45px rgba(99, 102, 241, 0.08)",
            textAlign: "center",
            position: "relative"
          }}>
            <p style={{ fontSize: "18px", color: "#334155", fontStyle: "italic", lineHeight: 1.7, marginBottom: "28px" }}>
              "{testimonials[activeTestimonial].quote}"
            </p>
            <div style={{ fontWeight: "900", fontSize: "17px", color: "#1e1b4b" }}>
              {testimonials[activeTestimonial].name}
            </div>
            <div style={{ fontSize: "13px", color: "#6366f1", fontWeight: "800", marginTop: "4px" }}>
              {testimonials[activeTestimonial].role} — Agence {testimonials[activeTestimonial].city}
            </div>

            {/* Carousel Navigation Dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "30px" }}>
              {testimonials.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  style={{
                    width: activeTestimonial === idx ? "28px" : "10px",
                    height: "10px",
                    borderRadius: "10px",
                    background: activeTestimonial === idx ? "#6366f1" : "#cbd5e1",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "40px 20px", textAlign: "center", background: "#0f172a", color: "#94a3b8", fontSize: "14px" }}>
        © {new Date().getFullYear()} Boraq Logistics & Merchandise. Tous droits réservés.
      </footer>
    </div>
  );
}
