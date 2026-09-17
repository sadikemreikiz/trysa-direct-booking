import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBar from "@/components/MobileBar";
import ReservationForm from "@/components/ReservationForm";
import { getLockedDatesByType } from "@/lib/availability";
import { getDictionary, isLocale, defaultLocale } from "@/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = getDictionary(isLocale(lang) ? lang : defaultLocale);
  return { title: t.reservation.title, description: t.reservation.intro };
}

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const lockedByType = await getLockedDatesByType();

  return (
    <>
      <Header t={t} lang={lang} />
      <main className="flex-1 pb-24 md:pb-0">
        <ReservationForm t={t} lang={lang} lockedByType={lockedByType} />
      </main>
      <Footer t={t} />
      <MobileBar t={t} lang={lang} />
    </>
  );
}
