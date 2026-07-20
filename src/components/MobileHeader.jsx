import { useState, useEffect } from "react";
import { useApp } from "../lib/context";

// iOS-style Toggle Switch Component
function ToggleSwitch({ checked, onChange, colorOn = "#3b82f6" }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: "46px",
        height: "26px",
        borderRadius: "13px",
        background: checked ? colorOn : "rgba(255,255,255,0.15)",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.3s ease",
        flexShrink: 0,
        boxShadow: checked
          ? `0 0 10px ${colorOn}55`
          : "inset 0 1px 3px rgba(0,0,0,0.3)"
      }}
    >
      <div style={{
        position: "absolute",
        top: "3px",
        left: checked ? "23px" : "3px",
        width: "20px",
        height: "20px",
        borderRadius: "10px",
        background: "white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
        transition: "left 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)"
      }} />
    </div>
  );
}

// Drawer Row helper component
function DrawerRow({ icon, label, onClick, rightContent, danger }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        borderRadius: "12px",
        background: danger ? "rgba(239,68,68,0.06)" : "transparent",
        border: danger ? "1px solid rgba(239,68,68,0.15)" : "1px solid transparent",
        transition: "background 0.18s ease",
        userSelect: "none"
      }}
      onMouseEnter={e => {
        if (!danger) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={e => {
        if (!danger) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Icon Badge */}
      <div style={{
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        background: danger
          ? "rgba(239,68,68,0.12)"
          : "rgba(59,130,246,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        flexShrink: 0
      }}>
        {icon}
      </div>

      {/* Label */}
      <span style={{
        flex: 1,
        fontSize: "14px",
        fontWeight: "500",
        color: danger ? "#f87171" : "var(--text)",
        letterSpacing: "0.01em"
      }}>
        {label}
      </span>

      {/* Right Content (toggle or chevron) */}
      {rightContent}
    </div>
  );
}

export default function MobileHeader({ profileName, onScanClick, onLogout }) {
  const { t, lang, setLang, theme, toggleTheme } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isAr = lang === "ar";

  if (width > 768) return null;

  function handleLogoutClick() {
    setIsOpen(false);
    if (onLogout) onLogout();
  }

  function handleScanTap() {
    setIsOpen(false);
    if (onScanClick) onScanClick();
  }

  return (
    <>
      {/* ── Top Header Bar ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: isAr ? "row-reverse" : "row",
        width: "100%",
        paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
        paddingBottom: "14px",
        paddingLeft: "16px",
        paddingRight: "16px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 500,
        boxShadow: "0 2px 12px rgba(0,0,0,0.12)"
      }}>
        {/* Hamburger */}
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            cursor: "pointer",
            padding: "7px",
            borderRadius: "10px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>

        {/* Brand */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontWeight: "800",
          fontSize: "17px",
          background: "linear-gradient(135deg, var(--primary), var(--accent))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>{isAr ? "البراق" : "Boraq"}</span>
        </div>

        {/* Scanner Button */}
        <button
          onClick={handleScanTap}
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--accent))",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "10px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)"
          }}
          title={isAr ? "مسح الرمز" : "Scanner"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M3 17v2a2 2 0 0 0 2 2h2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
        </button>
      </header>

      {/* ── Backdrop ── */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            animation: "fade-in 0.2s ease"
          }}
        />
      )}

      {/* ── Slide-out Drawer ── */}
      <div dir={isAr ? "rtl" : "ltr"} style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        left: isAr ? "auto" : (isOpen ? 0 : "-300px"),
        right: isAr ? (isOpen ? 0 : "-300px") : "auto",
        width: "285px",
        background: "var(--surface)",
        borderRight: isAr ? "none" : "1px solid var(--border)",
        borderLeft: isAr ? "1px solid var(--border)" : "none",
        boxShadow: isAr
          ? "-6px 0 32px rgba(0,0,0,0.4)"
          : "6px 0 32px rgba(0,0,0,0.4)",
        zIndex: 1001,
        display: "flex",
        flexDirection: "column",
        transition: isAr
          ? "right 0.32s cubic-bezier(0.16,1,0.3,1)"
          : "left 0.32s cubic-bezier(0.16,1,0.3,1)",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))"
      }}>

        {/* ── Drawer Header ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 18px",
          borderBottom: "1px solid var(--border)"
        }}>
          <div style={{
            fontWeight: "800",
            fontSize: "17px",
            background: "linear-gradient(135deg, var(--primary), var(--accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>{isAr ? "البراق" : "Boraq"}</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border)",
              color: "var(--text-dim)",
              fontSize: "14px",
              cursor: "pointer",
              padding: "5px 8px",
              borderRadius: "8px",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* ── Profile Card ── */}
        <div style={{
          margin: "14px 14px 6px",
          padding: "14px 16px",
          background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(245,158,11,0.06))",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "3px"
        }}>
          <div style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: "500", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{isAr ? "مرحباً بك" : "Bienvenue"}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 0 1 2 2v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-1.5"/></svg>
          </div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>
            {profileName || "Utilisateur"}
          </div>
        </div>

        {/* ── Menu Items ── */}
        <div style={{
          flex: 1,
          padding: "10px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          overflowY: "auto"
        }}>


          {/* Section label */}
          <div style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "var(--text-dim)",
            padding: "2px 6px 4px",
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}>
            {isAr ? "الإعدادات" : "Préférences"}
          </div>

          {/* 2. Language Toggle */}
          <DrawerRow
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
            label={isAr ? "Français" : "العربية"}
            onClick={() => setLang(isAr ? "fr" : "ar")}
            rightContent={
              <ToggleSwitch
                checked={isAr}
                onChange={() => setLang(isAr ? "fr" : "ar")}
                colorOn="#3b82f6"
              />
            }
          />

          {/* 3. Dark/Light Mode Toggle */}
          <DrawerRow
            icon={theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
            label={theme === "dark"
              ? (isAr ? "الوضع المظلم" : "Mode Sombre")
              : (isAr ? "الوضع المضيء" : "Mode Clair")}
            onClick={toggleTheme}
            rightContent={
              <ToggleSwitch
                checked={theme === "dark"}
                onChange={toggleTheme}
                colorOn="#6366f1"
              />
            }
          />

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Divider */}
          <div style={{ height: "1px", background: "var(--border)", margin: "6px 6px" }} />

          {/* 4. Logout – Premium Red Button */}
          <button
            onClick={handleLogoutClick}
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexDirection: isAr ? "row-reverse" : "row",
              boxShadow: "0 4px 18px rgba(239,68,68,0.35)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 24px rgba(239,68,68,0.55)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 4px 18px rgba(239,68,68,0.35)"}
            onTouchStart={e => e.currentTarget.style.transform = "scale(0.97)"}
            onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {/* Icon badge */}
            <div style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "17px",
              flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>

            {/* Label */}
            <span style={{
              flex: 1,
              fontSize: "14px",
              fontWeight: "700",
              color: "#fff",
              textAlign: isAr ? "right" : "left",
              letterSpacing: "0.01em"
            }}>
              {isAr ? "تسجيل الخروج" : "Déconnexion"}
            </span>

            {/* Arrow */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, transform: isAr ? "rotate(180deg)" : "none" }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

        </div>

        {/* Safe area spacer at bottom */}
        <div style={{ height: "calc(8px + env(safe-area-inset-bottom, 0px))" }} />
      </div>
    </>
  );
}
