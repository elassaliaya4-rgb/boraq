// ألوان الحالات
export const statusColors = {
  pending: "#888780",
  inTransit: "#378ADD",
  arrived: "#EF9F27",
  delivered: "#1D9E75",
};

export const statusBg = {
  pending: "rgba(148,163,184,0.15)",
  inTransit: "rgba(59,130,246,0.15)",
  arrived: "rgba(245,158,11,0.15)",
  delivered: "rgba(34,197,94,0.15)",
};

// صناعة رابط واتساب جاهز بالرسالة
export function buildWhatsAppLink(pkg, who, agencyName, lang, t) {
  const name = who === "sender" ? pkg.sender_name : pkg.receiver_name;
  const rawPhone = who === "sender" ? pkg.sender_phone : pkg.receiver_phone;
  const phone = (rawPhone || "").replace(/[^0-9]/g, "");

  const arrived = pkg.status === "arrived" || pkg.status === "delivered";
  let msg;
  if (lang === "ar") {
    msg =
      `السلام عليكم ${name}،\n` +
      `الطرد رقم ${pkg.tracking_number} (${pkg.weight} كغ) ` +
      (arrived
        ? `وصل لـ ${agencyName} ✅\nتقدر تجي تاخدو.`
        : `راه ${t[pkg.status]}.`) +
      `\nتاريخ الإرسال: ${pkg.date_sent}\n\nشكرا — Boraq ⚡`;
  } else {
    msg =
      `Bonjour ${name},\n` +
      `Le colis ${pkg.tracking_number} (${pkg.weight} kg) ` +
      (arrived
        ? `est arrivé à ${agencyName} ✅\nVous pouvez venir le récupérer.`
        : `est ${t[pkg.status]}.`) +
      `\nDate d'envoi: ${pkg.date_sent}\n\nMerci — Boraq ⚡`;
  }

  return {
    phone,
    msg,
    link: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
  };
}

// توليد رقم تتبع
export function genTracking() {
  return "BRQ-" + Date.now().toString().slice(-7);
}
