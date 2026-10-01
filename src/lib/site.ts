export const site = {
  name: "Trysa",
  tagline: "Antik Trysa'nın eteğinde, doğayla baş başa",
  phoneLabel: "0555 572 15 69",
  phoneHref: "tel:+905555721569",
  whatsapp: "https://wa.me/905555721569",
  instagram: "https://instagram.com/trysarestaurant",
  instagramLabel: "@trysarestaurant",
  address: "Davazlar, Gölbaşı Mevkii, 07572 Demre / Antalya",
  /** The Google rating is live (lib/reviews); this is only the last known value, shown if Google is unreachable (2026-09-30). */
  ratingFallback: { rating: 4.9, count: 292 },
  superhost: true, // Airbnb Superhost badge: keep once confirmed, otherwise set to false
};

/**
 * Location: what guests struggle with most. Single source: the Google Business Profile
 * (verified via the Places API, 2026-09-30). The site, business card, WhatsApp and email all use it.
 */
export const place = {
  lat: 36.2624282,
  lng: 29.8912955,
  /** Typing this into Google Maps finds the exact spot */
  plusCode: "7V6R+XG Demre",
  /** Business listing (photos, reviews, directions) */
  googleMapsUrl: "https://maps.google.com/?cid=1839563921786307451",
  /**
   * Direct directions (navigation). destination is coordinates without spaces (a space in the
   * redirect header breaks on some phones); thanks to place_id Google shows the business name.
   */
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=36.2624282,29.8912955&destination_place_id=ChIJ9YlxOcPtwRQRe4Oy86Nxhxk",
  /** Google's "write a review" screen (the review card QR points here: trysacamping.com/yorum) */
  reviewUrl: "https://search.google.com/local/writereview?placeid=ChIJ9YlxOcPtwRQRe4Oy86Nxhxk",
  /** Short directions links (redirected in next.config.ts), per guest language */
  shortLink: { tr: "trysacamping.com/yol", en: "trysacamping.com/directions", de: "trysacamping.com/anfahrt" },
};

// Each room is separate. Prices from Airbnb; to be confirmed with the family.
export const stays = [
  {
    slug: "ambar-1",
    title: "Ambar-1",
    desc: "Doğa içinde 2 kişilik ahşap oda",
    price: "1.350 ₺",
    tone: "#c7b79a",
    photo: "Ambar-1",
    img: "/img/rooms/ambar-1/kapak.jpg",
  },
  {
    slug: "ambar-2",
    title: "Ambar-2",
    desc: "Doğa içinde 2 kişilik ahşap oda",
    price: "1.350 ₺",
    tone: "#c2b193",
    photo: "Ambar-2",
    img: "/img/rooms/ambar-2/kapak.jpg",
  },
  {
    slug: "ambar-3",
    title: "Ambar-3",
    desc: "Doğa içinde 2 tek yataklı ahşap oda",
    price: "1.150 ₺",
    tone: "#bcaa8a",
    photo: "Ambar-3",
    img: "/img/rooms/ambar-3/kapak.jpg",
  },
  {
    slug: "kulube-1",
    title: "Kulübe-1",
    desc: "Konforlu ahşap oda, doğa manzaralı",
    price: "1.500 ₺",
    tone: "#a7b29a",
    photo: "Kulübe-1",
    img: "/img/rooms/kulube-1/kapak.jpg",
  },
  {
    slug: "kulube-2",
    title: "Kulübe-2",
    desc: "Konforlu ahşap oda, doğa manzaralı",
    price: "1.500 ₺",
    tone: "#9fae93",
    photo: "Kulübe-2",
    img: "/img/rooms/kulube-2/kapak.jpg",
  },
  {
    slug: "tiny-house",
    title: "Tiny House",
    desc: "Konforlu, müstakil, doğa manzaralı",
    price: "1.750 ₺",
    tone: "#cbb892",
    photo: "Tiny House",
    img: "/img/rooms/tiny-house/kapak.jpg",
  },
  {
    slug: "kamp",
    title: "Kamp & Karavan Alanı",
    desc: "Kendi çadırın veya karavanınla",
    price: "Fiyat için sor",
    tone: "#b0a78e",
    photo: "Kamp alanı",
    img: "",
  },
];

export const amenities = [
  "Ücretsiz WiFi",
  "Ücretsiz otopark",
  "Serpme kahvaltı",
  "Klima / ısıtma",
  "Sıcak su & duş",
  "Mangal / barbekü",
  "Evcil hayvan dostu",
  "Çocuk oyun alanı",
];

export const experiences = [
  { title: "Trysa yürüyüşü", desc: "Tesisten antik kente" },
  { title: "Kekova teknesi", desc: "Batık şehir turu, 15 dk" },
  { title: "Likya Yolu", desc: "Kapıdan yürüyüş rotaları" },
  { title: "Çocuk & hayvanlar", desc: "Oyun alanı · tavşan, tavuk, kedi, köpek" },
];

export const distances = [
  { place: "Kekova & Batık Şehir", time: "15 dk" },
  { place: "Myra Antik Kenti", time: "16 dk" },
  { place: "Aziz Nikolaos Kilisesi", time: "16 dk" },
  { place: "Kaş merkez", time: "29 dk" },
  { place: "Antalya Havalimanı", time: "~2,5 sa" },
];

export const galleryTiles = [
  { label: "Odalar", tone: "#c7b79a" },
  { label: "Tiny house", tone: "#a7b29a" },
  { label: "Kamp", tone: "#b9a98c" },
  { label: "Restoran", tone: "#4a5a45" },
  { label: "Doğa", tone: "#8da07e" },
  { label: "Hayvanlar", tone: "#c9af8b" },
  { label: "Gün batımı", tone: "#b7a6c4" },
  { label: "Trysa", tone: "#a9a38c" },
];

export const reviews = [
  {
    text: "Doğanın içinde huzurlu bir yer, yemekler mükemmel, insanlar çok sıcak. Kesinlikle döneceğiz.",
    author: "Google misafir yorumu",
  },
  {
    text: "Kekova turu için mükemmel konum, insanlar çok sıcak.",
    author: "Google misafir yorumu",
  },
  {
    text: "Kışın bile açık, doğayla baş başa huzurlu bir mola.",
    author: "Google misafir yorumu",
  },
];

export const faqs = [
  "Evcil hayvan kabul ediyor musunuz?",
  "Check-in / check-out saatleri?",
  "Kahvaltı dahil mi?",
  "Kapora / iptal koşulları?",
  "Havalimanından nasıl gelirim?",
  "Kamp alanında elektrik var mı?",
];

export const galleryImages = [
  { src: "/img/rooms/ambar-1/kapak.jpg", label: "Ambar-1" },
  { src: "/img/rooms/kulube-1/kapak.jpg", label: "Kulübe-1" },
  { src: "/img/rooms/tiny-house/kapak.jpg", label: "Tiny House" },
  { src: "/img/rooms/ambar-3/kapak.jpg", label: "Ambar-3" },
  { src: "/img/rooms/kulube-2/kapak.jpg", label: "Kulübe-2" },
  { src: "/img/rooms/ambar-2/kapak.jpg", label: "Ambar-2" },
  { src: "/img/gallery/g5.jpg", label: "Doğa" },
  { src: "/img/gallery/g6.jpg", label: "Doğa" },
];
