import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import { statusColors, statusBg } from "../lib/helpers";

export default function Scanner({ onClose, onOpenPackage, agencies = [] }) {
  const { t } = useApp();
  const qrRef = useRef(null);
  const stoppedRef = useRef(false);
  const lastScanRef = useRef({ text: "", at: 0 });
  const isScanningRef = useRef(false);
  const startPromiseRef = useRef(null); // Tracks the camera start promise
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const [scanned, setScanned] = useState([]);
  const [loading, setLoading] = useState(false);

  // إيقاف آمن — كنتأكد ما نوقفش مرتين
  async function safeStop() {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    
    // If camera is still starting, wait for it to finish first
    if (startPromiseRef.current) {
      try {
        await startPromiseRef.current;
      } catch (e) {
        return; // Start failed, nothing to stop
      }
    }
    
    const qr = qrRef.current;
    if (!qr) return;
    try {
      if (isScanningRef.current) {
        await qr.stop();
        isScanningRef.current = false;
      }
    } catch (e) {}
    try {
      qr.clear();
    } catch (e) {}
  }

  async function onDecoded(decodedText) {
    if (stoppedRef.current) return;

    const now = Date.now();
    if (
      lastScanRef.current.text === decodedText &&
      now - lastScanRef.current.at < 2500
    )
      return;
    lastScanRef.current = { text: decodedText, at: now };

    try {
      if (navigator.vibrate) navigator.vibrate(80);
    } catch (e) {}

    let tracking = decodedText;
    try {
      const obj = JSON.parse(decodedText);
      tracking = obj.n || obj.tracking_number || decodedText;
    } catch (e) {}

    setLoading(true);
    const { data: pkg } = await supabase
      .from("packages")
      .select("*")
      .eq("tracking_number", tracking)
      .maybeSingle();

    let siblings = [];
    if (pkg) {
      const { data: sibs } = await supabase
        .from("packages")
        .select("id, tracking_number, status")
        .eq("sender_phone", pkg.sender_phone)
        .eq("receiver_phone", pkg.receiver_phone)
        .neq("status", "delivered");
      siblings = sibs || [];
    }
    setLoading(false);

    if (stoppedRef.current) return;

    if (!pkg) {
      setError(`${t.notFound}: ${tracking}`);
      setTimeout(() => setError(""), 2500);
      return;
    }

    setError("");
    setScanned((prev) => {
      if (prev.find((s) => s.pkg.id === pkg.id)) return prev;
      return [{ pkg, siblings, at: now }, ...prev];
    });
  }

  useEffect(() => {
    let mounted = true;
    const startScanner = async () => {
      if (!document.getElementById("scanner-area")) return;
      try {
        const qr = new Html5Qrcode("scanner-area", { verbose: false });
        qrRef.current = qr;

        // 1. Get available cameras (triggers permission request)
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          throw new Error(lang === "ar" ? "لم يتم العثور على كاميرا في هذا الجهاز" : "Aucune caméra trouvée sur cet appareil");
        }

        // 2. Select back camera if available, otherwise default to first camera (front/webcam)
        let cameraId = devices[0].id;
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes("back") || 
          d.label.toLowerCase().includes("rear") || 
          d.label.toLowerCase().includes("environment") ||
          d.label.toLowerCase().includes("arrière")
        );
        if (backCamera) {
          cameraId = backCamera.id;
        }
        
        const p = qr.start(
          cameraId,
          { 
            fps: 10, 
            qrbox: 220
          },
          onDecoded,
          () => {}
        );
        startPromiseRef.current = p;
        await p;
        isScanningRef.current = true;

        if (stoppedRef.current) {
          await qr.stop();
          isScanningRef.current = false;
          qr.clear();
        } else {
          if (mounted) setStarting(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || String(err) || "Camera error");
          setStarting(false);
        }
      } finally {
        startPromiseRef.current = null;
      }
    };
    const timer = setTimeout(startScanner, 250);
    return () => {
      mounted = false;
      clearTimeout(timer);
      safeStop();
    };
  }, []);

  // إغلاق آمن
  async function handleClose() {
    await safeStop();
    onClose();
  }

  function handleOpenPackage(pkg) {
    safeStop().then(() => {
      if (onOpenPackage) onOpenPackage(pkg);
    });
  }

  function getAgencyName(id) {
    return agencies.find((a) => a.id === id)?.name || "—";
  }

  return (
    <div className="modal-bg" onClick={handleClose} style={{ zIndex: 300 }}>
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
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1",
            maxHeight: 320,
            background: "#000",
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {/* Clean target container for html5-qrcode. React does not touch its subtree! */}
          <div
            id="scanner-area"
            style={{
              width: "100%",
              height: "100%"
            }}
          />

          {/* Sibling React overlays */}
          {starting && !error && (
            <div style={{ position: "absolute", color: "#fff", fontSize: 13, zIndex: 1 }}>
              📷 ...
            </div>
          )}
          {loading && (
            <div style={{ position: "absolute", bottom: 10, insetInlineStart: 10, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 12, fontSize: 12, zIndex: 2 }}>
              ⌛
            </div>
          )}
        </div>

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
              {scanned.map(({ pkg, siblings }) => {
                const isGroup = siblings && siblings.length > 1;
                // Count how many siblings are also in the current scanned list
                const scannedSiblings = siblings ? siblings.filter(sib =>
                  scanned.find(s => s.pkg.id === sib.id)
                ) : [];

                return (
                  <div key={pkg.id} style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                    <div
                      onClick={() => handleOpenPackage(pkg)}
                      style={{
                        cursor: "pointer",
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

                    {isGroup && (
                      <div style={{
                        marginTop: 4,
                        fontSize: 11,
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "rgba(251, 191, 36, 0.08)",
                        border: "1px solid rgba(251, 191, 36, 0.2)",
                        color: "var(--accent, #fbbf24)"
                      }}>
                        🔗 <b>{lang === "ar" ? "شحنة مشتركة" : "Envoi groupé"}:</b> {scannedSiblings.length}/{siblings.length} {lang === "ar" ? "طرود تم مسحها" : "colis scannés"}
                        <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {siblings.map(sib => {
                            const isScanned = scanned.find(s => s.pkg.id === sib.id);
                            return (
                              <span 
                                key={sib.id} 
                                style={{ 
                                  fontSize: 10,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: isScanned ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                  color: isScanned ? "#10b981" : "#94a3b8",
                                  border: isScanned ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)"
                                }}
                              >
                                {sib.tracking_number} {isScanned ? "✓" : ""}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          style={{ marginTop: 14, width: "100%", padding: 12 }}
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
