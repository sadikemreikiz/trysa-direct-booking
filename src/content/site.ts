export const site = {
  name: "Trysa",
  tagline: "Antik Trysa'nın eteğinde, doğayla baş başa",
  phoneLabel: "0555 572 15 69",
  phoneHref: "tel:+905555721569",
  whatsapp: "https://wa.me/905555721569",
  instagram: "https://instagram.com/trysarestaurant",
  instagramLabel: "@trysarestaurant",
  address: "Davazlar, Gölbaşı Mevkii, 07572 Demre / Antalya",
  /** The Google rating is live (features/reviews); this is only the last known value, shown if Google is unreachable (2026-09-30). */
  ratingFallback: { rating: 4.9, count: 292 },
  /** Airbnb Superhost badge (confirmed on the Airbnb listings, 2026-10-01) */
  superhost: true,
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
  shortLink: {
    tr: "trysacamping.com/yol",
    en: "trysacamping.com/directions",
    de: "trysacamping.com/anfahrt",
  },
};

/** Features only some rooms have, on top of the shared amenities (as listed on Airbnb). */
export type RoomExtra = "ac" | "fridge";

// Each room is separate. Prices from Airbnb; to be confirmed with the family.
export const stays: {
  slug: string;
  title: string;
  desc: string;
  price: string;
  img: string;
  extras?: RoomExtra[];
}[] = [
  {
    slug: "ambar-1",
    title: "Ambar-1",
    desc: "Doğa içinde 2 kişilik ahşap oda",
    price: "1.350 ₺",
    img: "/img/rooms/ambar-1/kapak.jpg",
  },
  {
    slug: "ambar-2",
    title: "Ambar-2",
    desc: "Doğa içinde 2 kişilik ahşap oda",
    price: "1.350 ₺",
    img: "/img/rooms/ambar-2/kapak.jpg",
  },
  {
    slug: "ambar-3",
    title: "Ambar-3",
    desc: "Doğa içinde 2 tek yataklı ahşap oda",
    price: "1.150 ₺",
    img: "/img/rooms/ambar-3/kapak.jpg",
  },
  {
    slug: "kulube-1",
    title: "Kulübe-1",
    desc: "Konforlu ahşap oda, doğa manzaralı",
    price: "1.500 ₺",
    img: "/img/rooms/kulube-1/kapak.jpg",
    extras: ["ac"],
  },
  {
    slug: "kulube-2",
    title: "Kulübe-2",
    desc: "Konforlu ahşap oda, doğa manzaralı",
    price: "1.500 ₺",
    img: "/img/rooms/kulube-2/kapak.jpg",
    extras: ["ac"],
  },
  {
    slug: "tiny-house",
    title: "Tiny House",
    desc: "Konforlu, müstakil, doğa manzaralı",
    price: "1.750 ₺",
    img: "/img/rooms/tiny-house/kapak.jpg",
    extras: ["ac", "fridge"],
  },
  {
    slug: "kamp",
    title: "Kamp & Karavan Alanı",
    desc: "Kendi çadırın veya karavanınla",
    price: "Fiyat için sor",
    img: "",
  },
];

/** Home page gallery. `alt` is a room name, or a key of the gallery's translated labels. */
export const galleryImages: { src: string; alt: string | { label: "corner" | "view" } }[] = [
  { src: "/img/rooms/ambar-1/kapak.jpg", alt: "Ambar-1" },
  { src: "/img/rooms/kulube-1/kapak.jpg", alt: "Kulübe-1" },
  { src: "/img/rooms/tiny-house/kapak.jpg", alt: "Tiny House" },
  { src: "/img/rooms/ambar-1/5.jpg", alt: { label: "view" } },
  { src: "/img/rooms/ambar-3/kapak.jpg", alt: "Ambar-3" },
  { src: "/img/rooms/kulube-2/kapak.jpg", alt: "Kulübe-2" },
  { src: "/img/rooms/ambar-2/kapak.jpg", alt: "Ambar-2" },
  { src: "/img/gallery/trysa-corner.jpg", alt: { label: "corner" } },
];
