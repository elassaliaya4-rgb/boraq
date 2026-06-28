import { useState } from "react";
import { useApp } from "../lib/context";
import { supabase } from "../lib/supabase";
import { genTracking } from "../lib/helpers";

export default function PackageForm({ agencies, onClose, onSaved }) {
  const { t, profile } = useApp();
  const isAdmin = profile?.role === "admin";

  const [form, setForm] = useState({
    sender_name: "",
    sender_phone: "",
    receiver_name: "",
    receiver_phone: "",
    origin: "",
    destination: "",
    weight: "",
    date_sent: new Date().toISOString().slice(0, 10),
    agency_id: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.agency_id) {
      setErr(t.chooseAgency);
      return;
    }
    setBusy(true);
    setErr("");

    const tracking = genTracking();
    const createdByName = isAdmin
      ? "Admin"
      : agencies.find((a) => a.id === profile.agency_id)?.name || "Agence";

    const { data: pkg, error } = await supabase
      .from("packages")
      .insert({
        tracking_number: tracking,
        sender_name: form.sender_name || "—",
        sender_phone: form.sender_phone || "",
        receiver_name: form.receiver_name || "—",
        receiver_phone: form.receiver_phone || "",
        origin: form.origin || "—",
        destination: form.destination || "—",
        weight: parseFloat(form.weight) || 0,
        date_sent: form.date_sent,
        agency_id: form.agency_id,
        status: "pending",
        created_by: isAdmin ? "admin" : "agency",
        created_by_name: createdByName,
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
        <h2>{t.addPackage}</h2>
        {err && <div className="error">{err}</div>}

        <div className="field">
          <label>{t.senderName}</label>
          <input value={form.sender_name} onChange={(e) => set("sender_name", e.target.value)} />
        </div>
        <div className="field">
          <label>📱 {t.senderPhone}</label>
          <input value={form.sender_phone} onChange={(e) => set("sender_phone", e.target.value)} placeholder="33XXXXXXXXX" />
        </div>
        <div className="field">
          <label>{t.receiverName}</label>
          <input value={form.receiver_name} onChange={(e) => set("receiver_name", e.target.value)} />
        </div>
        <div className="field">
          <label>📱 {t.receiverPhone}</label>
          <input value={form.receiver_phone} onChange={(e) => set("receiver_phone", e.target.value)} placeholder="212XXXXXXXXX" />
        </div>
        <div className="field">
          <label>{t.origin}</label>
          <input value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="France" />
        </div>
        <div className="field">
          <label>{t.destination}</label>
          <input value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Casablanca" />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }} className="field">
            <label>⚖️ {t.weight} ({t.kg})</label>
            <input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="10" />
          </div>
          <div style={{ flex: 1 }} className="field">
            <label>📅 {t.dateSent}</label>
            <input type="date" value={form.date_sent} onChange={(e) => set("date_sent", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>📍 {t.destAgency}</label>
          <select value={form.agency_id} onChange={(e) => set("agency_id", e.target.value)}>
            <option value="">— {t.chooseAgency} —</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                🏢 {a.name} ({a.city})
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
