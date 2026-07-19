import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const STATUS_STEPS = ["pending", "inTransit", "arrived", "delivered"];

// Premium Vector SVG Icons
function IconPending({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function IconTransit({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z" />
      <circle cx="6.5" cy="18.5" r="2.5" />
      <circle cx="16.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconArrived({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconDelivered({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

const STATUS_LABELS = {
  pending:   { fr: "En attente", ar: "في الانتظار", renderIcon: (c, s) => <IconPending size={s} color={c} /> },
  inTransit: { fr: "En transit",  ar: "في الطريق",   renderIcon: (c, s) => <IconTransit size={s} color={c} /> },
  arrived:   { fr: "Arrivé",      ar: "وصل للوكالة", renderIcon: (c, s) => <IconArrived size={s} color={c} /> },
  delivered: { fr: "Livré",       ar: "تم التسليم",  renderIcon: (c, s) => <IconDelivered size={s} color={c} /> },
};

export default function TrackPage() {
  const [input, setInput]     = useState("");
  const [pkg, setPkg]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get("n");
    if (n) {
      setInput(n.toUpperCase());
      searchPackage(n.toUpperCase());
    }
  }, []);

  async function searchPackage(num) {
    if (!num) return;
    setLoading(true);
    setError("");
    setPkg(null);
    try {
      const { data, error: err } = await supabase
        .from("packages")
        .select("tracking_number, destination, status, created_at")
        .eq("tracking_number", num.trim().toUpperCase())
        .maybeSingle();

      if (err) throw err;
      if (!data) { setError("Colis introuvable / الطرد غير موجود"); }
      else setPkg(data);
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
      padding: "40px 16px",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          fontSize: 38, fontWeight: 800,
          background: "linear-gradient(135deg, #3b82f6, #f59e0b)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 6
        }}>⚡ Boraq</div>
        <div style={{ color: "#94a3b8", fontSize: 13, letterSpacing: 2, fontWeight: 600 }}>
          SUIVI DE COLIS / تتبع الطرود
        </div>
      </div>

      {/* Card Container */}
      <div style={{
        background: "rgba(26, 36, 64, 0.85)",
        border: "1px solid rgba(59, 130, 246, 0.25)",
        borderRadius: 24,
        padding: "32px 24px",
        width: "100%",
        maxWidth: 480,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(16px)"
      }}>
        <h2 style={{ color: "#e8edf7", fontSize: 18, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>
          🔎 Suivre un colis
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 20, textAlign: "center" }}>
          أدخل رقم التتبع الخاص بك
        </p>

        {/* Form */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ex: BRQ-6590828"
            style={{
              flex: 1, padding: "14px 16px", borderRadius: 14, fontSize: 15, fontWeight: "600",
              background: "rgba(15, 23, 41, 0.7)", border: "1.5px solid rgba(59, 130, 246, 0.35)",
              color: "#fff", outline: "none", letterSpacing: 1
            }}
          />
          <button type="submit" disabled={loading} style={{
            padding: "14px 22px", borderRadius: 14, fontWeight: 800, fontSize: 16,
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            color: "#fff", border: "none", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(59, 130, 246, 0.4)",
            opacity: loading ? 0.7 : 1, transition: "all 0.2s"
          }}>
            {loading ? "⏳" : "🔍"}
          </button>
        </form>

        {/* Error message */}
        {error && (
          <div style={{
            padding: "14px", borderRadius: 14,
            background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5", fontSize: 13, textAlign: "center", fontWeight: "600"
          }}>
            ❌ {error}
          </div>
        )}

        {/* Result Package */}
        {pkg && (
          <div style={{ marginTop: 24, animation: "fade-in 0.3s ease" }}>
            {/* Tracking Header Pill */}
            <div style={{
              textAlign: "center", fontSize: 20, fontWeight: 800,
              color: "#3b82f6", letterSpacing: 2, marginBottom: 28,
              padding: "14px 18px", background: "rgba(59, 130, 246, 0.08)",
              borderRadius: 16, border: "1px solid rgba(59, 130, 246, 0.3)",
              boxShadow: "0 4px 20px rgba(59, 130, 246, 0.12)"
            }}>
              {pkg.tracking_number}
            </div>

            {/* Pro Big Emoji Progress Tracker */}
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 32, position: "relative" }}>
              {STATUS_STEPS.map((s, i) => {
                const isPassed  = i <= stepIdx;
                const isCurrent = i === stepIdx;
                const info      = STATUS_LABELS[s];

                return (
                  <div key={s} style={{ flex: 1, textAlign: "center", position: "relative", zIndex: 1 }}>
                    {/* Connecting Line */}
                    {i > 0 && (
                      <div style={{
                        position: "absolute",
                        top: 23,
                        right: "50%",
                        width: "100%",
                        height: 3,
                        background: i <= stepIdx
                          ? "linear-gradient(90deg, #3b82f6, #22c55e)"
                          : "rgba(255, 255, 255, 0.1)",
                        zIndex: -1,
                        borderRadius: 2,
                        transition: "all 0.4s ease"
                      }} />
                    )}

                    {/* Pro Circle with Vector Icon */}
                    <div style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      margin: "0 auto 10px",
                      background: isCurrent
                        ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                        : isPassed
                          ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                          : "rgba(15, 23, 42, 0.6)",
                      border: isCurrent
                        ? "3px solid #93c5fd"
                        : isPassed
                          ? "2.5px solid #4ade80"
                          : "2px solid rgba(255, 255, 255, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isCurrent
                        ? "0 0 25px rgba(59, 130, 246, 0.75), 0 0 10px rgba(59, 130, 246, 0.5)"
                        : isPassed
                          ? "0 0 16px rgba(34, 197, 94, 0.35)"
                          : "none",
                      transform: isCurrent ? "scale(1.15)" : "scale(1)",
                      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      opacity: isPassed ? 1 : 0.4
                    }}>
                      {info.renderIcon(isPassed ? "#ffffff" : "#94a3b8", isCurrent ? 24 : 20)}
                    </div>

                    {/* Text Label */}
                    <div style={{
                      fontSize: 11,
                      fontWeight: isCurrent ? "800" : isPassed ? "700" : "500",
                      color: isCurrent ? "#93c5fd" : isPassed ? "#e8edf7" : "#64748b",
                      lineHeight: 1.3
                    }}>
                      {info.fr}<br/>
                      <span style={{ fontSize: 10, opacity: 0.85 }}>{info.ar}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clean Details Info (No Names - Minimal & Private) */}
            <div style={{
              background: "rgba(15, 23, 41, 0.5)",
              borderRadius: 16,
              padding: "16px 20px",
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", fontSize: 14
              }}>
                <span style={{ color: "#94a3b8" }}>📍 الوجهة / Destination</span>
                <span style={{ color: "#fff", fontWeight: "700" }}>{pkg.destination || "—"}</span>
              </div>

              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", fontSize: 14
              }}>
                <span style={{ color: "#94a3b8" }}>📅 التاريخ / Date</span>
                <span style={{ color: "#fff", fontWeight: "700" }}>
                  {new Date(pkg.created_at).toLocaleDateString("fr-MA")}
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
        ← Retour à l'accueil / الرجوع للرئيسية
      </a>
    </div>
  );
}
