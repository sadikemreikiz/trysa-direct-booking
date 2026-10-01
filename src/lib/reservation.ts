export type ReservationInput = {
  checkin: string;
  checkout: string;
  adults: string;
  children: string;
  unit: string;
  name: string;
  phone: string;
  email: string;
  note: string;
};

export const WHATSAPP_NUMBER = "905555721569";

/** Turns a request into readable text (for both WhatsApp and email). */
export function reservationSummary(d: ReservationInput): string {
  const lines = [
    "Yeni rezervasyon talebi — Trysa",
    "",
    `Giriş: ${d.checkin || "-"}`,
    `Çıkış: ${d.checkout || "-"}`,
    `Kişi: ${d.adults} yetişkin${
      Number(d.children) > 0 ? `, ${d.children} çocuk` : ""
    }`,
    `Konaklama: ${d.unit}`,
    `Ad: ${d.name}`,
    `Telefon: ${d.phone}`,
  ];
  if (d.email.trim()) lines.push(`E-posta: ${d.email}`);
  if (d.note.trim()) lines.push(`Not: ${d.note}`);
  return lines.join("\n");
}

export function whatsappUrl(d: ReservationInput): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    reservationSummary(d),
  )}`;
}
