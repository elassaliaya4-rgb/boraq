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

// صناعة رابط واتساب ذكي بتحديد دولة الهاتف تلقائياً ورابط التتبع المباشر
export function buildWhatsAppLink(pkg, who, agencyName, lang, t) {
  const name = who === "sender" ? pkg.sender_name : pkg.receiver_name;
  const rawPhone = who === "sender" ? pkg.sender_phone : pkg.receiver_phone;
  const phone = (rawPhone || "").replace(/[^0-9]/g, "");

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
      `Su paquete N° ${pkg.tracking_number} (${pkg.weight || 0} kg) ` +
      (arrived ? `ha llegado a la agencia ${agencyName} ✅\nPuede pasar a recogerlo.` : `está en camino.`) +
      `\n\n📍 Rastrear su paquete en tiempo real:\n${trackLink}\n\n` +
      `السلام عليكم ${name}، طردك رقم ${pkg.tracking_number} في الطريق إليك.\n` +
      `تتبع طردك مباشرة عبر الرابط:\n${trackLink}\n\nGracias — Boraq ⚡`;
  } else if (isFrance) {
    // French + Arabic
    msg =
      `Bonjour ${name} 👋\n` +
      `Votre colis N° ${pkg.tracking_number} (${pkg.weight || 0} kg) ` +
      (arrived ? `est arrivé à l'agence ${agencyName} ✅\nVous pouvez venir le récupérer.` : `est en cours d'acheminement.`) +
      `\n\n📍 Suivez votre colis en temps réel:\n${trackLink}\n\n` +
      `السلام عليكم ${name}، طردك رقم ${pkg.tracking_number} في الطريق إليك.\n` +
      `تتبع طردك مباشرة عبر الرابط:\n${trackLink}\n\nMerci — Boraq ⚡`;
  } else if (isUK) {
    // English + Arabic
    msg =
      `Hello ${name} 👋\n` +
      `Your parcel N° ${pkg.tracking_number} (${pkg.weight || 0} kg) ` +
      (arrived ? `has arrived at ${agencyName} agency ✅\nYou can pick it up.` : `is on its way.`) +
      `\n\n📍 Track your parcel in real-time:\n${trackLink}\n\n` +
      `السلام عليكم ${name}، طردك رقم ${pkg.tracking_number} في الطريق إليك.\n` +
      `تتبع طردك مباشرة عبر الرابط:\n${trackLink}\n\nThank you — Boraq ⚡`;
  } else {
    // Morocco / Default: Arabic + French
    msg =
      `السلام عليكم ${name} 👋\n` +
      `طردك رقم ${pkg.tracking_number} (${pkg.weight || 0} كغ) ` +
      (arrived ? `وصل لـ ${agencyName} ✅\nتقدر تجي تاخدو.` : `راه فـ الطريق إليك.`) +
      `\n\n📍 يمكنك تتبع الطرد مباشرة عبر الرابط:\n${trackLink}\n\n` +
      `Bonjour ${name}, votre colis N° ${pkg.tracking_number} est en cours d'acheminement.\nSuivez-le ici: ${trackLink}\n\nشكرا — Boraq ⚡`;
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
