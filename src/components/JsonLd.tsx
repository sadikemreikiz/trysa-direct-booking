import type { Locale } from "@/i18n-config";
import { BUSINESS_NAME, GOOGLE_MAPS_URL, HOME_DESCRIPTION, SITE_URL } from "@/lib/seo";
import { place, site } from "@/lib/site";

const CUISINE: Record<Locale, string[]> = {
  tr: ["Türk mutfağı", "Izgara", "Balık", "Ev yemekleri"],
  en: ["Turkish", "Grill", "Seafood", "Home cooking"],
  de: ["Türkisch", "Grill", "Fisch", "Hausmannskost"],
};

const AMENITIES: Record<Locale, string[]> = {
  tr: ["Ücretsiz WiFi", "Ücretsiz otopark", "Kahvaltı", "Evcil hayvan dostu", "Çocuk oyun alanı"],
  en: ["Free WiFi", "Free parking", "Breakfast", "Pet friendly", "Children's play area"],
  de: ["Kostenloses WLAN", "Kostenlose Parkplätze", "Frühstück", "Haustierfreundlich", "Kinderspielplatz"],
};

/** Google'ın işletmeyi (konaklama + restoran, puan, konum) anlaması için yapısal veri. */
export default function JsonLd({
  rating,
  count,
  lang,
}: {
  rating?: number;
  count?: number;
  lang: Locale;
}) {
  const business = {
    "@type": ["LodgingBusiness", "Restaurant"],
    "@id": `${SITE_URL}/#business`,
    name: BUSINESS_NAME,
    alternateName: ["Trysa Camping", "Trysa Restaurant", "Trysa"],
    // Google İşletme Profili ve sosyal hesaplar: site ile profilin aynı işletme olduğunu gösterir
    sameAs: [GOOGLE_MAPS_URL, site.instagram],
    description: HOME_DESCRIPTION[lang],
    url: SITE_URL,
    telephone: "+905555721569",
    priceRange: "₺₺",
    servesCuisine: CUISINE[lang],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Davazlar, Gölbaşı Mevkii",
      addressLocality: "Demre",
      addressRegion: "Antalya",
      postalCode: "07572",
      addressCountry: "TR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: place.lat,
      longitude: place.lng,
    },
    image: [
      `${SITE_URL}/og.jpg`,
      `${SITE_URL}/img/rooms/ambar-1/kapak.jpg`,
      `${SITE_URL}/img/rooms/kulube-1/kapak.jpg`,
      `${SITE_URL}/img/rooms/tiny-house/kapak.jpg`,
    ],
    logo: `${SITE_URL}/logo.png`,
    hasMenu: `${SITE_URL}/${lang}/menu`,
    amenityFeature: AMENITIES[lang].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    ...(rating && count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: count,
          },
        }
      : {}),
  };

  // Sitenin adı (arama sonuçlarında URL'nin üstünde görünen ad) ve işletmeyle bağı
  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: BUSINESS_NAME,
    alternateName: ["Trysa Camping", "Trysa"],
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#business` },
  };

  const data = { "@context": "https://schema.org", "@graph": [business, website] };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
