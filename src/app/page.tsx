import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBar from "@/components/MobileBar";
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
import { getGoogleReviews } from "@/lib/reviews";
import JsonLd from "@/components/JsonLd";

export default async function Home() {
  const googleReviews = await getGoogleReviews();
  return (
    <>
      <JsonLd rating={googleReviews?.rating} count={googleReviews?.count} />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <Hero />
        <BookingBar />
        <TwoPath />
        <WhyDirect />
        <Accommodation />
        <Amenities />
        <Restaurant />
        <Gallery />
        <TrysaStory />
        <Experiences />
        <Distances />
        <Reviews google={googleReviews} />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
      <MobileBar />
    </>
  );
}
