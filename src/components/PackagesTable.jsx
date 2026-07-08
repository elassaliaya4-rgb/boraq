import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../lib/context";

export default function PackagesTable({ packages, onManage, onRefresh }) {
  const { t, lang } = useApp();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragHoverId, setDragHoverId] = useState(null); // card under finger during drag
  const [popIds, setPopIds] = useState(new Set());      // cards that just got selected (pop anim)
  const [busy, setBusy] = useState(false);

  // ─── Long-press & drag-select refs (Telegram style) ────────────────────────
  const pressTimerRef  = useRef(null);
  const isDragging     = useRef(false);
  const dragStartId    = useRef(null);
  const lastDraggedId  = useRef(null);
  const listRef        = useRef(null);

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

  // ── Long-press start ─────────────────────────────────────────────────
  function handleTouchStart(e, pId) {
    // Always show hover glow on the touched card immediately
    setDragHoverId(pId);

    if (selectionMode) {
      isDragging.current = true;
      dragStartId.current = pId;
      lastDraggedId.current = pId;
      return;
    }

    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);

    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null;
      setSelectionMode(true);
      setSelectedIds([pId]);
      isDragging.current = true;
      dragStartId.current = pId;
      lastDraggedId.current = pId;
      if (navigator.vibrate) {
        try { navigator.vibrate([40, 30, 40]); } catch (e) {}
      }
    }, 500);
  }

  // ── Drag move: always track finger for glow, auto-select when in drag mode ──
  function handleTouchMove(e) {
    const touch = e.touches[0];
    const hoveredId = getPkgIdAtY(touch.clientY);

    // ALWAYS update hover highlight regardless of mode
    setDragHoverId(hoveredId || null);

    if (!isDragging.current) {
      // Cancel long-press if user moves finger (scrolling)
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      return; // not in drag-select, just visual hover
    }

    e.preventDefault(); // prevent scroll only during drag-select

    if (!hoveredId || hoveredId === lastDraggedId.current) return;
    lastDraggedId.current = hoveredId;

    setSelectedIds(prev => {
      if (prev.includes(hoveredId)) return prev;
      if (navigator.vibrate) {
        try { navigator.vibrate(18); } catch (e) {}
      }
      // Trigger pop animation for this card
      setPopIds(pops => {
        const next = new Set(pops);
        next.add(hoveredId);
        setTimeout(() => setPopIds(p => { const n = new Set(p); n.delete(hoveredId); return n; }), 350);
        return next;
      });
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
    setDragHoverId(null); // remove hover highlight
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
                  : dragHoverId === p.id
                    ? "1px solid rgba(59,130,246,0.35)"
                    : "1px solid var(--border)",
                borderRadius: dragHoverId === p.id ? 20 : 14,
                padding: "12px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: popIds.has(p.id)
                  ? "0 8px 28px rgba(59,130,246,0.45)"
                  : dragHoverId === p.id
                    ? "0 6px 22px rgba(59,130,246,0.3)"
                    : isSelected
                      ? "0 4px 16px rgba(59,130,246,0.2)"
                      : "0 2px 8px rgba(0,0,0,0.12)",
                userSelect: "none",
                transition: "box-shadow 0.15s ease, border-radius 0.15s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                transform: popIds.has(p.id)
                  ? "scale(1.055)"
                  : dragHoverId === p.id
                    ? "scale(1.04)"
                    : isSelected
                      ? "scale(0.995)"
                      : "scale(1)",
                zIndex: dragHoverId === p.id ? 2 : 1
              }}
            >
              {/* Animated checkbox circle */}
              <div style={{
                width: selectionMode ? "26px" : "0px",
                height: "26px",
                overflow: "hidden",
                transition: "width 0.2s ease",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <div style={{
                  width: dragHoverId === p.id ? "26px" : "22px",
                  height: dragHoverId === p.id ? "26px" : "22px",
                  borderRadius: "50%",
                  border: isSelected ? "none" : `2px solid ${dragHoverId === p.id ? "rgba(59,130,246,0.8)" : "var(--text-dim)"}`,
                  background: isSelected
                    ? "linear-gradient(135deg, var(--primary), #6366f1)"
                    : dragHoverId === p.id
                      ? "rgba(59,130,246,0.15)"
                      : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                  boxShadow: isSelected
                    ? "0 0 12px rgba(59,130,246,0.6)"
                    : dragHoverId === p.id
                      ? "0 0 10px rgba(59,130,246,0.4)"
                      : "none"
                }}>
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
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
