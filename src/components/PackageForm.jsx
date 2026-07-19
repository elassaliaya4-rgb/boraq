import { useState, useEffect } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import { genTracking } from "../lib/helpers";

const COUNTRIES = [
  { code: "FR", flag: "🇫🇷", prefix: "33", name: "France" },
  { code: "ES", flag: "🇪🇸", prefix: "34", name: "Espagne" },
  { code: "MA", flag: "🇲🇦", prefix: "212", name: "Maroc" },
  { code: "BE", flag: "🇧🇪", prefix: "32", name: "Belgique" },
  { code: "IT", flag: "🇮🇹", prefix: "39", name: "Italie" },
  { code: "DE", flag: "🇩🇪", prefix: "49", name: "Allemagne" },
  { code: "GB", flag: "🇬🇧", prefix: "44", name: "Royaume-Uni" },
  { code: "NL", flag: "🇳🇱", prefix: "31", name: "Pays-Bas" }
];

function CountrySelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find(c => c.prefix === value) || COUNTRIES[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "11px 14px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          borderRadius: "10px",
          fontSize: "14px",
          cursor: "pointer",
          height: "44px",
          whiteSpace: "nowrap"
        }}
      >
        <span style={{ fontSize: "16px" }}>{selected.flag}</span>
        <span style={{ fontWeight: "600" }}>+{selected.prefix}</span>
        <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>▼</span>
      </button>

      {open && (
        <>
          <div 
            onClick={() => setOpen(false)} 
            style={{ position: "fixed", inset: 0, zIndex: 999 }} 
          />
          <div
            style={{
              position: "absolute",
              top: "48px",
              left: 0,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              zIndex: 1000,
              maxHeight: "220px",
              overflowY: "auto",
              width: "200px"
            }}
          >
            {COUNTRIES.map(c => (
              <div
                key={c.code}
                onClick={() => {
                  onChange(c.prefix);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: "13px",
                  transition: "background 0.2s",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  color: "var(--text)"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontSize: "16px" }}>{c.flag}</span>
                <span style={{ fontWeight: "600", flex: 1, textAlign: "left" }}>{c.name}</span>
                <span style={{ color: "var(--text-dim)" }}>+{c.prefix}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PackageForm({ agencies, onClose, onSaved }) {
  const { t, profile, lang } = useApp();
  const isAdmin = profile?.role === "admin";

  // Determine current agency info & currency (€ for Europe/France, DH for Morocco)
  const currentAgency = agencies.find((a) => a.id === profile?.agency_id);
  const agencyCity = currentAgency?.city || currentAgency?.name || "";
  
  // Dynamic currency detection
  const isEuropeAgency = /paris|france|madrid|espagne|bruxelles|belgique|roma|italie|berlin|allemagne|london/i.test(agencyCity + " " + (currentAgency?.name || ""));
  const currency = isEuropeAgency ? "€" : "DH";

  // Available destination agencies (excluding current agency)
  const availableAgencies = agencies.filter((a) => a.id !== profile?.agency_id);

  const [form, setForm] = useState({
    sender_name: "",
    sender_phone_local: "",
    sender_country_prefix: isEuropeAgency ? "33" : "212",
    receiver_name: "",
    receiver_phone_local: "",
    receiver_country_prefix: isEuropeAgency ? "212" : "33",
    origin: agencyCity || "Maroc",
    destination: "",
    weight: "",
    date_sent: new Date().toISOString().slice(0, 10),
    agency_id: "",
    price_per_kg: isEuropeAgency ? 2 : 20,
    payer: "receiver",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Prefill Origin automatically from creator agency
  useEffect(() => {
    if (agencyCity) {
      setForm((f) => ({ ...f, origin: agencyCity }));
    }
  }, [agencyCity]);

  function handleAgencyChange(agencyId) {
    set("agency_id", agencyId);
    const selectedAg = agencies.find((a) => a.id === agencyId);
    if (selectedAg) {
      set("destination", selectedAg.city || selectedAg.name);
    } else {
      set("destination", "");
    }
  }

  async function save() {
    if (!form.agency_id) {
      setErr(t.chooseAgency);
      return;
    }
    if (!form.sender_phone_local || !form.receiver_phone_local) {
      setErr(lang === "ar" ? "المرجو إدخال أرقام الهواتف" : "Veuillez entrer les numéros de téléphone");
      return;
    }

    setBusy(true);
    setErr("");

    const tracking = genTracking();
    const createdByName = isAdmin
      ? "Admin"
      : currentAgency?.name || "Agence";

    // Clean up local phone inputs (strip leading zeros)
    const cleanSenderLocal = form.sender_phone_local.replace(/^0+/, "");
    const cleanReceiverLocal = form.receiver_phone_local.replace(/^0+/, "");

    const senderPhone = form.sender_country_prefix + cleanSenderLocal;
    const receiverPhone = form.receiver_country_prefix + cleanReceiverLocal;

    const { data: pkg, error } = await supabase
      .from("packages")
      .insert({
        tracking_number: tracking,
        sender_name: form.sender_name || "—",
        sender_phone: senderPhone,
        receiver_name: form.receiver_name || "—",
        receiver_phone: receiverPhone,
        origin: form.origin || agencyCity || "—",
        destination: form.destination || "—",
        weight: parseFloat(form.weight) || 0,
        date_sent: form.date_sent,
        agency_id: form.agency_id,
        status: "pending",
        created_by: isAdmin ? "admin" : "agency",
        created_by_name: createdByName,
        price_per_kg: parseFloat(form.price_per_kg) || (isEuropeAgency ? 2 : 20),
        payer: form.payer || "receiver",
        payment_status: "unpaid",
      })
      .select()
      .single();

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    await supabase.from("notifications").insert({
      target: "agency",
      agency_id: form.agency_id,
      package_id: pkg.id,
      message: `${tracking} — ${form.origin} → ${form.destination}`,
      is_read: false,
    });

    if (!isAdmin) {
      await supabase.from("notifications").insert({
        target: "admin",
        agency_name: createdByName,
        package_id: pkg.id,
        message: `${tracking} — ${form.origin} → ${form.destination}`,
        is_read: false,
      });
    }

    setBusy(false);
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>{t.addPackage}</span>
        </h2>
        {err && <div className="error">{err}</div>}

        <div className="field">
          <label>{t.senderName}</label>
          <input value={form.sender_name} onChange={(e) => set("sender_name", e.target.value)} />
        </div>

        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>{t.senderPhone}</span>
          </label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <CountrySelector 
              value={form.sender_country_prefix} 
              onChange={(prefix) => set("sender_country_prefix", prefix)} 
            />
            <input 
              type="tel"
              value={form.sender_phone_local} 
              onChange={(e) => set("sender_phone_local", e.target.value.replace(/[^0-9]/g, ""))} 
              placeholder="612345678" 
              style={{ flex: 1, height: "44px" }}
            />
          </div>
        </div>

        <div className="field">
          <label>{t.receiverName}</label>
          <input value={form.receiver_name} onChange={(e) => set("receiver_name", e.target.value)} />
        </div>

        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>{t.receiverPhone}</span>
          </label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <CountrySelector 
              value={form.receiver_country_prefix} 
              onChange={(prefix) => set("receiver_country_prefix", prefix)} 
            />
            <input 
              type="tel"
              value={form.receiver_phone_local} 
              onChange={(e) => set("receiver_phone_local", e.target.value.replace(/[^0-9]/g, ""))} 
              placeholder="612345678" 
              style={{ flex: 1, height: "44px" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }} className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>{t.weight} ({t.kg})</span>
            </label>
            <input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="10" />
          </div>
          <div style={{ flex: 1 }} className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>{t.dateSent}</span>
            </label>
            <input type="date" value={form.date_sent} onChange={(e) => set("date_sent", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }} className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span>{t.pricePerKg} ({currency})</span>
            </label>
            <input type="number" value={form.price_per_kg} onChange={(e) => set("price_per_kg", e.target.value)} placeholder={isEuropeAgency ? "2" : "20"} />
          </div>
          <div style={{ flex: 1 }} className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>{t.payer}</span>
            </label>
            <select value={form.payer} onChange={(e) => set("payer", e.target.value)}>
              <option value="receiver">{t.receiver}</option>
              <option value="sender">{t.sender}</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>{t.destAgency}</span>
          </label>
          <select value={form.agency_id} onChange={(e) => handleAgencyChange(e.target.value)}>
            <option value="">— {t.chooseAgency} —</option>
            {availableAgencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.city})
              </option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? "..." : t.save}
          </button>
          <button className="btn-sm" onClick={onClose}>
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
