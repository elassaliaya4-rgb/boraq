import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import { statusColors, statusBg } from "../lib/helpers";

export default function Scanner({ onClose, onOpenPackage, agencies = [] }) {
  const { t, lang } = useApp();
  const html5QrCodeRef = useRef(null);
  const lastScanRef = useRef({ text: "", at: 0 });
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const [scanned, setScanned] = useState([]); // [{pkg, at}]
  const [loading, setLoading] = useState(false);

  // إعادة التشغيل بعد إيقاف
  async function restartCamera() {
    if (!html5QrCodeRef.current) return;
    try {
      const state = html5QrCodeRef.current.getState();
      if (state !== 2 /* SCANNING */) {
        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
          onDecoded,
          () => {}
        );
      }
    } catch (e) {}
  }

  async function onDecoded(decodedText) {
    // تجنب التكرار السريع (debounce)
    const now = Date.now();
    if (
      lastScanRef.current.text === decodedText &&
      now - lastScanRef.current.at < 2500
    )
      return;
    lastScanRef.current = { text: decodedText, at: now };

    // اهتزاز التيليفون كتأكيد
    if (navigator.vibrate) navigator.vibrate(80);

    // استخراج رقم التتبع
    let tracking = decodedText;
    try {
      const obj = JSON.parse(decodedText);
      tracking = obj.n || obj.tracking_number || decodedText;
    } catch (e) {}

    // واش الطرد ديجا فاللائحة؟
    setScanned((prev) => {
      if (prev.find((s) => s.pkg.tracking_number === tracking)) return prev;
      return prev;
    });

    setLoading(true);
    const { data: pkg } = await supabase
      .from("packages")
      .select("*")
      .eq("tracking_number", tracking)
      .maybeSingle();
    setLoading(false);

    if (!pkg) {
      setError(`${t.notFound}: ${tracking}`);
      setTimeout(() => setError(""), 2500);
      return;
    }

    setError("");
    setScanned((prev) => {
      if (prev.find((s) => s.pkg.id === pkg.id)) return prev;
      return [{ pkg, at: now }, ...prev];
    });
  }

  useEffect(() => {
    let mounted = true;
    const startScanner = async () => {
      try {
        const qr = new Html5Qrcode("scanner-area");
        html5QrCodeRef.current = qr;
        await qr.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
          onDecoded,
          () => {}
        );
        if (mounted) setStarting(false);
      } catch (err) {
        if (mounted) {
          setError(err?.message || String(err) || "Camera error");
          setStarting(false);
        }
      }
    };
    const timer = setTimeout(startScanner, 200);
    return () => {
      mounted = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => html5QrCodeRef.current.clear()).catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  function getAgencyName(id) {
    return agencies.find((a) => a.id === id)?.name || "—";
  }

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 300 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 500 }}>
            📷 {t.scanTitle}
          </div>
          {scanned.length > 0 && (
            <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>
              {scanned.length} {t.scanCount}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
          {t.scanHint}
        </div>

        {error && (
          <div className="error" style={{ marginBottom: 10 }}>⚠️ {error}</div>
        )}

        <div
          id="scanner-area"
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            maxHeight: 320,
            background: "#000",
            borderRadius: 12,
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {starting && !error && (
            <div style={{ color: "#fff", fontSize: 13 }}>📷 ...</div>
          )}
          {loading && (
            <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>
              ⌛
            </div>
          )}
        </div>

        {/* لائحة الطرود المسكنية */}
        {scanned.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                📋 {t.scannedPackages}
              </div>
              <button
                onClick={() => setScanned([])}
                style={{ fontSize: 12, padding: "5px 10px" }}
              >
                🗑️ {t.clearList}
              </button>
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {scanned.map(({ pkg }) => (
                <div
                  key={pkg.id}
                  onClick={() => onOpenPackage && onOpenPackage(pkg)}
                  style={{
                    cursor: "pointer",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>
                      {pkg.tracking_number}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {pkg.sender_name} → {pkg.destination}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                      🏢 {getAgencyName(pkg.agency_id)} • ⚖️ {pkg.weight} {t.kg}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "3px 9px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: statusBg[pkg.status],
                      color: statusColors[pkg.status],
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t[pkg.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{ marginTop: 14, width: "100%", padding: 12 }}
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
