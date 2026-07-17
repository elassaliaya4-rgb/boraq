import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useApp } from "../lib/context";

export default function Ticket({ pkg, agencyName, onClose }) {
  const { t, lang } = useApp();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && pkg) {
      const data = JSON.stringify({
        n: pkg.tracking_number,
        s: pkg.sender_name,
        r: pkg.receiver_name,
        from: pkg.origin,
        to: pkg.destination,
        kg: pkg.weight,
        date: pkg.date_sent,
      });
      QRCode.toCanvas(canvasRef.current, data, { width: 140, margin: 1 });
    }
  }, [pkg]);

  if (!pkg) return null;

  function handlePrint() {
    if (window.AndroidPrint) {
      window.AndroidPrint.print();
    } else {
      window.print();
    }
  }

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 250 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div className="ticket" id="ticket-print">
          <div className="t-head">
            <div className="t-logo">
              {agencyName && agencyName !== "—" ? `⚡ ${agencyName}` : `⚡ ${t.appName}`}
            </div>
            <div style={{ fontSize: 11, color: "#888" }}>Cargo & Livraison</div>
          </div>
          <div className="t-num">{pkg.tracking_number}</div>
          <div className="t-row"><span className="k">{t.senderName}</span><span className="v">{pkg.sender_name}</span></div>
          <div className="t-row"><span className="k">{t.receiverName}</span><span className="v">{pkg.receiver_name}</span></div>
          <div className="t-row"><span className="k">{t.destination}</span><span className="v">{pkg.destination}</span></div>
          <div className="t-row"><span className="k">{t.weight}</span><span className="v">{pkg.weight} {t.kg}</span></div>
          <div className="t-row"><span className="k">{t.dateSent}</span><span className="v">{pkg.date_sent}</span></div>
          <div className="t-row"><span className="k">{t.totalPrice}</span><span className="v" style={{ fontWeight: "700" }}>{pkg.total_price || (pkg.weight * (pkg.price_per_kg || 20))} DH</span></div>
          <div className="t-row"><span className="k">{t.payer}</span><span className="v">{pkg.payer === "sender" ? t.sender : t.receiver}</span></div>
          <div className="t-row"><span className="k">{t.paymentStatus}</span><span className="v" style={{ fontWeight: "700" }}>{pkg.payment_status === "paid" ? t.paid : t.unpaid}</span></div>
          <div className="t-qr"><canvas ref={canvasRef}></canvas></div>
        </div>
        <div className="modal-actions" style={{ gap: 8 }}>
          <button className="btn-primary" onClick={handlePrint} style={{ flex: 1 }}>🖨️ {t.print}</button>
          <button className="btn-sm" onClick={onClose} style={{ flex: 1 }}>⬅️ {lang === "ar" ? "رجوع" : "Retour"}</button>
        </div>
      </div>
    </div>
  );
}
