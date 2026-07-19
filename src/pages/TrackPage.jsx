import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const STATUS_STEPS = ["pending", "inTransit", "arrived", "delivered"];
const STATUS_LABELS = {
  pending:   { fr: "En attente",    ar: "في الانتظار",  icon: "📦" },
  inTransit: { fr: "En transit",    ar: "في الطريق",    icon: "🚚" },
  arrived:   { fr: "Arrivé",        ar: "وصل",          icon: "📍" },
  delivered: { fr: "Livré",         ar: "تم التسليم",   icon: "✅" },
};

export default function TrackPage() {
  const [input, setInput]     = useState("");
  const [pkg, setPkg]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Auto-search if tracking number is in URL: /track?n=BRQ-2026-XXXXX
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
        .select("tracking_number, receiver_name, destination, status, created_at, notes")
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
      background: "linear-gradient(135deg, #0f1729 0%, #1a2440 50%, #0f1729 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "40px 20px",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          fontSize: 42, fontWeight: 800,
          background: "linear-gradient(135deg, #3b82f6, #f59e0b)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 8
        }}>⚡ Boraq</div>
        <div style={{ color: "#94a3b8", fontSize: 13, letterSpacing: 2 }}>
          SUIVI DE COLIS / تتبع الطرود
        </div>
      </div>

      {/* Search box */}
      <div style={{
        background: "rgba(26,36,64,0.8)",
        border: "1px solid rgba(59,130,246,0.2)",
        borderRadius: 20,
        padding: "32px 28px",
        width: "100%",
        maxWidth: 480,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)"
      }}>
        <h2 style={{ color: "#e8edf7", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
          📦 Suivre mon colis
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>
          أدخل رقم التتبع / Entrez votre numéro de suivi
        </p>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ex: BRQ-2026-XXXXX"
            style={{
              flex: 1, padding: "12px 16px", borderRadius: 12, fontSize: 15,
              background: "rgba(15,23,41,0.6)", border: "1px solid rgba(59,130,246,0.3)",
              color: "#e8edf7", outline: "none"
            }}
          />
          <button type="submit" disabled={loading} style={{
            padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14,
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            color: "#fff", border: "none", cursor: "pointer",
            boxShadow: "0 4px 14px rgba(59,130,246,0.4)",
            opacity: loading ? 0.7 : 1
          }}>
            {loading ? "⏳" : "🔍"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16, padding: "12px 16px", borderRadius: 10,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5", fontSize: 13, textAlign: "center"
          }}>
            ❌ {error}
          </div>
        )}

        {/* Result */}
        {pkg && (
          <div style={{ marginTop: 24 }}>
            {/* Tracking number */}
            <div style={{
              textAlign: "center", fontSize: 18, fontWeight: 800,
              color: "#e8edf7", letterSpacing: 2, marginBottom: 20,
              padding: "12px", background: "rgba(59,130,246,0.08)",
              borderRadius: 12, border: "1px solid rgba(59,130,246,0.2)"
            }}>
              {pkg.tracking_number}
            </div>

            {/* Progress steps */}
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 24, gap: 0 }}>
              {STATUS_STEPS.map((s, i) => {
                const done    = i <= stepIdx;
                const current = i === stepIdx;
                return (
                  <div key={s} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                    {/* connector line */}
                    {i > 0 && (
                      <div style={{
                        position: "absolute", top: 14, right: "50%", width: "100%",
                        height: 3, background: i <= stepIdx
                          ? "linear-gradient(90deg, #3b82f6, #22c55e)"
                          : "rgba(255,255,255,0.1)",
                        zIndex: 0
                      }} />
                    )}
                    {/* dot */}
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", margin: "0 auto 6px",
                      background: done
                        ? current
                          ? "linear-gradient(135deg, #3b82f6, #22c55e)"
                          : "#22c55e"
                        : "rgba(255,255,255,0.08)",
                      border: done ? "none" : "2px solid rgba(255,255,255,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, position: "relative", zIndex: 1,
                      boxShadow: current ? "0 0 16px rgba(59,130,246,0.6)" : "none",
                      transition: "all 0.3s"
                    }}>
                      {done ? (current ? "🔵" : "✅") : "○"}
                    </div>
                    <div style={{ fontSize: 9, color: done ? "#93c5fd" : "#64748b", lineHeight: 1.3 }}>
                      {STATUS_LABELS[s].icon}<br/>
                      <span style={{ fontSize: 8 }}>{STATUS_LABELS[s].fr}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Details */}
            {[
              { k: "Destinataire / المستلم", v: pkg.receiver_name },
              { k: "Destination",            v: pkg.destination },
              { k: "Statut / الحالة",        v: `${STATUS_LABELS[pkg.status]?.icon} ${STATUS_LABELS[pkg.status]?.fr}` },
              { k: "Date",                   v: new Date(pkg.created_at).toLocaleDateString("fr-MA") },
              pkg.notes && { k: "Notes",     v: pkg.notes },
            ].filter(Boolean).map(({ k, v }) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 13
              }}>
                <span style={{ color: "#64748b" }}>{k}</span>
                <span style={{ color: "#e8edf7", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back to home */}
      <a href="/" style={{
        marginTop: 28, color: "#64748b", fontSize: 12, textDecoration: "none",
        letterSpacing: 1
      }}>
        ← Retour / رجوع
      </a>
    </div>
  );
}
