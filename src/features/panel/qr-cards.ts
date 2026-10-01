/**
 * The printable QR cards. Each points to a short link without a language: /menu opens the
 * menu in the language of the guest's phone, /yorum redirects to Google's review screen.
 * The cards speak all three site languages, with "sen"/"du" like the site. Title and hint are
 * given line by line, so a phrase never breaks in the middle.
 */
export const QR_CARDS = {
  menu: {
    label: "Menü kartı",
    where: "Masalara",
    about:
      "Misafir telefonuyla okutunca menü kendi dilinde açılır. Fiyat değişse de kart aynı kalır, yeniden basmak gerekmez.",
    path: "/menu",
    title: ["Menü · Menu · Speisekarte"],
    hint: ["Kamerayla okut · Scan with your camera", "Mit der Kamera scannen"],
  },
  yorum: {
    label: "Yorum kartı",
    where: "Odalara ve kasaya",
    about:
      "Okutunca doğrudan Google'da Trysa'ya yorum yazma ekranı açılır. Google, yorum karşılığında indirim ya da hediye vermeyi yasaklıyor; sadece rica edebilirsin.",
    path: "/yorum",
    // Asks every guest the same way: Google forbids asking only happy guests
    title: ["Nasıldı?", "How was it? · Wie war's?"],
    hint: ["Google'da yorum yaz · Write a Google review", "Schreib uns eine Google-Bewertung"],
  },
} as const;

export type QrCardKey = keyof typeof QR_CARDS;
export type QrCardKind = (typeof QR_CARDS)[QrCardKey];

export function isQrCardKey(value: string | undefined): value is QrCardKey {
  return value !== undefined && Object.hasOwn(QR_CARDS, value);
}
