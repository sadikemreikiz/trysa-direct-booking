// Fiyatlar restorandaki basılı menüyle birebir (Emre teyit etti: 2026-09-30).
// Güncelleme: aşağıdaki p (fiyat) değerlerini değiştirmen yeterli; d = kısa içerik açıklaması.

export type MenuItem = { n: string; p: string; d?: string };
export type MenuCategory = { cat: string; items: MenuItem[] };

export const menu: MenuCategory[] = [
  {
    cat: "Izgaralar",
    items: [
      { n: "Kuzu Şiş", p: "650" },
      { n: "Köfte", p: "500" },
      { n: "Tavuk Kanat", p: "480" },
      { n: "Tavuk Şiş", p: "450" },
      { n: "Karışık Izgara", p: "970" },
    ],
  },
  {
    cat: "Kahvaltı",
    items: [
      { n: "Lüx Serpme Kahvaltı", p: "700" },
      { n: "Tabak Kahvaltı", p: "450" },
      { n: "Köy Tavuğu Çorbası", p: "190" },
      { n: "Pişi Tabağı", p: "400", d: "Pişi, domates, salatalık, peynir, reçel" },
    ],
  },
  {
    cat: "Tavadan",
    items: [
      { n: "Kremalı Mantar Soslu Tavuk", p: "460" },
      { n: "Köri Soslu Tavuk", p: "440" },
      { n: "Kekik Soslu Tavuk", p: "440" },
    ],
  },
  {
    cat: "Denizden Gelenler",
    items: [{ n: "Çupra", p: "580" }],
  },
  {
    cat: "Gözleme & Tost",
    items: [
      { n: "Otlu Gözleme", p: "200" },
      { n: "Patatesli Gözleme", p: "230" },
      { n: "Kaşarlı Gözleme", p: "250" },
      { n: "Karışık Gözleme", p: "290" },
      { n: "Tost", p: "170" },
    ],
  },
  {
    cat: "Salatalar",
    items: [
      { n: "Ton Balıklı Salata", p: "360" },
      { n: "Greek Salata", p: "330" },
    ],
  },
  {
    cat: "Kavurmalar",
    items: [{ n: "Çoban Kavurma", p: "720" }],
  },
  {
    cat: "Çıtırlar",
    items: [{ n: "Patates Cips", p: "220" }],
  },
  {
    cat: "Sıcak İçecekler",
    items: [
      { n: "Çay", p: "25" },
      { n: "Bitki Çayları", p: "20" },
      { n: "Türk Kahvesi", p: "90" },
      { n: "Nescafe", p: "110" },
    ],
  },
  {
    cat: "Soğuk İçecekler",
    items: [
      { n: "Kutu Kola / Fanta / Sprite", p: "90" },
      { n: "Meyve Suları", p: "90" },
      { n: "Meyveli Soda", p: "50" },
      { n: "Sade Soda", p: "35" },
      { n: "Şalgam", p: "50" },
      { n: "Ayran", p: "100" },
    ],
  },
];
