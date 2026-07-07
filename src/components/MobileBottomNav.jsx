export default function MobileBottomNav({ tabs, activeTab, onChange }) {
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);
  const percentWidth = 100 / tabs.length;

  // Butter-smooth sliding backdrop pill styles like iOS/Instagram
  const indicatorStyle = {
    position: "absolute",
    top: "6px",
    bottom: "6px",
    left: `calc(${activeIndex * percentWidth}% + 6px)`,
    width: `calc(${percentWidth}% - 12px)`,
    background: "rgba(59, 130, 246, 0.12)",
    borderRadius: "20px",
    transition: "left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
    pointerEvents: "none",
    border: "1px solid rgba(59, 130, 246, 0.25)",
    boxShadow: "0 2px 10px rgba(59, 130, 246, 0.1)"
  };

  return (
    <div className="mobile-bottom-nav" style={{
      display: "flex",
      position: "fixed",
      bottom: "16px",
      left: "16px",
      right: "16px",
      height: "64px",
      background: "rgba(15, 23, 42, 0.82)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "26px",
      boxShadow: "0 12px 36px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      zIndex: 999,
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 6px",
      userSelect: "none"
    }}>
      {/* Sliding Active Pill */}
      {activeIndex !== -1 && <div style={indicatorStyle} />}

      {/* Tabs */}
      {tabs.map((tab) => {
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
              transition: "color 0.25s ease",
              padding: 0
            }}
          >
            {/* SVG Icon wrapper */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              transition: "transform 0.2s ease",
              transform: isActive ? "scale(1.12)" : "scale(1)"
            }}>
              {tab.icon}
            </div>

            {/* Notification Badge if provided */}
            {tab.badge > 0 && (
              <span className="badge" style={{
                position: "absolute",
                top: "6px",
                right: "calc(50% - 20px)",
                background: "#ef4444",
                color: "#fff",
                fontSize: "8px",
                fontWeight: "800",
                padding: "2px 5px",
                borderRadius: "10px",
                minWidth: "14px",
                textAlign: "center",
                boxShadow: "0 0 8px rgba(239, 68, 68, 0.5)",
                border: "1px solid rgba(15, 23, 42, 0.8)"
              }}>
                {tab.badge}
              </span>
            )}

            <span style={{ 
              opacity: isActive ? 1 : 0.85,
              fontSize: "9px",
              letterSpacing: "0.2px"
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
