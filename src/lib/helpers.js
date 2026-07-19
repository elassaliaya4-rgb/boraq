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

// صناعة رابط واتساب ذكي بتحديد دولة الهاتف تلقائياً ورابط التتبع ورابط موقع الوكالة (Google Maps)
export function buildWhatsAppLink(pkg, who, agencyInfo, lang, t) {
  const name = who === "sender" ? pkg.sender_name : pkg.receiver_name;
  const rawPhone = who === "sender" ? pkg.sender_phone : pkg.receiver_phone;
  const phone = (rawPhone || "").replace(/[^0-9]/g, "");

  const agencyName = typeof agencyInfo === "object" ? agencyInfo?.name || "Boraq" : (agencyInfo || "Boraq");
  let mapsLink = typeof agencyInfo === "object" ? agencyInfo?.google_maps_link : null;
  if (!mapsLink && typeof agencyInfo === "object" && (agencyInfo?.city || agencyInfo?.name)) {
    const searchQ = encodeURIComponent(`Agence ${agencyInfo.name || ""} ${agencyInfo.city || ""}`);
    mapsLink = `https://www.google.com/maps/search/?api=1&query=${searchQ}`;
  }

  const arrived = pkg.status === "arrived" || pkg.status === "delivered";
  const trackLink = `https://boraq.online/track?n=${pkg.tracking_number}`;

  let isSpain = phone.startsWith("34");
  let isFrance = phone.startsWith("33");
  let isUK = phone.startsWith("44");

  let msg = "";

  if (isSpain) {
    // Spanish + Arabic
    msg =
      `Hola ${name} 👋\n` +
      `Su paquete N. ${pkg.tracking_number} (${pkg.weight || 0} kg) ` +
      (arrived ? `ha llegado a la agencia ${agencyName} ✅\nPuede pasar a recogerlo.` : `está en camino.`) +
      `\n\n📍 Rastrear su paquete:\n${trackLink}` +
      (mapsLink ? `\n\n🗺️ Ubicación de la agencia (Google Maps):\n${mapsLink}` : "") +
      `\n\n🪪 Por favor presente su Carte Nationale / DNI (CIN) al recogerlo.` +
      `\n\nGracias — Boraq ⚡`;
  } else if (isFrance) {
    // French + Arabic
    msg =
      `Bonjour ${name} 👋\n` +
      `Votre colis N. ${pkg.tracking_number} (${pkg.weight || 0} kg) ` +
      (arrived ? `est arrivé à l'agence ${agencyName} ✅\nVous pouvez venir le récupérer.` : `est en cours d'acheminement.`) +
      `\n\n📍 Suivez votre colis en temps réel:\n${trackLink}` +
      (mapsLink ? `\n\n🗺️ Localisation Agence (Google Maps):\n${mapsLink}` : "") +
      `\n\n🪪 Veuillez vous munir de votre Carte Nationale (CIN) lors du retrait.` +
      `\n\nMerci — Boraq ⚡`;
  } else if (isUK) {
    // English + Arabic
    msg =
      `Hello ${name} 👋\n` +
      `Your parcel N. ${pkg.tracking_number} (${pkg.weight || 0} kg) ` +
      (arrived ? `has arrived at ${agencyName} agency ✅\nYou can pick it up.` : `is on its way.`) +
      `\n\n📍 Track your parcel:\n${trackLink}` +
      (mapsLink ? `\n\n🗺️ Agency Location (Google Maps):\n${mapsLink}` : "") +
      `\n\n🪪 Please bring your National ID Card (CIN) upon pickup.` +
      `\n\nThank you — Boraq ⚡`;
  } else {
    // Morocco / Default: Arabic + French
    msg =
      `السلام عليكم ${name} 👋\n` +
      `طردك رقم ${pkg.tracking_number} (${pkg.weight || 0} kg) ` +
      (arrived ? `وصل لـ ${agencyName} ✅\nتقدر تجي تاخدو.` : `راه في الطريق إليك.`) +
      `\n\n📍 يمكنك تتبع الطرد عبر الرابط:\n${trackLink}` +
      (mapsLink ? `\n\n🗺️ موقع الوكالة (Google Maps):\n${mapsLink}` : "") +
      `\n\n🪪 المرجو إحضار البطاقة الوطنية (CIN / Carte Nationale) عند الاستلام.` +
      `\n\nشكرا — Boraq ⚡`;
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
