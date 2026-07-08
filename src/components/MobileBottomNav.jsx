import { useRef, useState } from "react";

export default function MobileBottomNav({ tabs, activeTab, onChange }) {
  const activeIndex   = tabs.findIndex((t) => t.id === activeTab);
  const percentWidth  = 100 / tabs.length;
  const navRef        = useRef(null);

  // ─── Swipe gesture state ────────────────────────────────────────────────────
  const swipeStartX   = useRef(null);
  const swipeStartY   = useRef(null);
  const [dragOffset, setDragOffset]   = useState(0);   // px offset while dragging
  const [isDragging, setIsDragging]   = useState(false);

  // ── Pill indicator base left (%) + drag offset (px) ────────────────────────
  const indicatorBaseLeft = `calc(${activeIndex * percentWidth}% + 6px)`;

  const indicatorStyle = {
    position: "absolute",
    top: "6px",
    bottom: "6px",
    left: isDragging
      ? `calc(${activeIndex * percentWidth}% + 6px + ${dragOffset}px)`
      : indicatorBaseLeft,
    width: `calc(${percentWidth}% - 12px)`,
    background: "rgba(59, 130, 246, 0.14)",
    borderRadius: "20px",
    transition: isDragging ? "none" : "left 0.28s cubic-bezier(0.25, 0.8, 0.25, 1)",
    pointerEvents: "none",
    border: "1px solid rgba(59, 130, 246, 0.28)",
    boxShadow: "0 2px 10px rgba(59, 130, 246, 0.12)"
  };

  // ── Touch handlers on the nav bar ──────────────────────────────────────────
  function onTouchStart(e) {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    setIsDragging(false);
    setDragOffset(0);
  }

  function onTouchMove(e) {
    if (swipeStartX.current === null) return;
    const dx = e.touches[0].clientX - swipeStartX.current;
    const dy = e.touches[0].clientY - swipeStartY.current;

    // Only treat as horizontal swipe if movement is mostly horizontal
    if (Math.abs(dx) < 8 && !isDragging) return;
    if (Math.abs(dy) > Math.abs(dx) * 1.4) return; // mostly vertical – ignore

    e.stopPropagation();
    setIsDragging(true);

    // Clamp: don't go past first/last tab
    const navWidth = navRef.current?.offsetWidth || 300;
    const tabWidth = navWidth / tabs.length;
    const minOff   = -activeIndex * tabWidth;
    const maxOff   = (tabs.length - 1 - activeIndex) * tabWidth;
    const clamped  = Math.max(minOff, Math.min(maxOff, dx));
    setDragOffset(clamped * 0.55); // 0.55 = resistance factor (rubber-band feel)
  }

  function onTouchEnd(e) {
    if (!isDragging) {
      swipeStartX.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    const threshold = 40; // px needed to commit to next tab

    setIsDragging(false);
    setDragOffset(0);
    swipeStartX.current = null;

    if (dx < -threshold && activeIndex < tabs.length - 1) {
      onChange(tabs[activeIndex + 1].id);
    } else if (dx > threshold && activeIndex > 0) {
      onChange(tabs[activeIndex - 1].id);
    }
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
        background: "rgba(15, 23, 42, 0.84)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "26px",
        boxShadow: "0 12px 36px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
        zIndex: 999,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 6px",
        userSelect: "none",
        touchAction: "none"
      }}
    >
      {/* Sliding Active Pill */}
      {activeIndex !== -1 && <div style={indicatorStyle} />}

      {/* Tabs */}
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              color: isActive ? "var(--primary)" : "var(--text-dim)",
              fontSize: "9px",
              fontWeight: "700",
              gap: "4px",
              flex: 1,
              height: "100%",
              cursor: "pointer",
              position: "relative",
              transition: "color 0.22s ease",
              padding: 0
            }}
          >
            {/* Icon */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
              transform: isActive ? "scale(1.18) translateY(-1px)" : "scale(1) translateY(0)"
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
                border: "1.5px solid rgba(15,23,42,0.8)"
              }}>
                {tab.badge}
              </span>
            )}

            <span style={{
              opacity: isActive ? 1 : 0.75,
              fontSize: "9px",
              letterSpacing: "0.2px",
              transition: "opacity 0.2s"
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
