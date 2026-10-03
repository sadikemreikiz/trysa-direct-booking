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
  /**
   * Restaurant hours, every day; must match the Google Business Profile (2026-10-02). Shown in
   * the footer and on the menu page, and given to Google in the structured data.
   */
  restaurantHours: { opens: "09:00", closes: "23:00" },
  /** Check-out time (check-in is flexible, see the FAQ) */
  checkoutTime: "12:00",
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

/** Translated captions of the site's photos (keys of the dictionary's `gallery`). */
export type PhotoLabel =
  | "aerial"
  | "restaurant"
  | "table"
  | "plates"
  | "corner"
  | "breakfast"
  | "grill"
  | "gozleme"
  | "chicken";

/**
 * Home page gallery: the place and its food, none of them repeated from the room cards or the
 * restaurant section above. The first photo is shown large. `alt` is a room name, or a
 * translated caption. `width`: large versions narrower than 1600 px. `focus`: object-position.
 */
export const galleryImages: {
  src: string;
  alt: string | { label: PhotoLabel };
  width?: number;
  focus?: string;
}[] = [
  { src: "/img/gallery/trysa-aerial.jpg", alt: { label: "aerial" }, width: 1236 },
  {
    src: "/img/gallery/restaurant-evening.jpg",
    alt: { label: "restaurant" },
    width: 1200,
    focus: "object-[50%_70%]",
  },
  { src: "/img/gallery/breakfast-table.jpg", alt: { label: "table" }, width: 1087 },
  { src: "/img/gallery/grill-plates.jpg", alt: { label: "plates" }, width: 1018 },
  { src: "/img/gallery/trysa-corner.jpg", alt: { label: "corner" }, width: 900 },
];

/**
 * Food photos for the restaurant section (large first) and the menu page. `focus` is the
 * object-position that keeps the dish in view when the photo is cropped to a wide frame.
 */
export const foodPhotos: { src: string; label: PhotoLabel; width: number; focus: string }[] = [
  { src: "/img/food/serpme-kahvalti.jpg", label: "breakfast", width: 1130, focus: "object-center" },
  { src: "/img/food/karisik-izgara.jpg", label: "grill", width: 963, focus: "object-[50%_45%]" },
  { src: "/img/food/gozleme.jpg", label: "gozleme", width: 1037, focus: "object-[50%_70%]" },
];
