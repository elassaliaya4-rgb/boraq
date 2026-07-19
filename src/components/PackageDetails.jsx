import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import { FLOW } from "../lib/i18n";
import { statusColors, statusBg, buildWhatsAppLink } from "../lib/helpers";
import Ticket from "./Ticket";

export default function PackageDetails({ pkg, agencies, onClose, onUpdated, onDelete }) {
  const { t, lang, profile } = useApp();
  const [showTicket, setShowTicket] = useState(false);
  const [wa, setWa] = useState(null);
  const [busy, setBusy] = useState(false);
  const [siblings, setSiblings] = useState([]);
  const [deleted, setDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [touchEndY, setTouchEndY] = useState(0);

  function executeDelete() {
    setConfirmDelete(false);
    setDeleted(true);
    if (onClose) onClose();
    if (onDelete) onDelete(pkg);
  }

  useEffect(() => {
    if (pkg) {
      fetchSiblings();
    }
  }, [pkg]);

  async function fetchSiblings() {
    try {
      const { data } = await supabase
        .from("packages")
        .select("id, tracking_number, status")
        .eq("sender_phone", pkg.sender_phone)
        .eq("receiver_phone", pkg.receiver_phone)
        .neq("status", "delivered");
      setSiblings(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  if (!pkg || deleted) return null;

  const agencyName =
    agencies.find((a) => a.id === pkg.agency_id)?.name || "—";
  const activeAgencyName = profile?.agency_id
    ? (agencies.find((a) => a.id === profile.agency_id)?.name)
    : null;
  const ticketAgencyName = activeAgencyName && activeAgencyName !== "—" ? activeAgencyName : agencyName;
  const curIdx = FLOW.indexOf(pkg.status);
  const nextStatus = curIdx < FLOW.length - 1 ? FLOW[curIdx + 1] : null;

  async function advance() {
    if (!nextStatus) return;
    setBusy(true);
    const targetIds = siblings.length > 0 ? siblings.map(s => s.id) : [pkg.id];
    await supabase
      .from("packages")
      .update({ status: nextStatus })
      .in("id", targetIds);
    setBusy(false);
    onUpdated && onUpdated();
    onClose();
  }

  async function markAsPaid() {
    setBusy(true);
    const { error } = await supabase
      .from("packages")
      .update({ 
        payment_status: "paid",
        paid_at: new Date().toISOString()
      })
      .eq("id", pkg.id);
    setBusy(false);
    if (error) {
      alert("Error: " + error.message);
    } else {
      onUpdated && onUpdated();
      onClose();
    }
  }

  function openWhatsApp(who) {
    const agObj = agencies.find((a) => a.id === pkg.agency_id);
    setWa(buildWhatsAppLink(pkg, who, agObj || agencyName, lang, t));
  }

  function Row({ k, v, highlight }) {
    return (
      <div className="d-row">
        <span className="k">{k}</span>
        <span className="v" style={highlight ? { color: "var(--text)", fontWeight: "700" } : {}}>{v}</span>
      </div>
    );
  }

  // Touch handlers for swipe gesture

  function handleTouchStart(e) {
    const x = e.targetTouches[0].clientX;
    const y = e.targetTouches[0].clientY;
    
    // Only track touches that start near the left/right edges (within 45px) to prevent scroll conflicts
    const isNearEdge = x < 45 || x > window.innerWidth - 45;
    
    if (isNearEdge) {
      setTouchStartX(x);
      setTouchStartY(y);
    } else {
      setTouchStartX(0); // Ignore this gesture
    }
    setTouchEndX(0);
    setTouchEndY(0);
  }

  function handleTouchMove(e) {
    if (touchStartX === 0) return;
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  }

  function handleTouchEnd() {
    if (touchStartX === 0 || !touchEndX) return;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Swipe in either direction with minimal vertical scroll displacement
    if (Math.abs(diffX) > 70 && Math.abs(diffY) < 50) {
      onClose();
    }
  }

  function handleBgClick() {
    // Only close on outside click for desktop screens (>768px) to prevent accidental exits on mobile bezels
    if (window.innerWidth > 768) {
      onClose();
    }
  }

  return (
    <div 
      className="modal-bg" 
      onClick={handleBgClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="d-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button 
              onClick={onClose} 
              style={{ 
                background: "none", 
                border: "none", 
                fontSize: 18, 
                color: "var(--text)", 
                cursor: "pointer", 
                padding: "2px 6px",
                display: "inline-flex",
                alignItems: "center"
              }}
              title="Retour / رجوع"
            >
              {lang === "ar" ? "→" : "←"}
            </button>
            <span style={{ fontSize: 17, fontWeight: 600 }}>
              📦 {t.details}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`status ${pkg.status}`}>{t[pkg.status]}</span>
            <button 
              onClick={onClose} 
              style={{ 
                background: "none", 
                border: "none", 
                fontSize: 18, 
                color: "var(--text-dim)", 
                cursor: "pointer",
                padding: "2px 6px",
                display: "inline-flex",
                alignItems: "center"
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* مؤشر المراحل */}
        <div className="steps">
          {FLOW.map((s, i) => {
            const done = i <= curIdx;
            return (
              <div className="step-wrap" key={s}>
                <div
                  className="step-dot"
                  style={{
                    background: done ? statusColors[s] : "var(--surface-2)",
                    color: done ? "#fff" : "var(--text-dim)",
                    borderColor: done ? statusColors[s] : "var(--border)",
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <div
                  className="step-lbl"
                  style={{ color: done ? statusColors[s] : "var(--text-dim)" }}
                >
                  {t[s]}
                </div>
              </div>
            );
          })}
        </div>

        <div className="d-card">
          <div className="d-track">{pkg.tracking_number}</div>
          <Row k={t.senderName} v={pkg.sender_name} highlight={true} />
          <Row k={t.senderPhone} v={pkg.sender_phone || "—"} />
          <Row k={t.receiverName} v={pkg.receiver_name} highlight={true} />
          <Row k={t.receiverPhone} v={pkg.receiver_phone || "—"} />
          <Row k={t.origin} v={pkg.origin} highlight={true} />
          <Row k={t.destination} v={pkg.destination} highlight={true} />
          <Row k={t.destAgency} v={agencyName} />
          <Row k={t.weight} v={pkg.weight + " " + t.kg} />
          <Row k={t.dateSent} v={pkg.date_sent} />
          <Row k={t.pricePerKg} v={(pkg.price_per_kg || 20) + " DH"} />
          <Row k={t.totalPrice} v={(pkg.total_price || (pkg.weight * (pkg.price_per_kg || 20))) + " DH"} highlight={true} />
          <Row k={t.payer} v={pkg.payer === "sender" ? t.sender : t.receiver} />
          <Row k={t.paymentStatus} v={pkg.payment_status === "paid" ? t.paid : t.unpaid} highlight={true} />
        </div>

        {pkg.payment_status !== "paid" && (
          <button 
            className="btn-accent btn-block" 
            onClick={markAsPaid} 
            disabled={busy} 
            style={{ 
              fontSize: 13, 
              padding: "12px 10px", 
              background: "linear-gradient(135deg, #10b981, #059669)", 
              boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>{t.markAsPaid}</span>
          </button>
        )}

        {nextStatus ? (
          <button className="btn-accent btn-block" onClick={advance} disabled={busy} style={{ fontSize: 13, padding: "12px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            <span>
              {siblings.length > 1 ? (
                lang === "ar" 
                  ? `مشّي المجموعة كاملة (${siblings.length} طرود): ${t[nextStatus]}`
                  : `Avancer tout le groupe (${siblings.length} colis) : ${t[nextStatus]}`
              ) : (
                `${t.advance}: ${t[nextStatus]}`
              )}
            </span>
          </button>
        ) : (
          <div className="done-msg" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>{t.delivered}</span>
          </div>
        )}

        <div className="wa-row">
          <button className="btn-wa" onClick={() => openWhatsApp("receiver")}>
            <span>{t.waReceiver}</span>
          </button>
          <button className="btn-wa" onClick={() => openWhatsApp("sender")}>
            <span>{t.waSender}</span>
          </button>
        </div>

        <div className="modal-actions" style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn-primary" onClick={() => setShowTicket(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>
            <span>{t.ticket}</span>
          </button>
          {onDelete && (
            <button 
              onClick={() => setConfirmDelete(true)}
              style={{ 
                flex: 1, 
                background: "rgba(239, 68, 68, 0.15)", 
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#f87171",
                padding: "10px",
                borderRadius: 8,
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>{lang === "ar" ? "حذف" : "Supprimer"}</span>
            </button>
          )}
          <button className="btn-sm" onClick={onClose} style={{ flex: 1 }}>
            {lang === "ar" ? "رجوع" : "Retour"}
          </button>
        </div>
      </div>

      {showTicket && (
        <Ticket pkg={pkg} agencyName={ticketAgencyName} onClose={() => setShowTicket(false)} />
      )}

      {wa && (
        <div className="modal-bg" onClick={() => setWa(null)} style={{ zIndex: 200 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6 }}>
              🟢 {t.waMessage}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14 }}>
              📱 {wa.phone || "—"}
            </div>
            <div className="wa-bubble">{wa.msg}</div>
            <a
              className="btn-wa btn-block"
              href={wa.link}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", textAlign: "center", display: "block", marginTop: 14 }}
            >
              🟢 {t.sendWA}
            </a>
            <button className="btn-sm btn-block" onClick={() => setWa(null)} style={{ marginTop: 8 }}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="modal-bg" onClick={() => setConfirmDelete(false)} style={{ zIndex: 300 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 17, color: "var(--text)" }}>
              {lang === "ar" ? `حذف الطرد ${pkg.tracking_number}؟` : `Supprimer le colis ${pkg.tracking_number} ?`}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 20px 0", lineHeight: 1.5 }}>
              {lang === "ar" ? "هل أنت متأكد من حذف هذا الطرد؟ سيعود التطبيق تلقائياً للشاشة الرئيسية." : "Voulez-vous supprimer ce colis ? Vous serez réorienté au tableau de bord."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={executeDelete}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239,68,68,0.3)"
                }}
              >
                ✅ {lang === "ar" ? "تأكيد (OK)" : "OK, Supprimer"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  fontWeight: "600",
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                ✕ {lang === "ar" ? "إلغاء" : "Annuler"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
