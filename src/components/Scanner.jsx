import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useApp } from "../lib/context";

export default function Scanner({ onResult, onClose }) {
  const { t } = useApp();
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const qr = new Html5Qrcode("scanner-area");
    html5QrCodeRef.current = qr;

    qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        // طرد ما يتسكاني مرة وحدة
        try {
          qr.stop().catch(() => {});
        } catch (e) {}
        onResult(decodedText);
      },
      () => {} // ignore scan errors
    ).catch((err) => {
      setError(err?.message || "Camera error");
    });

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current.clear())
          .catch(() => {});
      }
    };
  }, []);

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 300 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6 }}>
          📷 {t.scanTitle}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14 }}>
          {t.scanHint}
        </div>

        {error && <div className="error">{error}</div>}

        <div
          id="scanner-area"
          ref={scannerRef}
          style={{
            width: "100%",
            minHeight: 280,
            background: "#000",
            borderRadius: 12,
            overflow: "hidden",
          }}
        ></div>

        <button className="btn-sm btn-block" onClick={onClose} style={{ marginTop: 14, width: "100%" }}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
