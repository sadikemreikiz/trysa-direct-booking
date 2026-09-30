import { BUSINESS_NAME, GOOGLE_MAPS_URL, SITE_URL } from "@/lib/seo";
import { place, site } from "@/lib/site";

/** Google'ın işletmeyi (konaklama + restoran, puan, konum) anlaması için yapısal veri. */
export default function JsonLd({
  rating,
  count,
  lang,
}: {
  rating?: number;
  count?: number;
  lang: string;
}) {
  const business = {
    "@type": ["LodgingBusiness", "Restaurant"],
    "@id": `${SITE_URL}/#business`,
    name: BUSINESS_NAME,
    alternateName: ["Trysa Camping", "Trysa Restaurant", "Trysa"],
    // Google İşletme Profili ve sosyal hesaplar: site ile profilin aynı işletme olduğunu gösterir
    sameAs: [GOOGLE_MAPS_URL, site.instagram],
    description:
      "Antik Trysa'nın eteğinde, Demre ile Kaş arasında doğayla iç içe konaklama: ahşap odalar, tiny house, kamp ve ocakbaşı restoran. Yıl boyu açık.",
    url: SITE_URL,
    telephone: "+905555721569",
    priceRange: "₺₺",
    servesCuisine: ["Türk mutfağı", "Izgara", "Balık", "Ev yemekleri"],
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
    image: `${SITE_URL}/img/hero.jpg`,
    hasMenu: `${SITE_URL}/${lang}/menu`,
    amenityFeature: [
      "Ücretsiz WiFi",
      "Ücretsiz otopark",
      "Kahvaltı",
      "Evcil hayvan dostu",
      "Çocuk oyun alanı",
    ].map((name) => ({
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
