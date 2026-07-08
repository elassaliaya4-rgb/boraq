import { useState } from "react";
import { useApp } from "../lib/context";

export default function MobileHeader({ profileName, onScanClick, onLogout }) {
  const { t, lang, setLang, theme, toggleTheme } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  function handleLogoutClick() {
    setIsOpen(false);
    if (onLogout) {
      onLogout();
    }
  }

  function handleScanTap() {
    setIsOpen(false);
    if (onScanClick) {
      onScanClick();
    }
  }

  return (
    <>
      {/* Top Header Bar */}
      <header className="mobile-header" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
        paddingBottom: "14px",
        paddingLeft: "16px",
        paddingRight: "16px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 500,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
      }}>
        {/* Hamburger Menu Icon (Left) */}
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text)",
            cursor: "pointer",
            padding: "6px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          title="Menu / القائمة"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>

        {/* Brand Logo (Right) */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontWeight: "700",
          fontSize: "17px",
          color: "var(--text)"
        }}>
          <span>{lang === "ar" ? "البراق" : "Boraq"}</span>
          <span style={{ fontSize: "19px" }}>⚡</span>
        </div>
      </header>

      {/* Drawer Overlay backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            animation: "fade-in 0.25s ease"
          }}
        />
      )}

      {/* Side Slide-out Drawer */}
      <div dir={lang === "ar" ? "rtl" : "ltr"} style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        left: lang === "ar" ? "auto" : (isOpen ? 0 : "-290px"),
        right: lang === "ar" ? (isOpen ? 0 : "-290px") : "auto",
        width: "280px",
        background: "var(--surface)",
        borderRight: lang === "ar" ? "none" : "1px solid var(--border)",
        borderLeft: lang === "ar" ? "1px solid var(--border)" : "none",
        boxShadow: lang === "ar" ? "-4px 0 24px rgba(0,0,0,0.35)" : "4px 0 24px rgba(0,0,0,0.35)",
        zIndex: 1001,
        display: "flex",
        flexDirection: "column",
        transition: lang === "ar" ? "right 0.3s cubic-bezier(0.16, 1, 0.3, 1)" : "left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))"
      }}>
        {/* Drawer Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
          borderBottom: "1px solid var(--border)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 16 }}>
            <span>⚡ {lang === "ar" ? "البراق" : "Boraq"}</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-dim)",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Profile Card */}
        <div style={{
          padding: "20px 16px",
          background: "rgba(255, 255, 255, 0.02)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <div style={{ fontSize: "13px", color: "var(--text-dim)" }}>
            {lang === "ar" ? "مرحباً بك" : "Bienvenue"}
          </div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text)" }}>
            👋 {profileName || "Utilisateur"}
          </div>
        </div>

        {/* Menu Items List */}
        <div style={{
          flex: 1,
          padding: "16px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "6px"
        }}>
          {/* 1. Camera Code Scanner Option (if handler provided) */}
          {onScanClick && (
              <button 
              onClick={handleScanTap}
              className="drawer-item"
              style={{
                display: "flex",
                alignItems: "center",
                flexDirection: lang === "ar" ? "row-reverse" : "row",
                gap: "12px",
                width: "100%",
                padding: "12px 14px",
                background: "none",
                border: "none",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
                fontWeight: "500",
                textAlign: lang === "ar" ? "right" : "left",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              <span style={{ fontSize: "18px" }}>📷</span>
              <span style={{ flex: 1 }}>{t?.scan || "Scan"}</span>
            </button>
          )}

          {/* 2. Language Toggle Option */}
          <button 
            onClick={() => setLang(lang === "ar" ? "fr" : "ar")}
            className="drawer-item"
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: lang === "ar" ? "row-reverse" : "row",
              gap: "12px",
              width: "100%",
              padding: "12px 14px",
              background: "none",
              border: "none",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "14px",
              fontWeight: "500",
              textAlign: lang === "ar" ? "right" : "left",
              cursor: "pointer",
              transition: "background 0.2s"
            }}
          >
            <span style={{ fontSize: "18px" }}>🌐</span>
            <span style={{ flex: 1 }}>{lang === "ar" ? "Français" : "العربية"}</span>
          </button>

          {/* 3. Dark/Light Mode Theme Toggle Option */}
          <button 
            onClick={toggleTheme}
            className="drawer-item"
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: lang === "ar" ? "row-reverse" : "row",
              gap: "12px",
              width: "100%",
              padding: "12px 14px",
              background: "none",
              border: "none",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "14px",
              fontWeight: "500",
              textAlign: lang === "ar" ? "right" : "left",
              cursor: "pointer",
              transition: "background 0.2s"
            }}
          >
            <span style={{ fontSize: "18px" }}>{theme === "dark" ? "☀️" : "🌙"}</span>
            <span style={{ flex: 1 }}>
              {theme === "dark" 
                ? (lang === "ar" ? "الوضع المضيء" : "Mode Clair") 
                : (lang === "ar" ? "الوضع المظلم" : "Mode Sombre")}
            </span>
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* 4. Logout Option (Red accent) */}
          <button 
            onClick={handleLogoutClick}
            className="drawer-item"
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: lang === "ar" ? "row-reverse" : "row",
              gap: "12px",
              width: "100%",
              padding: "12px 14px",
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              borderRadius: "8px",
              color: "#f87171",
              fontSize: "14px",
              fontWeight: "600",
              textAlign: lang === "ar" ? "right" : "left",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <span style={{ fontSize: "18px" }}>🚪</span>
            <span style={{ flex: 1 }}>{lang === "ar" ? "تسجيل الخروج" : "Déconnexion"}</span>
          </button>
        </div>
      </div>
    </>
  );
}
