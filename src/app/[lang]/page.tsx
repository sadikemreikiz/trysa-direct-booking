import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Accommodation } from "@/components/home/Accommodation";
import { Amenities } from "@/components/home/Amenities";
import { BookingBar } from "@/components/home/BookingBar";
import { CtaBand } from "@/components/home/CtaBand";
import { Distances } from "@/components/home/Distances";
import { Experiences } from "@/components/home/Experiences";
import { Faq } from "@/components/home/Faq";
import { Hero } from "@/components/home/Hero";
import { Restaurant } from "@/components/home/Restaurant";
import { Reviews } from "@/components/home/Reviews";
import { TrysaStory } from "@/components/home/TrysaStory";
import { TwoPath } from "@/components/home/TwoPath";
import { WhyDirect } from "@/components/home/WhyDirect";
import JsonLd from "@/components/JsonLd";
import MobileBar from "@/components/MobileBar";
import { getDictionary, isLocale } from "@/content/dictionaries";
import { getGoogleReviews, getRatingSummary } from "@/features/reviews/google-reviews";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [googleReviews, rating] = await Promise.all([getGoogleReviews(lang), getRatingSummary()]);

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
        <TrysaStory t={t} />
        <Experiences t={t} />
        <Distances t={t} lang={lang} />
        <Reviews t={t} lang={lang} google={googleReviews} />
        <Faq t={t} />
        <CtaBand t={t} lang={lang} />
      </main>
      <Footer t={t} lang={lang} />
      <MobileBar t={t} lang={lang} />
    </>
  );
}
