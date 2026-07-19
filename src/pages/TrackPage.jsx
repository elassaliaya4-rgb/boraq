import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const STATUS_STEPS = ["pending", "inTransit", "arrived", "delivered"];

// Vector SVG Icons
function IconPending({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function IconTransit({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z" />
      <circle cx="6.5" cy="18.5" r="2.5" />
      <circle cx="16.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconArrived({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconDelivered({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconCalendar({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

const LANGUAGES = [
  { code: "ar", label: "العربية", flag: "🇲🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

const I18N_TRACK = {
  ar: {
    title: "تتبع الطرود",
    suivre: "تتبع حالة الطرد",
    hint: "أدخل رقم التتبع الخاص بك",
    placeholder: "مثال: BRQ-6590828",
    dest: "الوجهة / Destination",
    date: "التاريخ / Date",
    notfound: "الطرد غير موجود / Colis introuvable",
    retour: "← الرجوع للرئيسية",
    steps: {
      pending: "في الانتظار",
      inTransit: "في الطريق",
      arrived: "وصل للوكالة",
      delivered: "تم التسليم",
    }
  },
  fr: {
    title: "Suivi de colis",
    suivre: "Suivre mon colis",
    hint: "Entrez votre numéro de suivi",
    placeholder: "Ex: BRQ-6590828",
    dest: "Destination",
    date: "Date d'envoi",
    notfound: "Colis introuvable",
    retour: "← Retour à l'accueil",
    steps: {
      pending: "En attente",
      inTransit: "En transit",
      arrived: "Arrivé à l'agence",
      delivered: "Livré",
    }
  },
  en: {
    title: "Parcel Tracking",
    suivre: "Track my parcel",
    hint: "Enter your tracking number",
    placeholder: "Ex: BRQ-6590828",
    dest: "Destination",
    date: "Date sent",
    notfound: "Parcel not found",
    retour: "← Back to Home",
    steps: {
      pending: "Pending",
      inTransit: "In Transit",
      arrived: "Arrived at Agency",
      delivered: "Delivered",
    }
  },
  es: {
    title: "Seguimiento de paquetes",
    suivre: "Rastrear mi paquete",
    hint: "Ingrese su número de seguimiento",
    placeholder: "Ej: BRQ-6590828",
    dest: "Destino",
    date: "Fecha de envío",
    notfound: "Paquete no encontrado",
    retour: "← Volver al inicio",
    steps: {
      pending: "En espera",
      inTransit: "En tránsito",
      arrived: "Llegó a la agencia",
      delivered: "Entregado",
    }
  }
};

const STEP_ICONS = {
  pending: (c, s) => <IconPending size={s} color={c} />,
  inTransit: (c, s) => <IconTransit size={s} color={c} />,
  arrived: (c, s) => <IconArrived size={s} color={c} />,
  delivered: (c, s) => <IconDelivered size={s} color={c} />,
};

export default function TrackPage() {
  const [input, setInput]     = useState("");
  const [pkg, setPkg]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [trackLang, setTrackLang] = useState("fr"); // default FR

  const txt = I18N_TRACK[trackLang] || I18N_TRACK.fr;

  const [recentCodes, setRecentCodes] = useState([]);

  useEffect(() => {
    try {
      const savedRecent = JSON.parse(localStorage.getItem("boraq_recent_tracked") || "[]");
      setRecentCodes(savedRecent);

      const params = new URLSearchParams(window.location.search);
      const n = params.get("n");
      if (n) {
        setInput(n.toUpperCase());
        searchPackage(n.toUpperCase());
      } else {
        const lastCode = localStorage.getItem("boraq_last_tracked");
        if (lastCode) {
          setInput(lastCode);
          searchPackage(lastCode);
        }
      }
    } catch (e) {}
  }, []);

  async function searchPackage(num) {
    if (!num) return;
    const cleanNum = num.trim().toUpperCase();
    setLoading(true);
    setError("");
    setPkg(null);
    try {
      const { data, error: err } = await supabase
        .from("packages")
        .select("tracking_number, destination, status, created_at")
        .eq("tracking_number", cleanNum)
        .maybeSingle();

      if (err) throw err;
      if (!data) {
        setError(txt.notfound);
      } else {
        setPkg(data);
        // Persist last code
        try {
          localStorage.setItem("boraq_last_tracked", cleanNum);
          const currentRecent = JSON.parse(localStorage.getItem("boraq_recent_tracked") || "[]");
          const updatedRecent = [cleanNum, ...currentRecent.filter(c => c !== cleanNum)].slice(0, 3);
          localStorage.setItem("boraq_recent_tracked", JSON.stringify(updatedRecent));
          setRecentCodes(updatedRecent);
        } catch (e) {}
      }
    } catch (e) {
      setError("Erreur: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    searchPackage(input);
  }

  const stepIdx = pkg ? STATUS_STEPS.indexOf(pkg.status) : -1;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top, #1a2440, #0f1729)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "32px 16px",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* ── Keyframe Animations inline ── */}
      <style>{`
        @keyframes lineGlowStream {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>

      {/* Top Header & Language Bar */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{
          fontSize: 32, fontWeight: 800,
          background: "linear-gradient(135deg, #3b82f6, #f59e0b)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>⚡ Boraq</div>

        {/* European Language Switcher Capsule */}
        <div style={{
          display: "flex", gap: 3, background: "rgba(15, 23, 41, 0.75)",
          padding: 3, borderRadius: 30, border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setTrackLang(l.code)}
              style={{
                padding: "4px 8px", borderRadius: 20, fontSize: 11, fontWeight: "700",
                background: trackLang === l.code ? "#3b82f6" : "transparent",
                color: trackLang === l.code ? "#fff" : "rgba(255, 255, 255, 0.6)",
                border: "none", cursor: "pointer", transition: "all 0.2s ease",
                display: "flex", alignItems: "center", gap: 3
              }}
            >
              <span>{l.flag}</span>
              <span>{l.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Card Container */}
      <div style={{
        background: "rgba(26, 36, 64, 0.85)",
        border: "1px solid rgba(59, 130, 246, 0.25)",
        borderRadius: 24,
        padding: "28px 20px",
        width: "100%",
        maxWidth: 480,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(16px)"
      }}>
        <h2 style={{ color: "#e8edf7", fontSize: 18, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>
          📦 {txt.suivre}
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 20, textAlign: "center" }}>
          {txt.hint}
        </p>

        {/* Form */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={txt.placeholder}
            style={{
              flex: 1, padding: "13px 16px", borderRadius: 14, fontSize: 14, fontWeight: "600",
              background: "rgba(15, 23, 41, 0.7)", border: "1.5px solid rgba(59, 130, 246, 0.35)",
              color: "#fff", outline: "none", letterSpacing: 1
            }}
          />
          <button type="submit" disabled={loading} style={{
            padding: "13px 20px", borderRadius: 14, fontWeight: 800, fontSize: 16,
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            color: "#fff", border: "none", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(59, 130, 246, 0.4)",
            opacity: loading ? 0.7 : 1, transition: "all 0.2s"
          }}>
            {loading ? "⏳" : "🔍"}
          </button>
        </form>

        {/* Recent Search History Chips */}
        {recentCodes.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: "600" }}>🕒 Récents / السجلات:</span>
            {recentCodes.map(code => (
              <button
                key={code}
                onClick={() => {
                  setInput(code);
                  searchPackage(code);
                }}
                style={{
                  padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: "700",
                  background: "rgba(59, 130, 246, 0.12)", color: "#93c5fd",
                  border: "1px solid rgba(59, 130, 246, 0.3)", cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                📦 {code}
              </button>
            ))}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            padding: "12px", borderRadius: 14,
            background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5", fontSize: 13, textAlign: "center", fontWeight: "600"
          }}>
            ❌ {error}
          </div>
        )}

        {/* Result Package */}
        {pkg && (
          <div style={{ marginTop: 24 }}>
            {/* Tracking Header Pill */}
            <div style={{
              textAlign: "center", fontSize: 19, fontWeight: 800,
              color: "#3b82f6", letterSpacing: 2, marginBottom: 28,
              padding: "12px 16px", background: "rgba(59, 130, 246, 0.08)",
              borderRadius: 16, border: "1px solid rgba(59, 130, 246, 0.3)",
              boxShadow: "0 4px 20px rgba(59, 130, 246, 0.12)"
            }}>
              {pkg.tracking_number}
            </div>

            {/* Pro Step Progress Bar */}
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 32, position: "relative" }}>
              {STATUS_STEPS.map((s, i) => {
                const isPassed  = i <= stepIdx;
                const isCurrent = i === stepIdx;
                const renderFn  = STEP_ICONS[s];
                const labelText = txt.steps[s];

                return (
                  <div key={s} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                    {/* Animated Stream Connecting Line - Gap calculated so line stops at circle border */}
                    {i > 0 && (
                      <div style={{
                        position: "absolute",
                        top: 22,
                        right: "calc(50% + 24px)",
                        width: "calc(100% - 48px)",
                        height: 4,
                        background: i <= stepIdx
                          ? "linear-gradient(90deg, #3b82f6 0%, #22c55e 50%, #3b82f6 100%)"
                          : "rgba(255, 255, 255, 0.1)",
                        backgroundSize: "200% 100%",
                        animation: i <= stepIdx ? "lineGlowStream 2s linear infinite" : "none",
                        zIndex: 1,
                        borderRadius: 2
                      }} />
                    )}

                    {/* Solid Opaque Circle Container — Line NEVER intersects icon */}
                    <div style={{
                      position: "relative",
                      zIndex: 2, // Sits IN FRONT of the connecting line
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      margin: "0 auto 10px",
                      background: isCurrent
                        ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                        : isPassed
                          ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
                          : "#141c30", // Solid dark fill blocks connecting line
                      border: isCurrent
                        ? "3px solid #60a5fa"
                        : isPassed
                          ? "2.5px solid #4ade80"
                          : "2px solid rgba(255, 255, 255, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isCurrent
                        ? "0 0 24px rgba(59, 130, 246, 0.8), 0 0 10px rgba(59, 130, 246, 0.5)"
                        : isPassed
                          ? "0 0 14px rgba(34, 197, 94, 0.35)"
                          : "none",
                      transform: isCurrent ? "scale(1.15)" : "scale(1)",
                      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      opacity: isPassed ? 1 : 0.45
                    }}>
                      {renderFn(isPassed ? "#ffffff" : "#94a3b8", isCurrent ? 22 : 18)}
                    </div>

                    {/* Text Label */}
                    <div style={{
                      fontSize: 11,
                      fontWeight: isCurrent ? "800" : isPassed ? "700" : "500",
                      color: isCurrent ? "#93c5fd" : isPassed ? "#e8edf7" : "#64748b",
                      lineHeight: 1.3
                    }}>
                      {labelText}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clean Details Info (Destination & Date Only) with Vector SVG Icons */}
            <div style={{
              background: "rgba(15, 23, 41, 0.65)",
              borderRadius: 16,
              padding: "16px 20px",
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", fontSize: 14
              }}>
                <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
                  <IconArrived size={16} color="#3b82f6" /> {txt.dest}
                </span>
                <span style={{ color: "#fff", fontWeight: "700" }}>{pkg.destination || "—"}</span>
              </div>

              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", fontSize: 14
              }}>
                <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
                  <IconCalendar size={16} color="#3b82f6" /> {txt.date}
                </span>
                <span style={{ color: "#fff", fontWeight: "700" }}>
                  {new Date(pkg.created_at).toLocaleDateString(trackLang === "ar" ? "ar-MA" : "fr-MA")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Back button */}
      <a href="/" style={{
        marginTop: 28, color: "#94a3b8", fontSize: 13, textDecoration: "none",
        fontWeight: "600", opacity: 0.8, transition: "opacity 0.2s"
      }}>
        {txt.retour}
      </a>
    </div>
  );
}
