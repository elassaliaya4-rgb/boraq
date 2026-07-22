import { useState, useEffect } from "react";
import { useApp } from "../lib/context";

export default function LandingPage({ onOpenLogin }) {
  const { lang } = useApp();
  const isAr = lang === "ar";

  // Scroll Position for Parallax zoom
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

      {/* ── SLIDE 1: PRINCIPAL COVER (Mockup Slide 1) ── */}
      <section style={{
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
          backgroundImage: "url('/boraq_truck.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `scale(${1 + scrollY * 0.0003}) translateY(${scrollY * 0.12}px)`,
          zIndex: 1
        }} />
        {/* Dark blue/black overlay */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(to right, rgba(9, 14, 26, 0.85) 30%, rgba(9, 14, 26, 0.5) 100%)",
          zIndex: 2
        }} />

        {/* Top Contacts Info row (exact replica) */}
        <div style={{
          position: "absolute",
          top: "60px",
          left: "80px",
          right: "80px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "13px",
          color: "#94a3b8",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: "14px",
          zIndex: 10
        }}>
          <span>{isAr ? "جهات الاتصال:" : "Contacts:"}</span>
          <span>+212 522 000 000</span>
          <span>contact@boraq.online</span>
        </div>

        {/* Center-left main Brand Logo block (exact replica) */}
        <div style={{
          position: "relative",
          zIndex: 10,
          paddingLeft: "80px",
          textAlign: isAr ? "right" : "left",
          transform: `translateY(${-scrollY * 0.05}px)`,
          transition: "transform 0.1s ease-out"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "10px" }}>
            {/* Globe Icon */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#3b82f6">
              <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#3b82f6" strokeWidth="2" fill="none" />
            </svg>
            <div>
              <h1 style={{ fontSize: "56px", fontWeight: "900", color: "#ffffff", margin: 0, letterSpacing: "-0.04em", lineHeight: "1" }}>Boraq</h1>
              <span style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "800", letterSpacing: "3px", textTransform: "uppercase" }}>Transport & Logistics</span>
            </div>
          </div>
        </div>

        {/* Bottom Tagline Row (exact replica) */}
        <div style={{
          position: "absolute",
          bottom: "60px",
          left: "80px",
          right: "80px",
          zIndex: 10,
          textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          paddingTop: "20px"
        }}>
          <p style={{ fontSize: "18px", fontStyle: "italic", color: "#cbd5e1", margin: 0 }}>
            {isAr ? "حمولتكم - مسؤوليتنا" : "Votre cargaison - notre responsabilité"}
          </p>
        </div>

        {/* Subtle Espace Pro click option in the bottom left corner for app admins/users */}
        <button
          onClick={onOpenLogin}
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.2)",
            fontSize: "10px",
            cursor: "pointer",
            zIndex: 100
          }}
        >
          Espace Pro
        </button>
      </section>

      {/* ── SLIDE 2: À PROPOS (Mockup Slide 2) ── */}
      <section style={{
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
          backgroundImage: "url('/boraq_ship.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `scale(${1.1 - (scrollY - 800) * 0.0001}) translateY(${(scrollY - 800) * 0.08}px)`,
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
        <div style={{
          position: "absolute",
          top: "60px",
          left: "80px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 10
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6">
            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#3b82f6" strokeWidth="2" fill="none" />
          </svg>
          <div>
            <span style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff" }}>Boraq</span>
            <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", marginTop: "1px" }}>Transport & Logistics</div>
          </div>
        </div>

        {/* Top Contacts Info row (mockup style) */}
        <div style={{
          position: "absolute",
          top: "60px",
          right: "80px",
          display: "flex",
          gap: "30px",
          fontSize: "13px",
          color: "#94a3b8",
          zIndex: 10
        }}>
          <span>+212 522 000 000</span>
          <span>contact@boraq.online</span>
        </div>

        {/* About us text content */}
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

    </div>
  );
}
