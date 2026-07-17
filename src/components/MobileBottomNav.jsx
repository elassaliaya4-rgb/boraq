import { useRef, useState, useEffect } from "react";
import { useApp } from "../lib/context";

export default function MobileBottomNav({ tabs, activeTab, onChange }) {
  const navRef        = useRef(null);
  const [fingerX, setFingerX]       = useState(null); // live X position of finger
  const [touching, setTouching]     = useState(false);
  const swipeStartX   = useRef(null);
  const swipeStartY   = useRef(null);

  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { theme } = useApp();
  const isLight = theme === "light";
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  if (width > 768) return null;

  // ── get which tab index the finger is hovering over ──────────────────────
  function getTabIdxAtX(clientX) {
    if (!navRef.current) return null;
    const btns = navRef.current.querySelectorAll("[data-tab-idx]");
    for (const btn of btns) {
      const rect = btn.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        return Number(btn.getAttribute("data-tab-idx"));
      }
    }
    return null;
  }

  // ── magnification scale: Instagram Dock-style ─────────────────────────────
  // The icon under the finger → 1.45x, neighbours ±1 → 1.22x, ±2 → 1.10x
  function getMagScale(idx) {
    if (!touching || fingerX === null || !navRef.current) return 1;
    const btn = navRef.current.querySelector(`[data-tab-idx="${idx}"]`);
    if (!btn) return 1;
    const rect    = btn.getBoundingClientRect();
    const btnCenterX = rect.left + rect.width / 2;
    const dist    = Math.abs(fingerX - btnCenterX);
    const radius  = rect.width * 2.2; // magnification radius in px
    if (dist > radius) return 1;
    // smoothstep falloff
    const t = 1 - dist / radius;
    const extra = 0.12 * (t * t * (3 - 2 * t)); // 0.12 → very subtle max scale of 1.12
    return 1 + extra;
  }

  // ── touch handlers ────────────────────────────────────────────────────────
  function onTouchStart(e) {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    setFingerX(e.touches[0].clientX);
    setTouching(true);
  }

  function onTouchMove(e) {
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    const dx = clientX - swipeStartX.current;
    const dy = clientY - swipeStartY.current;

    // only track horizontal movement on the nav bar
    if (Math.abs(dy) > Math.abs(dx) * 1.5) return;
    e.stopPropagation();

    setFingerX(clientX);
  }

  function onTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - (swipeStartX.current ?? endX);
    const dy = endY - (swipeStartY.current ?? endY);

    // if mostly horizontal swipe → commit to tab under finger
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      const finalIdx = getTabIdxAtX(endX);
      if (finalIdx !== null && tabs[finalIdx]) {
        onChange(tabs[finalIdx].id);
      }
    }

    setTouching(false);
    setFingerX(null);
    swipeStartX.current = null;
    swipeStartY.current = null;
  }

  // ── Live pill position that follows the finger ────────────────────────────
  function getPillStyle() {
    const percentWidth = 100 / tabs.length;

    if (!touching || fingerX === null || !navRef.current) {
      // Snap to active tab with spring animation
      return {
        position: "absolute",
        top: "6px",
        bottom: "6px",
        left: `calc(${activeIndex * percentWidth}% + 6px)`,
        width: `calc(${percentWidth}% - 12px)`,
        background: isLight ? "rgba(37, 99, 235, 0.12)" : "rgba(59, 130, 246, 0.14)",
        borderRadius: "20px",
        transition: "left 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)",
        pointerEvents: "none",
        border: isLight ? "1px solid rgba(37, 99, 235, 0.2)" : "1px solid rgba(59, 130, 246, 0.28)",
        boxShadow: isLight ? "0 2px 10px rgba(37, 99, 235, 0.08)" : "0 2px 10px rgba(59, 130, 246, 0.12)"
      };
    }

    // Live: compute pill left based on fingerX inside the nav
    const navRect   = navRef.current.getBoundingClientRect();
    const navWidth  = navRect.width;
    const tabWidth  = navWidth / tabs.length;
    const pillWidth = tabWidth - 12;
    // pill center tracks finger, clamped inside nav
    const fingerInNav  = fingerX - navRect.left;
    const pillCenter   = Math.max(pillWidth / 2 + 6, Math.min(navWidth - pillWidth / 2 - 6, fingerInNav));
    const pillLeft     = pillCenter - pillWidth / 2;

    return {
      position: "absolute",
      top: "6px",
      bottom: "6px",
      left: `${pillLeft}px`,
      width: `${pillWidth}px`,
      background: isLight ? "rgba(37, 99, 235, 0.15)" : "rgba(59, 130, 246, 0.18)",
      borderRadius: "20px",
      transition: "none",           // instant follow during touch
      pointerEvents: "none",
      border: isLight ? "1px solid rgba(37, 99, 235, 0.3)" : "1px solid rgba(59, 130, 246, 0.40)",
      boxShadow: isLight ? "0 2px 14px rgba(37, 99, 235, 0.18)" : "0 2px 14px rgba(59, 130, 246, 0.25)"
    };
  }

  return (
    <div
      ref={navRef}
      className="mobile-bottom-nav"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        display: "flex",
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        height: "64px",
        background: isLight ? "rgba(255, 255, 255, 0.85)" : "rgba(15, 23, 42, 0.84)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        border: isLight ? "1px solid rgba(15, 23, 42, 0.08)" : "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "26px",
        boxShadow: isLight 
          ? "0 12px 36px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255,255,255,0.6)" 
          : "0 12px 36px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
        zIndex: 999,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 6px",
        userSelect: "none",
        touchAction: "none",
        overflow: "hidden"
      }}
    >
      {/* Sliding Active Pill — follows finger live */}
      {activeIndex !== -1 && <div style={getPillStyle()} />}

      {/* Tabs */}
      {tabs.map((tab, idx) => {
        const isActive  = tab.id === activeTab;
        const magScale  = getMagScale(idx);
        const isHot     = magScale > 1.25; // directly under finger

        return (
          <button
            key={tab.id}
            data-tab-idx={idx}
            onClick={() => onChange(tab.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              color: isActive ? "var(--primary)" : isHot ? (isLight ? "#0f172a" : "rgba(255,255,255,0.9)") : "var(--text-dim)",
              fontSize: "9px",
              fontWeight: "700",
              gap: "3px",
              flex: 1,
              height: "100%",
              cursor: "pointer",
              position: "relative",
              padding: 0,
              // Apply subtle magnification in-place without vertical jumps
              transform: `scale(${magScale.toFixed(3)}) translateY(0px)`,
              transition: touching
                ? "transform 0.06s cubic-bezier(0.34,1.56,0.64,1), color 0.1s ease"
                : "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), color 0.22s ease",
              zIndex: isHot ? 5 : 1,
              willChange: "transform"
            }}
          >
            {/* Icon wrapper */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              filter: isHot
                ? "drop-shadow(0 0 6px rgba(59,130,246,0.7))"
                : isActive
                  ? "drop-shadow(0 0 4px rgba(59,130,246,0.4))"
                  : "none",
              transition: "filter 0.1s ease"
            }}>
              {tab.icon}
            </div>

            {/* Badge */}
            {tab.badge > 0 && (
              <span style={{
                position: "absolute",
                top: "6px",
                right: "calc(50% - 20px)",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "#fff",
                fontSize: "8px",
                fontWeight: "800",
                padding: "2px 5px",
                borderRadius: "10px",
                minWidth: "14px",
                textAlign: "center",
                boxShadow: "0 0 8px rgba(239,68,68,0.55)",
                border: isLight ? "1.5px solid rgba(255,255,255,0.8)" : "1.5px solid rgba(15,23,42,0.8)"
              }}>
                {tab.badge}
              </span>
            )}

            <span style={{
              opacity: isActive ? 1 : isHot ? 0.95 : 0.72,
              fontSize: "9px",
              letterSpacing: "0.2px",
              transition: "opacity 0.15s"
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
