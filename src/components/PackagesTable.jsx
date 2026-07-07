import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../lib/context";

export default function PackagesTable({ packages, onManage, onRefresh }) {
  const { t, lang } = useApp();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);

  // Long press timer tracking using useRef for synchronous access
  const pressTimerRef = useRef(null);

  if (!packages || !packages.length) {
    return <div className="empty">{t?.noPackages || "No Packages"}</div>;
  }

  function handleStart(pId) {
    if (selectionMode) return;
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
    const timer = setTimeout(() => {
      setSelectionMode(true);
      setSelectedIds([pId]);
      if (navigator.vibrate) {
        try { navigator.vibrate(60); } catch (e) {}
      }
    }, 1000); // 1-second hold
    pressTimerRef.current = timer;
  }

  function handleEnd() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

  function toggleSelect(pId) {
    if (selectedIds.includes(pId)) {
      setSelectedIds(prev => prev.filter(id => id !== pId));
    } else {
      setSelectedIds(prev => [...prev, pId]);
    }
  }

  function handleRowClick(p) {
    if (selectionMode) {
      toggleSelect(p.id);
    } else {
      onManage(p);
    }
  }

  // Select/Deselect All
  function toggleSelectAll() {
    if (selectedIds.length === packages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(packages.map(p => p.id));
    }
  }

  // Cancel Selection
  function cancelSelection() {
    setSelectedIds([]);
    setSelectionMode(false);
  }

  // Batch Delete
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

  return (
    <div className="table-wrap" style={{ background: "none", border: "none", position: "relative" }}>
      
      {/* Floating Selection Top Bar / Action Bar */}
      {selectionMode && (
        <div className="selection-bar" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "12px 16px",
          borderRadius: "12px",
          marginBottom: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          animation: "fade-in 0.2s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-sm" onClick={cancelSelection} style={{ padding: "6px 12px" }}>
              ✕
            </button>
            <span style={{ fontWeight: "600", fontSize: "14px" }}>
              {selectedIds.length} {lang === "ar" ? "محدد" : "sélectionnés"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-sm" onClick={toggleSelectAll} style={{ fontSize: "12px", padding: "6px 12px" }}>
              {selectedIds.length === packages.length 
                ? (lang === "ar" ? "إلغاء الكل" : "Désélectionner tout") 
                : (lang === "ar" ? "تحديد الكل" : "Tout sélectionner")}
            </button>
            <button 
              className="btn-danger btn-sm" 
              onClick={handleDeleteSelected} 
              disabled={busy || selectedIds.length === 0}
              style={{ fontSize: "12px", padding: "6px 14px" }}
            >
              🗑️ {lang === "ar" ? "حذف" : "Supprimer"}
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
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
                onMouseDown={() => handleStart(p.id)}
                onMouseMove={handleEnd}
                onMouseUp={handleEnd}
                onTouchStart={() => handleStart(p.id)}
                onTouchMove={handleEnd}
                onTouchEnd={handleEnd}
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

      {/* Mobile Card List View (no horizontal scroll) */}
      <div className="mobile-only-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {packages?.map((p) => {
          const isSelected = selectedIds.includes(p.id);
          return (
            <div 
              key={p.id} 
              onClick={() => handleRowClick(p)}
              onTouchStart={() => handleStart(p.id)}
              onTouchMove={handleEnd}
              onTouchEnd={handleEnd}
              onMouseDown={() => handleStart(p.id)}
              onMouseMove={handleEnd}
              onMouseUp={handleEnd}
              className={`clickable-row ${isSelected ? "selected-card" : ""}`}
              style={{ 
                background: isSelected ? "rgba(59, 130, 246, 0.1)" : "var(--surface)", 
                border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border)", 
                borderRadius: 12, 
                padding: 14, 
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                userSelect: "none"
              }}
            >
              {selectionMode && (
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={() => toggleSelect(p.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ transform: "scale(1.2)", cursor: "pointer" }}
                />
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: "700", color: "var(--text)" }}>{p.tracking_number}</span>
                  <span className={`status ${p.status}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                    {t?.[p.status] || p.status}
                  </span>
                </div>
                <div className="card-meta-row" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>👤 {p.receiver_name}</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50%" }}>📍 {p.destination}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
