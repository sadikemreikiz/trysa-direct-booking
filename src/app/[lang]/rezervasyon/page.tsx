import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBar from "@/components/MobileBar";
import ReservationForm from "@/components/ReservationForm";
import { getGuestLockedDates } from "@/lib/guest-availability";
import { fillRating, getRatingSummary } from "@/lib/reviews";
import { pageMetadata } from "@/lib/seo";
import { getDictionary, isLocale, defaultLocale } from "@/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const loc = isLocale(lang) ? lang : defaultLocale;
  const t = getDictionary(loc);
  return pageMetadata(loc, "/rezervasyon", { title: t.reservation.title, description: t.reservation.intro });
}

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [lockedByType, rating] = await Promise.all([getGuestLockedDates(), getRatingSummary()]);

  return (
    <>
      <Header t={t} lang={lang} />
      <main className="flex-1 pb-24 md:pb-0">
        <ReservationForm
          t={t}
          lang={lang}
          lockedByType={lockedByType}
          reviewsChip={fillRating(t.reservation.chipReviews, rating, lang)}
        />
      </main>
      <Footer t={t} lang={lang} />
      <MobileBar t={t} lang={lang} />
    </>
  );
}
