import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import { FLOW } from "../lib/i18n";
import { statusColors, statusBg, buildWhatsAppLink } from "../lib/helpers";
import Ticket from "./Ticket";

export default function PackageDetails({ pkg, agencies, onClose, onUpdated }) {
  const { t, lang } = useApp();
  const [showTicket, setShowTicket] = useState(false);
  const [wa, setWa] = useState(null);
  const [busy, setBusy] = useState(false);
  const [siblings, setSiblings] = useState([]);

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

  if (!pkg) return null;

  const agencyName =
    agencies.find((a) => a.id === pkg.agency_id)?.name || "—";
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

  function openWhatsApp(who) {
    setWa(buildWhatsAppLink(pkg, who, agencyName, lang, t));
  }

  function Row({ k, v }) {
    return (
      <div className="d-row">
        <span className="k">{k}</span>
        <span className="v">{v}</span>
      </div>
    );
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="d-head">
          <span style={{ fontSize: 17, fontWeight: 500 }}>
            📦 {t.details}
          </span>
          <span className={`status ${pkg.status}`}>{t[pkg.status]}</span>
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
          <Row k={t.senderName} v={pkg.sender_name} />
          <Row k={"📱 " + t.senderPhone} v={pkg.sender_phone || "—"} />
          <Row k={t.receiverName} v={pkg.receiver_name} />
          <Row k={"📱 " + t.receiverPhone} v={pkg.receiver_phone || "—"} />
          <Row k={t.origin} v={pkg.origin} />
          <Row k={t.destination} v={pkg.destination} />
          <Row k={t.destAgency} v={agencyName} />
          <Row k={"⚖️ " + t.weight} v={pkg.weight + " " + t.kg} />
          <Row k={"📅 " + t.dateSent} v={pkg.date_sent} />
        </div>

        {nextStatus ? (
          <button className="btn-accent btn-block" onClick={advance} disabled={busy} style={{ fontSize: 13, padding: "12px 10px" }}>
            {siblings.length > 1 ? (
              lang === "ar" 
                ? `➡️ مشّي المجموعة كاملة (${siblings.length} طرود): ${t[nextStatus]}`
                : `➡️ Avancer tout le groupe (${siblings.length} colis) : ${t[nextStatus]}`
            ) : (
              `➡️ ${t.advance}: ${t[nextStatus]}`
            )}
          </button>
        ) : (
          <div className="done-msg">✅ {t.delivered}</div>
        )}

        <div className="wa-row">
          <button className="btn-wa" onClick={() => openWhatsApp("receiver")}>
            🟢 {t.waReceiver}
          </button>
          <button className="btn-wa" onClick={() => openWhatsApp("sender")}>
            🟢 {t.waSender}
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={() => setShowTicket(true)}>
            🎫 {t.ticket}
          </button>
          <button className="btn-sm" onClick={onClose}>
            {t.cancel}
          </button>
        </div>
      </div>

      {showTicket && (
        <Ticket pkg={pkg} onClose={() => setShowTicket(false)} />
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
    </div>
  );
}
