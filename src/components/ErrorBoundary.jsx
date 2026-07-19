import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Boraq App Error Caught by Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a, #1e293b)",
          color: "#fff",
          padding: "24px",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(16px)",
            borderRadius: "24px",
            padding: "32px 24px",
            maxWidth: "400px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚡</div>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "800", color: "#60a5fa" }}>
              Boraq Logistics
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: "0 0 16px 0", lineHeight: 1.5 }}>
              حدث خطأ بسيط في الاتصال أو تحديث البيانات. يرجى إعادة تحميل الصفحة.
            </p>
            {this.state.error && (
              <div style={{
                marginBottom: "16px",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                fontSize: "11px",
                textAlign: "left",
                wordBreak: "break-all",
                fontFamily: "monospace"
              }}>
                ⚠️ {String(this.state.error?.message || this.state.error)}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: "14px",
                border: "none",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(59,130,246,0.4)"
              }}
            >
              🔄 تحديث الصفحة / Actualiser
            </button>
            <button
              onClick={() => {
                try { localStorage.clear(); } catch(e){}
                window.location.href = "/";
              }}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                marginTop: "10px"
              }}
            >
              🧹 مسح التخزين المؤقت والدخول / Reconnexion
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
