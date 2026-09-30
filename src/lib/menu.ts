// Fiyatlar restorandaki basılı menüyle birebir (Emre teyit etti: 2026-09-30).
// Güncelleme: aşağıdaki p (fiyat) değerlerini değiştirmen yeterli.
// n = Türkçe ad (basılı menüdeki gibi); en/de = çeviri; d = kısa içerik açıklaması (dillere göre).
// İngilizce/Almanca sayfada çeviri büyük, Türkçe ad küçük yazılır — misafir restoranda
// basılı menüdeki adı gösterebilsin diye.
import type { Locale } from "@/i18n-config";

type Text = Record<Locale, string>;
export type MenuItem = { n: string; en: string; de: string; p: string; d?: Text };
export type MenuCategory = { cat: string; items: MenuItem[] };

/** Menü kalemi adı, sayfanın diline göre. */
export function itemName(item: MenuItem, lang: Locale): string {
  return lang === "tr" ? item.n : item[lang];
}

export const menu: MenuCategory[] = [
  {
    cat: "Izgaralar",
    items: [
      { n: "Kuzu Şiş", en: "Lamb skewer", de: "Lammspieß", p: "650" },
      { n: "Köfte", en: "Grilled meatballs", de: "Gegrillte Hackfleischbällchen", p: "500" },
      { n: "Tavuk Kanat", en: "Chicken wings", de: "Hähnchenflügel", p: "480" },
      { n: "Tavuk Şiş", en: "Chicken skewer", de: "Hähnchenspieß", p: "450" },
      { n: "Karışık Izgara", en: "Mixed grill", de: "Gemischte Grillplatte", p: "970" },
    ],
  },
  {
    cat: "Kahvaltı",
    items: [
      { n: "Lüx Serpme Kahvaltı", en: "Deluxe Turkish breakfast spread", de: "Großes türkisches Frühstück", p: "700" },
      { n: "Tabak Kahvaltı", en: "Breakfast plate", de: "Frühstücksteller", p: "450" },
      { n: "Köy Tavuğu Çorbası", en: "Free-range chicken soup", de: "Landhuhn-Suppe", p: "190" },
      {
        n: "Pişi Tabağı",
        en: "Pişi plate (fried dough)",
        de: "Pişi-Teller (frittiertes Teiggebäck)",
        p: "400",
        d: {
          tr: "Pişi, domates, salatalık, peynir, reçel",
          en: "Pişi, tomato, cucumber, cheese, jam",
          de: "Pişi, Tomate, Gurke, Käse, Marmelade",
        },
      },
    ],
  },
  {
    cat: "Tavadan",
    items: [
      { n: "Kremalı Mantar Soslu Tavuk", en: "Chicken in creamy mushroom sauce", de: "Hähnchen in Champignon-Rahmsauce", p: "460" },
      { n: "Köri Soslu Tavuk", en: "Chicken in curry sauce", de: "Hähnchen in Currysauce", p: "440" },
      { n: "Kekik Soslu Tavuk", en: "Chicken in thyme sauce", de: "Hähnchen in Thymiansauce", p: "440" },
    ],
  },
  {
    cat: "Denizden Gelenler",
    items: [{ n: "Çupra", en: "Sea bream", de: "Dorade", p: "580" }],
  },
  {
    cat: "Gözleme & Tost",
    items: [
      { n: "Otlu Gözleme", en: "Gözleme with herbs", de: "Gözleme mit Kräutern", p: "200" },
      { n: "Patatesli Gözleme", en: "Gözleme with potato", de: "Gözleme mit Kartoffeln", p: "230" },
      { n: "Kaşarlı Gözleme", en: "Gözleme with cheese", de: "Gözleme mit Käse", p: "250" },
      { n: "Karışık Gözleme", en: "Mixed gözleme", de: "Gemischte Gözleme", p: "290" },
      { n: "Tost", en: "Toasted sandwich", de: "Toast", p: "170" },
    ],
  },
  {
    cat: "Salatalar",
    items: [
      { n: "Ton Balıklı Salata", en: "Tuna salad", de: "Thunfischsalat", p: "360" },
      { n: "Greek Salata", en: "Greek salad", de: "Griechischer Salat", p: "330" },
    ],
  },
  {
    cat: "Kavurmalar",
    items: [
      {
        n: "Çoban Kavurma",
        en: "Shepherd's sauté",
        de: "Hirtenpfanne",
        p: "720",
        d: {
          tr: "",
          en: "Pan-fried diced meat with vegetables",
          de: "Gebratene Fleischwürfel mit Gemüse",
        },
      },
    ],
  },
  {
    cat: "Çıtırlar",
    items: [{ n: "Patates Cips", en: "French fries", de: "Pommes frites", p: "220" }],
  },
  {
    cat: "Sıcak İçecekler",
    items: [
      { n: "Çay", en: "Turkish tea", de: "Türkischer Tee", p: "25" },
      { n: "Bitki Çayları", en: "Herbal teas", de: "Kräutertees", p: "20" },
      { n: "Türk Kahvesi", en: "Turkish coffee", de: "Türkischer Kaffee", p: "90" },
      { n: "Nescafe", en: "Instant coffee (Nescafé)", de: "Instantkaffee (Nescafé)", p: "110" },
    ],
  },
  {
    cat: "Soğuk İçecekler",
    items: [
      { n: "Kutu Kola / Fanta / Sprite", en: "Coke / Fanta / Sprite (can)", de: "Cola / Fanta / Sprite (Dose)", p: "90" },
      { n: "Meyve Suları", en: "Fruit juices", de: "Fruchtsäfte", p: "90" },
      { n: "Meyveli Soda", en: "Fruit-flavoured mineral water", de: "Mineralwasser mit Fruchtgeschmack", p: "50" },
      { n: "Sade Soda", en: "Sparkling mineral water", de: "Mineralwasser mit Kohlensäure", p: "35" },
      { n: "Şalgam", en: "Şalgam (fermented black carrot juice)", de: "Şalgam (fermentierter Schwarzkarottensaft)", p: "50" },
      { n: "Ayran", en: "Ayran (salted yoghurt drink)", de: "Ayran (salziges Joghurtgetränk)", p: "100" },
    ],
  },
];
