import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";

export default function LandingPage({ onOpenLogin }) {
  const { lang, setLang } = useApp();
  const isAr = lang === "ar";

  // State for 3 interactive hero tools
  const [activeTab, setActiveTab] = useState("tracking"); // 'tracking' | 'agencies' | 'simulator'
  
  // Tracking tool state
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  // Agencies tool state
  const [agencies, setAgencies] = useState([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState("all");

  // Simulator tool state
  const [weight, setWeight] = useState(1);
  const [simOrigin, setSimOrigin] = useState("Casablanca");
  const [simDest, setSimDest] = useState("Rabat");
  const [simPrice, setSimPrice] = useState(null);

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
        setTrackError(isAr ? "لم نجد أي طرد بهاد الرقم" : "Aucun colis trouvé avec ce numéro");
      } else {
        setTrackResult(data);
      }
    } catch (err) {
      setTrackError(isAr ? "خطأ في البحث، حاول مجدداً" : "Erreur lors de la recherche");
    } finally {
      setTrackLoading(false);
    }
  }

  // Handle Tariff Price Simulation
  function calculateTariff() {
    const w = parseFloat(weight) || 1;
    // Base shipping rate structure (e.g. 35 MAD base + 5 MAD/kg extra)
    let baseRate = 35;
    if (simOrigin !== simDest) {
      baseRate += 15; // Inter-city shipping supplement
    }
    const total = baseRate + (w > 1 ? (w - 1) * 6 : 0);
    setSimPrice(total);
  }

  const cities = Array.from(new Set(agencies.map(a => a.city).filter(Boolean)));

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#0a0f1d", color: "#e2e8f0", fontFamily: "sans-serif" }}>
      
      {/* ── CTM-Style Top Navigation Bar ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 28px",
        background: "rgba(10, 15, 29, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 500,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
      }}>
        {/* Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "900", fontSize: "22px", color: "#fff" }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(14,165,233,0.4)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ background: "linear-gradient(135deg, #ffffff 0%, #93c5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Boraq
          </span>
          <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>
            LOGISTICS
          </span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="desktop-only-table" style={{ display: "flex", alignItems: "center", gap: "28px", fontSize: "14px", fontWeight: "600" }}>
          <a href="#hero" style={{ color: "#fff", textDecoration: "none" }}>{isAr ? "الرئيسية" : "Accueil"}</a>
          <a href="#services" style={{ color: "#94a3b8", textDecoration: "none" }}>{isAr ? "خدماتنا" : "Services"}</a>
          <a href="#agencies" onClick={() => setActiveTab("agencies")} style={{ color: "#94a3b8", textDecoration: "none" }}>{isAr ? "شبكة الوكالات" : "Réseau"}</a>
          <a href="#contact" style={{ color: "#94a3b8", textDecoration: "none" }}>{isAr ? "اتصل بنا" : "Contact"}</a>
        </nav>

        {/* Right Section: Language Toggle & Espace Pro Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => setLang(isAr ? "fr" : "ar")}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#e2e8f0",
              padding: "7px 14px",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "700"
            }}
          >
            {isAr ? "Français 🌐" : "العربية 🌐"}
          </button>

          {/* CTM-Style Espace Pro / Espace Client Button */}
          <button
            onClick={onOpenLogin}
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              border: "none",
              color: "#ffffff",
              padding: "10px 22px",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 18px rgba(37, 99, 235, 0.4)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(37, 99, 235, 0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(37, 99, 235, 0.4)"; }}
          >
            <div style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <span>{isAr ? "فضاء الأطقم والخدامة 👤" : "Espace Pro / Client 👤"}</span>
          </button>
        </div>
      </header>

      {/* ── CTM-Style Hero Banner Section ── */}
      <section id="hero" style={{
        position: "relative",
        padding: "60px 20px 100px",
        background: "radial-gradient(circle at top center, #1e293b 0%, #0a0f1d 80%)",
        textAlign: "center",
        overflow: "hidden"
      }}>
        {/* Subtle background road grid glow */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none"
        }} />

        <div style={{ maxWidth: "900px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: "900",
            lineHeight: 1.2,
            marginBottom: "16px",
            color: "#ffffff"
          }}>
            {isAr ? "شحناتك وبضاعتك بأمان وفخامة إلى جميع المدن" : "Votre colis jusqu'à chez vous."}
          </h1>
          <p style={{ fontSize: "16px", color: "#94a3b8", maxWidth: "680px", margin: "0 auto 40px auto", lineHeight: 1.6 }}>
            {isAr
              ? "البراق للمطابقة واللوجستيك السريع فـ المغرب - تتبع فوري، سرعة فائقة، وشبكة موثوقة عبر كُـل المدن."
              : "Le réseau leader du transport de colis et marchandises au Maroc. Rapidité, sécurité et fiabilité garaties."}
          </p>

          {/* ── 3 Interactive CTM Hero Feature Cards ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            maxWidth: "840px",
            margin: "0 auto"
          }}>
            {/* Card 1: Suivi de Colis */}
            <div
              onClick={() => setActiveTab("tracking")}
              style={{
                padding: "22px 18px",
                borderRadius: "18px",
                background: activeTab === "tracking"
                  ? "linear-gradient(135deg, #0284c7 0%, #0284c7 100%)"
                  : "rgba(30, 41, 59, 0.7)",
                border: activeTab === "tracking" ? "2px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: activeTab === "tracking" ? "0 10px 30px rgba(2, 132, 199, 0.4)" : "0 4px 16px rgba(0,0,0,0.2)",
                cursor: "pointer",
                transition: "all 0.25s ease",
                textAlign: "center"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#fff" }}>
                {isAr ? "تتبع طردك (Suivi)" : "Suivi de colis"}
              </h3>
            </div>

            {/* Card 2: Nos Agences */}
            <div
              onClick={() => setActiveTab("agencies")}
              style={{
                padding: "22px 18px",
                borderRadius: "18px",
                background: activeTab === "agencies"
                  ? "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
                  : "rgba(30, 41, 59, 0.7)",
                border: activeTab === "agencies" ? "2px solid #f87171" : "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: activeTab === "agencies" ? "0 10px 30px rgba(239, 68, 68, 0.4)" : "0 4px 16px rgba(0,0,0,0.2)",
                cursor: "pointer",
                transition: "all 0.25s ease",
                textAlign: "center"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#fff" }}>
                {isAr ? "وكالاتنا فـ المغرب" : "Nos agences"}
              </h3>
            </div>

            {/* Card 3: Simulation Tarifaire */}
            <div
              onClick={() => setActiveTab("simulator")}
              style={{
                padding: "22px 18px",
                borderRadius: "18px",
                background: activeTab === "simulator"
                  ? "linear-gradient(135deg, #0369a1 0%, #0f766e 100%)"
                  : "rgba(30, 41, 59, 0.7)",
                border: activeTab === "simulator" ? "2px solid #2dd4bf" : "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: activeTab === "simulator" ? "0 10px 30px rgba(45, 212, 191, 0.4)" : "0 4px 16px rgba(0,0,0,0.2)",
                cursor: "pointer",
                transition: "all 0.25s ease",
                textAlign: "center"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#fff" }}>
                {isAr ? "حاسبة ثمن الشحن" : "Simulation tarifaire"}
              </h3>
            </div>
          </div>

          {/* ── Dynamic Tool Panel Content Below Cards ── */}
          <div style={{
            marginTop: "28px",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
            textAlign: isAr ? "right" : "left",
            maxWidth: "840px",
            margin: "28px auto 0 auto"
          }}>
            {/* Tool 1: Suivi de Colis */}
            {activeTab === "tracking" && (
              <div>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#38bdf8", fontWeight: "800" }}>
                  🔍 {isAr ? "تتبع فوري لـ الشحنة برقم التتبع" : "Recherche Rapide de Colis"}
                </h3>
                <form onSubmit={handleTrack} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={trackCode}
                    onChange={e => setTrackCode(e.target.value)}
                    placeholder={isAr ? "أدخل رقم التتبع (مثال: BRQ-0917629)" : "Entrez votre numéro (ex: BRQ-0917629)"}
                    style={{
                      flex: 1,
                      minWidth: "240px",
                      padding: "14px 18px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#fff",
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
                      background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: "15px",
                      cursor: "pointer"
                    }}
                  >
                    {trackLoading ? (isAr ? "جاري البحث..." : "Recherche...") : (isAr ? "تتبع الآن ⚡" : "Rechercher ⚡")}
                  </button>
                </form>

                {trackError && (
                  <div style={{ marginTop: "16px", padding: "12px 16px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "14px" }}>
                    ⚠️ {trackError}
                  </div>
                )}

                {trackResult && (
                  <div style={{ marginTop: "20px", padding: "20px", borderRadius: "16px", background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "16px", fontWeight: "900", color: "#38bdf8" }}>{trackResult.tracking_number}</span>
                      <span style={{ fontSize: "12px", fontWeight: "800", padding: "4px 12px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
                        {trackResult.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "14px", color: "#cbd5e1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div><b>{isAr ? "المستلم:" : "Destinataire:"}</b> {trackResult.receiver_name || "—"}</div>
                      <div><b>{isAr ? "المنشأ:" : "Origine:"}</b> {trackResult.origin}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tool 2: Nos Agences */}
            {activeTab === "agencies" && (
              <div id="agencies">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "#f87171", fontWeight: "800" }}>
                    📍 {isAr ? "شبكة وكالات البراق عبر المدن" : "Réseau des Agences Boraq"}
                  </h3>
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
                    {agencies
                      .filter(a => selectedCity === "all" || a.city === selectedCity)
                      .map(a => (
                        <div key={a.id} style={{ padding: "14px", borderRadius: "14px", background: "rgba(30, 41, 59, 0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ fontWeight: "800", fontSize: "15px", color: "#fff" }}>🏢 {a.name}</div>
                          <div style={{ fontSize: "12px", color: "#38bdf8", marginTop: "4px" }}>📍 {a.city}</div>
                          {a.phone && <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>📞 {a.phone}</div>}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Agence " + a.name + " " + (a.city || ""))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "inline-block", marginTop: "10px", fontSize: "12px", color: "#10b981", fontWeight: "700", textDecoration: "none" }}
                          >
                            🗺️ {isAr ? "خريطة Google Maps ➔" : "Google Maps ➔"}
                          </a>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Tool 3: Simulation Tarifaire */}
            {activeTab === "simulator" && (
              <div>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#2dd4bf", fontWeight: "800" }}>
                  🧮 {isAr ? "حساب تقديري لـ ثمن الشحن والتوصيل" : "Simulateur de Tarif d'Expédition"}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>{isAr ? "مدينة الانطلاق:" : "Ville de départ:"}</label>
                    <select
                      value={simOrigin}
                      onChange={e => setSimOrigin(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
                    >
                      <option value="Casablanca">Casablanca</option>
                      <option value="Rabat">Rabat</option>
                      <option value="Tanger">Tanger</option>
                      <option value="Marrakech">Marrakech</option>
                      <option value="Agadir">Agadir</option>
                      <option value="Fès">Fès</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>{isAr ? "مدينة الوصول:" : "Ville d'arrivée:"}</label>
                    <select
                      value={simDest}
                      onChange={e => setSimDest(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
                    >
                      <option value="Rabat">Rabat</option>
                      <option value="Casablanca">Casablanca</option>
                      <option value="Tanger">Tanger</option>
                      <option value="Marrakech">Marrakech</option>
                      <option value="Agadir">Agadir</option>
                      <option value="Fès">Fès</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>{isAr ? "الوزن التقديري (كغ):" : "Poids estimé (kg):"}</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
                    />
                  </div>
                </div>

                <button
                  onClick={calculateTariff}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #0f766e, #0d9488)",
                    color: "#fff",
                    fontWeight: "800",
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  {isAr ? "احسب الثمن التقديري 🧮" : "Calculer le tarif 🧮"}
                </button>

                {simPrice !== null && (
                  <div style={{ marginTop: "16px", padding: "16px", borderRadius: "14px", background: "rgba(13, 148, 136, 0.2)", border: "1px solid rgba(13, 148, 136, 0.4)", color: "#2dd4bf", fontSize: "18px", fontWeight: "900" }}>
                    💰 {isAr ? `الثمن التقديري للشحن: ${simPrice} درهم مغربي (MAD)` : `Tarif Estimé : ${simPrice} MAD`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "30px 20px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.08)", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} Boraq Logistics & Merchandise. Tous droits réservés.
      </footer>
    </div>
  );
}
