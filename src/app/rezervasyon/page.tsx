import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBar from "@/components/MobileBar";
import ReservationForm from "@/components/ReservationForm";

export const metadata: Metadata = {
  title: "Rezervasyon Talebi",
  description:
    "Trysa'da doğada ahşap oda, tiny house veya kamp için rezervasyon talebi gönder. Ön talep — onayla kesinleşir, şimdi ödeme yok.",
};

export default function ReservationPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pb-24 md:pb-0">
        <ReservationForm />
      </main>
      <Footer />
      <MobileBar />
    </>
  );
}
