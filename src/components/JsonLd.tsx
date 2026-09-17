import { SITE_URL } from "@/lib/seo";

/** Google'ın işletmeyi (konaklama + restoran, puan, konum) anlaması için yapısal veri. */
export default function JsonLd({
  rating,
  count,
}: {
  rating?: number;
  count?: number;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": ["LodgingBusiness", "Restaurant"],
    name: "Trysa Restaurant Camping",
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
      latitude: 36.262198,
      longitude: 29.890923,
    },
    image: `${SITE_URL}/img/hero.jpg`,
    hasMenu: `${SITE_URL}/menu`,
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
