import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import { statusColors, statusBg, buildWhatsAppLink } from "../lib/helpers";
import jsQR from "jsqr";

export default function Scanner({ onClose, onOpenPackage, agencies = [], onUpdated, expectedAgency }) {
  const { t, lang, profile } = useApp();
  const qrRef = useRef(null);
  const stoppedRef = useRef(false);
  const lastScanRef = useRef({ text: "", at: 0 });
  const isScanningRef = useRef(false);
  const startPromiseRef = useRef(null); // Tracks the camera start promise
  const canvasRef = useRef(null);
  const loopRef = useRef(null);
  const smoothRectRef = useRef({ laserPhase: 0, laserDir: 1 });
  const successRef = useRef({ active: false, alpha: 0 }); // for fade-out on scan success
  const fileInputRef = useRef(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const [scanned, setScanned] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [waQueue, setWaQueue] = useState([]);

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
      if (navigator.vibrate) {
        // Strong double haptic buzz feedback on scan success
        navigator.vibrate([120, 80, 120]);
      }
    } catch (e) {}

    let tracking = decodedText;
    try {
      const obj = JSON.parse(decodedText);
      tracking = obj.n || obj.tracking_number || decodedText;
    } catch (e) {}

    if (stoppedRef.current) return;
    setLoading(true);
    const { data: pkg } = await supabase
      .from("packages")
      .select("*")
      .eq("tracking_number", tracking)
      .maybeSingle();

    if (!pkg) {
      if (stoppedRef.current) return;
      setLoading(false);
      setError(`${t.notFound}: ${tracking}`);
      setTimeout(() => {
        if (!stoppedRef.current) setError("");
      }, 2500);
      return;
    }

    // Security check: Agencies can only scan packages belonging to their agency!
    if (profile?.role === "agency" && pkg.agency_id !== profile.agency_id) {
      if (stoppedRef.current) return;
      setLoading(false);
      setError(
        lang === "ar"
          ? "هذا الطرد لا ينتمي لوكالتك! لا يمكنك مسحه."
          : "Ce colis n'appartient pas à votre agence ! Vous ne pouvez pas le scanner."
      );
      setTimeout(() => {
        if (!stoppedRef.current) setError("");
      }, 3500);
      return;
    }

    // Auto-update status based on user role
    let targetStatus = "arrived";
    if (profile?.role === "admin" || profile?.role === "driver") {
      targetStatus = "inTransit"; // Always mark as "inTransit" (shipped/loaded/tch7ann) for drivers & admin scans
    }
    const { error: updateErr } = await supabase
      .from("packages")
      .update({ status: targetStatus })
      .eq("id", pkg.id);

    if (updateErr) {
      if (stoppedRef.current) return;
      setLoading(false);
      setError(updateErr.message);
      return;
    }

    // Update local package object status
    pkg.status = targetStatus;

    let siblings = [];
    const { data: sibs } = await supabase
      .from("packages")
      .select("id, tracking_number, status")
      .eq("sender_phone", pkg.sender_phone)
      .eq("receiver_phone", pkg.receiver_phone)
      .neq("status", "delivered");
    siblings = sibs || [];
    
    if (stoppedRef.current) return;
    setLoading(false);

    // Trigger parent state updates
    if (onUpdated) onUpdated();

    setError("");
    setScanned((prev) => {
      if (prev.find((s) => s.pkg.id === pkg.id)) return prev;
      return [{ pkg, siblings, at: now }, ...prev];
    });

    // Auto-close scanner modal and register in parent's validation checklist session
    if (onOpenPackage) {
      setTimeout(() => {
        onOpenPackage(pkg);
      }, 400); // Small delay to allow the haptic buzz to finish playing
    }
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
            fps: 20
          },
          onDecoded,
          () => {}
        );
        startPromiseRef.current = p;
        await p;
        isScanningRef.current = true;

        try {
          const capabilities = qr.getRunningTrackCapabilities();
          if (capabilities.torch) {
            setTorchSupported(true);
          }
        } catch (e) {
          console.warn("Torch check failed:", e);
        }

        if (stoppedRef.current) {
          await qr.stop();
          isScanningRef.current = false;
          qr.clear();
        } else {
          if (mounted) setStarting(false);
          setTimeout(startTracking, 300);
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

    function startTracking() {
      if (stoppedRef.current) return;
      const videoEl = document.querySelector("#scanner-area video");
      if (!videoEl) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      // Offscreen canvas for jsQR fallback frame capture
      const offscreen = document.createElement("canvas");
      const offscreenCtx = offscreen.getContext("2d");

      // ─── Scan state shared between the two loops ───────────────────────────
      let codeDetected = false;
      let lastScanTime = 0;

      // ─── SCAN LOOP — throttled async (runs every ~150ms) ──────────────────
      const scanLoop = async () => {
        if (stoppedRef.current || !videoEl || !canvasRef.current) return;

        const now = Date.now();
        if (now - lastScanTime > 150) {
          lastScanTime = now;

          if (window.BarcodeDetector) {
            try {
              const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
              const barcodes = await detector.detect(videoEl);
              if (barcodes.length > 0) {
                const barcode = barcodes[0];
                codeDetected = true;
                if (barcode.rawValue && !stoppedRef.current) {
                  successRef.current.active = true;
                  onDecoded(barcode.rawValue);
                }
              } else {
                codeDetected = false;
              }
            } catch (e) { codeDetected = false; }
          } else {
            // CPU Fallback with jsQR
            if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
              offscreen.width = videoEl.videoWidth;
              offscreen.height = videoEl.videoHeight;
              try {
                offscreenCtx.drawImage(videoEl, 0, 0, offscreen.width, offscreen.height);
                const imgData = offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height);
                const code = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: "dontInvert"
                });
                if (code) {
                  codeDetected = true;
                  if (code.data && !stoppedRef.current) {
                    successRef.current.active = true;
                    onDecoded(code.data);
                  }
                } else {
                  codeDetected = false;
                }
              } catch (e) { codeDetected = false; }
            }
          }
        }

        if (!stoppedRef.current) {
          setTimeout(scanLoop, 50);
        }
      };
      scanLoop();

      // ─── DRAW LOOP — 60fps via requestAnimationFrame ───────────────────────
      // Laser animation: sine-wave for natural ease-in-out
      // One full cycle = 1.8 seconds → phase increments by (2π / (1.8 * 60)) per frame
      const CYCLE_FRAMES = 1.8 * 60; // ~108 frames per full up→down→up cycle
      const PHASE_STEP = (2 * Math.PI) / CYCLE_FRAMES;

      const drawLoop = (timestamp) => {
        if (stoppedRef.current || !canvasRef.current) return;

        // Sync canvas size to video element
        if (canvas.width !== videoEl.clientWidth || canvas.height !== videoEl.clientHeight) {
          canvas.width = videoEl.clientWidth;
          canvas.height = videoEl.clientHeight;
        }

        if (!ctx || canvas.width === 0 || canvas.height === 0) {
          loopRef.current = requestAnimationFrame(drawLoop);
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Frame rect (static, centered)
        const rx = (canvas.width - 240) / 2;
        const ry = (canvas.height - 240) / 2;
        const rw = 240;
        const rh = 240;

        // ── Success fade-out logic ──────────────────────────────────────────
        if (successRef.current.active) {
          successRef.current.alpha = Math.min(1, successRef.current.alpha + 0.04); // ~25 frames = 0.4s fade
        } else {
          successRef.current.alpha = Math.max(0, successRef.current.alpha - 0.05);
        }
        const fadeAlpha = successRef.current.alpha;
        // When fully faded out after success we stop drawing the overlay
        const overlayAlpha = 1 - fadeAlpha * 0.95; // dims to near-invisible on success

        // ── 1. Semi-transparent dark overlay with cutout ───────────────────
        // Use a clipping region trick: fill full rect then clear the scan square
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${0.55 * overlayAlpha})`;
        // Draw overlay as 4 rects around the clear viewport
        ctx.fillRect(0, 0, canvas.width, ry);                                // Top
        ctx.fillRect(0, ry + rh, canvas.width, canvas.height - (ry + rh));  // Bottom
        ctx.fillRect(0, ry, rx, rh);                                          // Left
        ctx.fillRect(rx + rw, ry, canvas.width - (rx + rw), rh);            // Right
        ctx.restore();

        // ── 2. Rounded corner brackets ─────────────────────────────────────
        const len = 28;   // arm length
        const rad = 6;    // corner radius
        const bracketColor = codeDetected ? `rgba(16,185,129,${overlayAlpha})` : `rgba(255,255,255,${overlayAlpha})`;
        ctx.strokeStyle = bracketColor;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Helper: draw one rounded L-bracket
        // (sx, sy) = arm start X, arm start Y for horizontal arm
        // corner is at (cx, cy); vertical arm goes to (vx, vy)
        const drawBracket = (hx1, hy1, cx, cy, vx, vy) => {
          ctx.beginPath();
          ctx.moveTo(hx1, hy1);
          ctx.arcTo(cx, cy, vx, vy, rad);
          ctx.lineTo(vx, vy);
          ctx.stroke();
        };

        // Top-Left
        drawBracket(rx + len, ry, rx, ry, rx, ry + len);
        // Top-Right
        drawBracket(rx + rw - len, ry, rx + rw, ry, rx + rw, ry + len);
        // Bottom-Left
        drawBracket(rx + len, ry + rh, rx, ry + rh, rx, ry + rh - len);
        // Bottom-Right
        drawBracket(rx + rw - len, ry + rh, rx + rw, ry + rh, rx + rw, ry + rh - len);

        // ── 3. Gradient laser line with ease-in-out (sine wave) ────────────
        if (!successRef.current.active) {
          // Advance laser phase
          smoothRectRef.current.laserPhase = (smoothRectRef.current.laserPhase || 0) + PHASE_STEP;

          // sin goes -1 → 1 → -1; map to [ry+12, ry+rh-12]
          const sinVal = Math.sin(smoothRectRef.current.laserPhase); // -1 to 1
          const laserY = ry + 12 + ((sinVal + 1) / 2) * (rh - 24);

          // Gradient: transparent → blue → transparent (horizontal fade)
          const grad = ctx.createLinearGradient(rx, laserY, rx + rw, laserY);
          grad.addColorStop(0,    `rgba(59,130,246,0)`);
          grad.addColorStop(0.12, `rgba(59,130,246,${0.9 * overlayAlpha})`);
          grad.addColorStop(0.5,  `rgba(99,179,255,${overlayAlpha})`);
          grad.addColorStop(0.88, `rgba(59,130,246,${0.9 * overlayAlpha})`);
          grad.addColorStop(1,    `rgba(59,130,246,0)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(rx + 4, laserY);
          ctx.lineTo(rx + rw - 4, laserY);
          ctx.stroke();

          // Subtle glow beneath the laser
          const glowGrad = ctx.createLinearGradient(rx, laserY, rx + rw, laserY);
          glowGrad.addColorStop(0,    `rgba(59,130,246,0)`);
          glowGrad.addColorStop(0.5,  `rgba(59,130,246,${0.18 * overlayAlpha})`);
          glowGrad.addColorStop(1,    `rgba(59,130,246,0)`);
          ctx.strokeStyle = glowGrad;
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(rx + 4, laserY);
          ctx.lineTo(rx + rw - 4, laserY);
          ctx.stroke();
        }

        // ── 4. Subtle inner highlight fill ─────────────────────────────────
        ctx.fillStyle = codeDetected
          ? `rgba(16,185,129,${0.06 * overlayAlpha})`
          : `rgba(255,255,255,${0.015 * overlayAlpha})`;
        ctx.fillRect(rx, ry, rw, rh);

        loopRef.current = requestAnimationFrame(drawLoop);
      };

      loopRef.current = requestAnimationFrame(drawLoop);
    }

    const timer = setTimeout(startScanner, 250);
    return () => {
      mounted = false;
      clearTimeout(timer);
      safeStop();
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current);
      }
    };
  }, []);

  async function toggleTorch() {
    const qr = qrRef.current;
    if (!qr) return;
    try {
      const wantTorch = !isTorchOn;
      await qr.applyVideoConstraints({
        advanced: [{ torch: wantTorch }]
      });
      setIsTorchOn(wantTorch);
    } catch (err) {
      console.warn("Failed to toggle torch:", err);
    }
  }

  async function handleFileScan(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    await safeStop();
    setLoading(true);

    const qr = new Html5Qrcode("scanner-area", { verbose: false });
    try {
      const decodedText = await qr.scanFile(file, true);
      await onDecoded(decodedText);
    } catch (err) {
      setError(lang === "ar" ? "لم يتم العثور على رمز QR في الصورة" : "Aucun QR code trouvé dans l'image");
      setLoading(false);
      setTimeout(restartScanner, 2500);
    }
  }

  async function restartScanner() {
    if (stoppedRef.current) return;
    setLoading(true);
    setError("");
    stoppedRef.current = false;
    
    try {
      const qr = new Html5Qrcode("scanner-area", { verbose: false });
      qrRef.current = qr;
      
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) return;
      
      let cameraId = devices[0].id;
      const backCamera = devices.find(d => 
        d.label.toLowerCase().includes("back") || 
        d.label.toLowerCase().includes("rear") || 
        d.label.toLowerCase().includes("environment") ||
        d.label.toLowerCase().includes("arrière")
      );
      if (backCamera) cameraId = backCamera.id;
      
      const p = qr.start(
        cameraId,
        { 
          fps: 15,
          videoConstraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: "environment",
            focusMode: "continuous"
          }
        },
        onDecoded,
        () => {}
      );
      startPromiseRef.current = p;
      await p;
      isScanningRef.current = true;
      setLoading(false);
      setStarting(false);
      
      try {
        const capabilities = qr.getRunningTrackCapabilities();
        if (capabilities.torch) setTorchSupported(true);
      } catch (e) {}
      
      setTimeout(startTracking, 300);
    } catch (err) {
      console.warn("Failed to restart scanner:", err);
      setLoading(false);
    }
  }

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

  function handleOpenWaQueue() {
    const queue = scanned.map((item) => {
      const agencyName = agencies.find((a) => a.id === item.pkg.agency_id)?.name || "—";
      const waData = buildWhatsAppLink(item.pkg, "receiver", agencyName, lang, t);
      return {
        pkg: item.pkg,
        wa: waData,
        sent: false
      };
    });
    setWaQueue(queue);
  }

  function getAgencyName(id) {
    return agencies.find((a) => a.id === id)?.name || "—";
  }

  return (
    <div className="scanner-fullscreen-modal">
      {/* Telegram-style Top Header with semi-translucent backdrop and inline targeted agency info */}
      <header className="scanner-header" style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "auto",
        minHeight: 64,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: "14px 16px",
        zIndex: 10006,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        gap: 6
      }}>
        <div style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="scanner-header-back" onClick={handleClose} style={{ position: "static", background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
              {lang === "ar" ? "→" : "←"}
            </button>
            <span className="scanner-header-title" style={{ fontSize: 18, fontWeight: 600 }}>
              {t.scanTitle}
            </span>
          </div>
          {scanned.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: "600", background: "rgba(251, 191, 36, 0.15)", padding: "4px 10px", borderRadius: 12 }}>
              {scanned.length} {t.scanCount}
            </span>
          )}
        </div>
        {expectedAgency && (
          <div style={{
            fontSize: 12,
            fontWeight: "600",
            color: "#fbbf24",
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingLeft: 28,
            paddingRight: 28
          }}>
            🎯 {lang === "ar" ? `الوكالة المستهدفة: ${expectedAgency}` : `Agence cible : ${expectedAgency}`}
          </div>
        )}
      </header>

      {/* Fullscreen camera container */}
      <div className="scanner-camera-container" style={{ position: "relative" }}>
        <div id="scanner-area" style={{ width: "100%", height: "100%" }}></div>
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 10002,
            pointerEvents: "none"
          }}
        />
      </div>

      {/* Viewfinder Target Layer (Static scan hint) */}
      {!error && !starting && (
        <div className="scanner-viewfinder-overlay" style={{ pointerEvents: "none", justifyContent: "flex-end", paddingBottom: 130 }}>
          <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.8)", textShadow: "0 2px 4px rgba(0,0,0,0.8)", fontWeight: "600" }}>
            {t.scanHint}
          </div>
        </div>
      )}

      {/* Sibling React loaders */}
      {starting && !error && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10004, background: "#000" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24 }}>📷</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
              {lang === "ar" ? "جاري تشغيل الكاميرا..." : "Démarrage de la caméra..."}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ position: "absolute", top: 80, left: 16, right: 16, zIndex: 10005, background: "rgba(239, 68, 68, 0.95)", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 13, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Hidden File Input for Gallery Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        style={{ display: "none" }} 
        onChange={handleFileScan} 
      />

      {/* Floating Controls Row (Flashlight & Gallery image scan) */}
      <div className="scanner-floating-controls">
        {torchSupported && (
          <button
            onClick={toggleTorch}
            className={`scanner-circle-btn ${isTorchOn ? "active" : ""}`}
            title={lang === "ar" ? "الفلاش" : "Flashlight"}
          >
            🔦
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="scanner-circle-btn"
          title={lang === "ar" ? "المعرض" : "Galerie"}
        >
          🖼️
        </button>
      </div>



      {/* WhatsApp Queue Modal */}
      {waQueue.length > 0 && (
        <div className="modal-bg" onClick={() => setWaQueue([])} style={{ zIndex: 10006 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
              🟢 {lang === "ar" ? "إرسال إشعارات واتساب" : "Envoyer WhatsApp en masse"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 14 }}>
              {lang === "ar" 
                ? `قم بإرسال الرسائل الجاهزة للزبناء (${waQueue.filter(q => q.sent).length}/${waQueue.length} تم إرساله)`
                : `Envoyez les messages pré-remplis (${waQueue.filter(q => q.sent).length}/${waQueue.length} envoyés)`
              }
            </div>
            
            <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {waQueue.map((item, index) => (
                <div key={item.pkg.id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: 10,
                  background: item.sent ? "rgba(16, 185, 129, 0.08)" : "var(--surface-2)",
                  border: item.sent ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid var(--border)",
                  borderRadius: 8
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: item.sent ? "#10b981" : "var(--text)" }}>
                      {item.pkg.tracking_number} • {item.pkg.receiver_name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                      📱 {item.wa.phone}
                    </div>
                  </div>
                  <a
                    href={item.wa.link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      setWaQueue(prev => prev.map((q, idx) => 
                        idx === index ? { ...q, sent: true } : q
                      ));
                    }}
                    style={{
                      textDecoration: "none",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "6px 12px",
                      borderRadius: 6,
                      background: item.sent ? "rgba(16, 185, 129, 0.15)" : "#10b981",
                      color: item.sent ? "#10b981" : "#fff",
                      border: item.sent ? "1px solid rgba(16, 185, 129, 0.3)" : "none"
                    }}
                  >
                    {item.sent ? (lang === "ar" ? "تم ✓" : "Envoyé ✓") : (lang === "ar" ? "إرسال 🟢" : "Envoyer 🟢")}
                  </a>
                </div>
              ))}
            </div>
            
            <button className="btn-sm btn-block" onClick={() => setWaQueue([])} style={{ margin: 0 }}>
              {lang === "ar" ? "إغلاق" : "Fermer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
