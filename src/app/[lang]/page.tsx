import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBar from "@/components/MobileBar";
import JsonLd from "@/components/JsonLd";
import {
  Hero,
  BookingBar,
  TwoPath,
  WhyDirect,
  Accommodation,
  Amenities,
  Restaurant,
  Gallery,
  TrysaStory,
  Experiences,
  Distances,
  Reviews,
  Faq,
  CtaBand,
} from "@/components/sections";
import { getGoogleReviews, getRatingSummary } from "@/lib/reviews";
import { getDictionary, isLocale } from "@/dictionaries";

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [googleReviews, rating] = await Promise.all([getGoogleReviews(), getRatingSummary()]);

  return (
    <>
      <JsonLd rating={googleReviews?.rating} count={googleReviews?.count} lang={lang} />
      <Header t={t} lang={lang} />
      <main className="flex-1 pb-20 md:pb-0">
        <Hero t={t} lang={lang} rating={rating} />
        <BookingBar t={t} lang={lang} />
        <TwoPath t={t} lang={lang} rating={rating} />
        <WhyDirect t={t} />
        <Accommodation t={t} lang={lang} />
        <Amenities t={t} />
        <Restaurant t={t} lang={lang} rating={rating} />
        <Gallery t={t} />
        <TrysaStory t={t} />
        <Experiences t={t} />
        <Distances t={t} lang={lang} />
        <Reviews t={t} google={googleReviews} />
        <Faq t={t} />
        <CtaBand t={t} lang={lang} />
      </main>
      <Footer t={t} lang={lang} />
      <MobileBar t={t} lang={lang} />
    </>
  );
}
