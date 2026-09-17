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

export default function Home() {
  return (
    <>
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
        <Reviews />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
      <MobileBar />
    </>
  );
}
