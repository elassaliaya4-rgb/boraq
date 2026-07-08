import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../lib/context";

export default function PackagesTable({ packages, onManage, onRefresh }) {
  const { t, lang } = useApp();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds]     = useState([]);
  const [hoveredIdx, setHoveredIdx]       = useState(null); // index of card under finger
  const [busy, setBusy]                   = useState(false);

  // refs
  const pressTimerRef  = useRef(null);
  const isDragging     = useRef(false);
  const lastDragIdx    = useRef(null);
  const listRef        = useRef(null);

  if (!packages || !packages.length) {
    return <div className="empty">{t?.noPackages || "No Packages"}</div>;
  }

  // ─── Utility: which card index is at a given clientY ───────────────────────
  function getIdxAtY(clientY) {
    if (!listRef.current) return null;
    const cards = listRef.current.querySelectorAll("[data-pkg-idx]");
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return Number(card.getAttribute("data-pkg-idx"));
      }
    }
    return null;
  }

  // ─── Scale helper: Instagram-style proximity magnification ─────────────────
  // Card under finger → 1.12x, neighbours ±1 → 1.05x, ±2 → 1.02x, rest → 1x
  function getScale(idx) {
    if (hoveredIdx === null) return 1;
    const d = Math.abs(idx - hoveredIdx);
    if (d === 0) return 1.12;
    if (d === 1) return 1.05;
    if (d === 2) return 1.02;
    return 1;
  }

  // ─── Touch handlers ────────────────────────────────────────────────────────
  function handleTouchStart(e, idx, pId) {
    setHoveredIdx(idx); // immediate magnification on touch

    if (selectionMode) {
      isDragging.current = true;
      lastDragIdx.current = idx;
      return;
    }

    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null;
      setSelectionMode(true);
      setSelectedIds([pId]);
      isDragging.current  = true;
      lastDragIdx.current = idx;
      if (navigator.vibrate) { try { navigator.vibrate([40, 30, 40]); } catch (_) {} }
    }, 500);
  }

  function handleTouchMove(e) {
    const clientY  = e.touches[0].clientY;
    const newIdx   = getIdxAtY(clientY);

    // always update hovered index for magnification
    if (newIdx !== null) setHoveredIdx(newIdx);

    if (!isDragging.current) {
      // cancel long-press if user scrolls
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      return;
    }

    e.preventDefault(); // only block scroll when drag-selecting

    if (newIdx === null || newIdx === lastDragIdx.current) return;
    lastDragIdx.current = newIdx;

    const pId = packages[newIdx]?.id;
    if (!pId) return;

    setSelectedIds(prev => {
      if (prev.includes(pId)) return prev;
      if (navigator.vibrate) { try { navigator.vibrate(18); } catch (_) {} }
      return [...prev, pId];
    });
  }

  function handleTouchEnd() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    isDragging.current  = false;
    lastDragIdx.current = null;
    setHoveredIdx(null);
  }

  // ─── Selection helpers ─────────────────────────────────────────────────────
  function toggleSelect(pId) {
    setSelectedIds(prev =>
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  }

  function handleRowClick(p) {
    if (selectionMode) { toggleSelect(p.id); } else { onManage(p); }
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
    if (!selectedIds.length) return;
    const msg = lang === "ar"
      ? `هل أنت متأكد من حذف ${selectedIds.length} طرود؟`
      : `Supprimer les ${selectedIds.length} colis ?`;
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("packages").delete().in("id", selectedIds);
      if (error) throw error;
      setSelectedIds([]);
      setSelectionMode(false);
      if (onRefresh) onRefresh();
    } catch (e) { alert("Error: " + e.message); }
    finally { setBusy(false); }
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
            <button onClick={cancelSelection} style={{
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px", color: "var(--text)", cursor: "pointer", padding: "5px 10px", fontSize: "13px"
            }}>✕</button>
            <span style={{ fontWeight: "700", fontSize: "14px", color: "#93c5fd" }}>
              {selectedIds.length} {lang === "ar" ? "محدد" : "sélectionnés"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={toggleSelectAll} style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "8px", color: "var(--text)", cursor: "pointer",
              padding: "5px 10px", fontSize: "11px", fontWeight: "600"
            }}>
              {selectedIds.length === packages.length
                ? (lang === "ar" ? "إلغاء الكل" : "Désélectionner")
                : (lang === "ar" ? "تحديد الكل" : "Tout sélect.")}
            </button>
            <button onClick={handleDeleteSelected} disabled={busy || !selectedIds.length} style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none",
              borderRadius: "8px", color: "#fff", cursor: "pointer", padding: "5px 12px",
              fontSize: "11px", fontWeight: "700", boxShadow: "0 2px 8px rgba(239,68,68,0.4)",
              opacity: busy ? 0.6 : 1
            }}>
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
                  if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
                }}
                className={`clickable-row ${isSelected ? "selected-row" : ""}`}
                style={{ cursor: "pointer", transition: "all 0.2s ease", background: isSelected ? "rgba(59,130,246,0.08)" : "", userSelect: "none" }}
              >
                {selectionMode && (
                  <td>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)}
                      onClick={(e) => e.stopPropagation()} style={{ transform: "scale(1.2)", cursor: "pointer" }} />
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

      {/* ── Mobile Card List ── */}
      <div
        ref={listRef}
        className="mobile-only-list"
        dir={dir}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {packages?.map((p, idx) => {
          const isSelected = selectedIds.includes(p.id);
          const scale      = getScale(idx);
          const isActive   = scale > 1.08; // directly under finger

          return (
            <div
              key={p.id}
              data-pkg-id={p.id}
              data-pkg-idx={idx}
              onClick={() => handleRowClick(p)}
              onTouchStart={(e) => handleTouchStart(e, idx, p.id)}
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.08))"
                  : "var(--surface)",
                border: isSelected
                  ? "1.5px solid rgba(59,130,246,0.5)"
                  : isActive
                    ? "1.5px solid rgba(59,130,246,0.3)"
                    : "1px solid var(--border)",
                borderRadius: isActive ? 22 : 14,
                padding: "13px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: isActive
                  ? "0 8px 24px rgba(59,130,246,0.22)"
                  : isSelected
                    ? "0 4px 16px rgba(59,130,246,0.18)"
                    : "0 1px 4px rgba(0,0,0,0.1)",
                userSelect: "none",
                // Fast spring for direct finger card, slow ease for neighbours
                transition: `transform ${isActive ? "0.08s" : "0.18s"} cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease, border-radius 0.15s ease, border 0.15s ease`,
                transform: `scale(${scale})`,
                transformOrigin: "center center",
                zIndex: isActive ? 10 : scale > 1 ? 5 : 1
              }}
            >
              {/* Circular checkbox — slides in when selection mode */}
              <div style={{
                width: selectionMode ? "24px" : "0px",
                height: "24px",
                overflow: "hidden",
                transition: "width 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <div style={{
                  width: isActive ? "26px" : "22px",
                  height: isActive ? "26px" : "22px",
                  borderRadius: "50%",
                  border: isSelected ? "none" : `2px solid ${isActive ? "#3b82f6" : "var(--text-dim)"}`,
                  background: isSelected
                    ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                    : isActive ? "rgba(59,130,246,0.18)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s cubic-bezier(0.34,1.56,0.64,1)",
                  boxShadow: isSelected ? "0 0 10px rgba(59,130,246,0.5)" : isActive ? "0 0 8px rgba(59,130,246,0.35)" : "none"
                }}>
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>

              {/* Card content */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: "700", color: "var(--text)" }}>
                    {p.tracking_number}
                  </span>
                  <span className={`status ${p.status}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                    {t?.[p.status] || p.status}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
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
