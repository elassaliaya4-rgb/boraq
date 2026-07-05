import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useApp } from "../lib/context";

export default function Ticket({ pkg, onClose }) {
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

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 250 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div className="ticket" id="ticket-print">
          <div className="t-head">
            <div className="t-logo">⚡ {t.appName}</div>
            <div style={{ fontSize: 11, color: "#888" }}>Cargo & Livraison</div>
          </div>
          <div className="t-num">{pkg.tracking_number}</div>
          <div className="t-row"><span className="k">{t.senderName}</span><span className="v">{pkg.sender_name}</span></div>
          <div className="t-row"><span className="k">{t.receiverName}</span><span className="v">{pkg.receiver_name}</span></div>
          <div className="t-row"><span className="k">{t.origin}</span><span className="v">{pkg.origin}</span></div>
          <div className="t-row"><span className="k">{t.destination}</span><span className="v">{pkg.destination}</span></div>
          <div className="t-row"><span className="k">{t.weight}</span><span className="v">{pkg.weight} {t.kg}</span></div>
          <div className="t-row"><span className="k">{t.dateSent}</span><span className="v">{pkg.date_sent}</span></div>
          <div className="t-qr"><canvas ref={canvasRef}></canvas></div>
        </div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={() => window.print()}>🖨️ {t.print}</button>
          <button className="btn-sm" onClick={onClose}>⬅️ {lang === "ar" ? "رجوع" : "Retour"}</button>
        </div>
      </div>
    </div>
  );
}
