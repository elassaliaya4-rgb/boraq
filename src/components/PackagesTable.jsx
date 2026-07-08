import { useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../lib/context";

export default function PackagesTable({ packages, onManage, onRefresh }) {
  const { t, lang } = useApp();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);

  // ─── Long-press & drag-select refs (Telegram style) ────────────────────────
  const pressTimerRef  = useRef(null);
  const isDragging     = useRef(false);   // are we in a drag-select gesture?
  const dragStartId    = useRef(null);    // id of the card where drag started
  const lastDraggedId  = useRef(null);    // last card we hovered over during drag
  const listRef        = useRef(null);    // ref to the mobile card list container

  if (!packages || !packages.length) {
    return <div className="empty">{t?.noPackages || "No Packages"}</div>;
  }

  // ── get package id from a touch Y position ─────────────────────────────────
  function getPkgIdAtY(clientY) {
    if (!listRef.current) return null;
    const cards = listRef.current.querySelectorAll("[data-pkg-id]");
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return card.getAttribute("data-pkg-id");
      }
    }
    return null;
  }

  // ── Long-press start ────────────────────────────────────────────────────────
  function handleTouchStart(e, pId) {
    if (selectionMode) {
      // In selection mode: start drag tracking immediately
      isDragging.current = true;
      dragStartId.current = pId;
      lastDraggedId.current = pId;
      return;
    }
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);

    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null;
      // Activate selection mode
      setSelectionMode(true);
      setSelectedIds([pId]);
      isDragging.current = true;
      dragStartId.current = pId;
      lastDraggedId.current = pId;
      if (navigator.vibrate) {
        try { navigator.vibrate([40, 30, 40]); } catch (e) {}
      }
    }, 500); // 500ms hold (faster than before)
  }

  // ── Drag move: auto-select cards under finger ──────────────────────────────
  function handleTouchMove(e) {
    if (!isDragging.current) {
      // Cancel long-press if user scrolls significantly
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      return;
    }
    e.preventDefault(); // Prevent scroll during drag-select
    const touch = e.touches[0];
    const hoveredId = getPkgIdAtY(touch.clientY);
    if (!hoveredId || hoveredId === lastDraggedId.current) return;
    lastDraggedId.current = hoveredId;

    // Auto-select the card under the finger
    setSelectedIds(prev => {
      if (prev.includes(hoveredId)) return prev;
      if (navigator.vibrate) {
        try { navigator.vibrate(15); } catch (e) {}
      }
      return [...prev, hoveredId];
    });
  }

  // ── Touch end: clean up drag state ─────────────────────────────────────────
  function handleTouchEnd() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    isDragging.current = false;
    dragStartId.current = null;
    lastDraggedId.current = null;
  }

  function toggleSelect(pId) {
    setSelectedIds(prev =>
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  }

  function handleRowClick(p) {
    if (selectionMode) {
      toggleSelect(p.id);
    } else {
      onManage(p);
    }
  }

  function toggleSelectAll() {
    setSelectedIds(
      selectedIds.length === packages.length ? [] : packages.map(p => p.id)
    );
  }

  function cancelSelection() {
    setSelectedIds([]);
    setSelectionMode(false);
    isDragging.current = false;
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    const confirmMsg = lang === "ar"
      ? `هل أنت متأكد من حذف ${selectedIds.length} طرود المحددة؟`
      : `Supprimer les ${selectedIds.length} colis sélectionnés ?`;
    if (!confirm(confirmMsg)) return;

    setBusy(true);
    try {
      const { error } = await supabase.from("packages").delete().in("id", selectedIds);
      if (error) throw error;
      setSelectedIds([]);
      setSelectionMode(false);
      if (onRefresh) onRefresh();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div className="table-wrap" dir={dir} style={{ background: "none", border: "none", position: "relative" }}>

      {/* ── Selection Action Bar ── */}
      {selectionMode && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.08))",
          border: "1px solid rgba(59,130,246,0.3)",
          padding: "10px 14px",
          borderRadius: "14px",
          marginBottom: "12px",
          boxShadow: "0 4px 16px rgba(59,130,246,0.15)",
          animation: "fade-in 0.2s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={cancelSelection}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: "var(--text)",
                cursor: "pointer",
                padding: "5px 10px",
                fontSize: "13px"
              }}
            >✕</button>
            <span style={{ fontWeight: "700", fontSize: "14px", color: "#93c5fd" }}>
              {selectedIds.length} {lang === "ar" ? "محدد" : "sélectionnés"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={toggleSelectAll}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                color: "var(--text)",
                cursor: "pointer",
                padding: "5px 10px",
                fontSize: "11px",
                fontWeight: "600"
              }}
            >
              {selectedIds.length === packages.length
                ? (lang === "ar" ? "إلغاء الكل" : "Désélectionner")
                : (lang === "ar" ? "تحديد الكل" : "Tout sélect.")}
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={busy || selectedIds.length === 0}
              style={{
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                padding: "5px 12px",
                fontSize: "11px",
                fontWeight: "700",
                boxShadow: "0 2px 8px rgba(239,68,68,0.4)",
                opacity: busy ? 0.6 : 1
              }}
            >
              🗑️ {lang === "ar" ? "حذف" : "Supprimer"}
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop Table ── */}
      <table className="desktop-only-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            {selectionMode && <th style={{ width: "40px" }}></th>}
            <th>{t?.trackingNumber}</th>
            <th>{t?.receiverName}</th>
            <th>{t?.destination}</th>
            <th>{t?.status}</th>
          </tr>
        </thead>
        <tbody>
          {packages?.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <tr
                key={p.id}
                onClick={() => handleRowClick(p)}
                onMouseDown={() => {
                  if (!selectionMode) {
                    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
                    pressTimerRef.current = setTimeout(() => {
                      pressTimerRef.current = null;
                      setSelectionMode(true);
                      setSelectedIds([p.id]);
                    }, 600);
                  }
                }}
                onMouseUp={() => {
                  if (pressTimerRef.current) {
                    clearTimeout(pressTimerRef.current);
                    pressTimerRef.current = null;
                  }
                }}
                className={`clickable-row ${isSelected ? "selected-row" : ""}`}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: isSelected ? "rgba(59, 130, 246, 0.08)" : "",
                  userSelect: "none"
                }}
              >
                {selectionMode && (
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ transform: "scale(1.2)", cursor: "pointer" }}
                    />
                  </td>
                )}
                <td><b>{p.tracking_number}</b></td>
                <td>{p.receiver_name}</td>
                <td>{p.destination}</td>
                <td><span className={`status ${p.status}`}>{t?.[p.status] || p.status}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Mobile Card List – Telegram drag-select ── */}
      <div
        ref={listRef}
        className="mobile-only-list"
        dir={dir}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {packages?.map((p) => {
          const isSelected = selectedIds.includes(p.id);
          return (
            <div
              key={p.id}
              data-pkg-id={p.id}
              onClick={() => handleRowClick(p)}
              onTouchStart={(e) => handleTouchStart(e, p.id)}
              className={`clickable-row ${isSelected ? "selected-card" : ""}`}
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.08))"
                  : "var(--surface)",
                border: isSelected
                  ? "1px solid rgba(59,130,246,0.45)"
                  : "1px solid var(--border)",
                borderRadius: 14,
                padding: "12px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: isSelected
                  ? "0 4px 16px rgba(59,130,246,0.2)"
                  : "0 2px 8px rgba(0,0,0,0.12)",
                userSelect: "none",
                transition: "all 0.18s ease",
                transform: isSelected ? "scale(0.995)" : "scale(1)"
              }}
            >
              {/* Animated checkbox (appears in selection mode) */}
              <div style={{
                width: selectionMode ? "22px" : "0px",
                height: "22px",
                overflow: "hidden",
                transition: "width 0.2s ease",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <div style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: isSelected ? "none" : "2px solid var(--text-dim)",
                  background: isSelected
                    ? "linear-gradient(135deg, var(--primary), #6366f1)"
                    : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.18s ease",
                  boxShadow: isSelected ? "0 0 8px rgba(59,130,246,0.5)" : "none"
                }}>
                  {isSelected && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: "700", color: "var(--text)" }}>
                    {p.tracking_number}
                  </span>
                  <span className={`status ${p.status}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                    {t?.[p.status] || p.status}
                  </span>
                </div>
                <div className="card-meta-row" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>
                    👤 {p.receiver_name}
                  </span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>
                    📍 {p.destination}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
