/**
 * Airbnb iCal takvimlerinden müsaitlik hesaplar.
 * Amaç: sitede double-booking'i önlemek — bir tarih ancak o tipteki TÜM üniteler
 * doluysa engellenir (böylece boş oda varken müşteri yanlışlıkla geri çevrilmez).
 * Not: iCal senkronu anlık değildir (Airbnb dışa aktarımı gecikmeli; biz 15 dakikada bir okuruz).
 * Env değişkenleri (virgülle ayrılmış .ics linkleri, GİZLİ, git'e girmez):
 * Her oda ayrı — her biri tek ünite, kendi env anahtarı.
 *   AIRBNB_ICAL_AMBAR1/2/3, AIRBNB_ICAL_KULUBE1/2, AIRBNB_ICAL_TINY
 */

type TypeConfig = { total: number; envKey: string };

// Oda (rezervasyon seçeneği) → env anahtarı (her oda tek ünite)
const TYPE_CONFIG: Record<string, TypeConfig> = {
  "Ambar-1": { total: 1, envKey: "AIRBNB_ICAL_AMBAR1" },
  "Ambar-2": { total: 1, envKey: "AIRBNB_ICAL_AMBAR2" },
  "Ambar-3": { total: 1, envKey: "AIRBNB_ICAL_AMBAR3" },
  "Kulübe-1": { total: 1, envKey: "AIRBNB_ICAL_KULUBE1" },
  "Kulübe-2": { total: 1, envKey: "AIRBNB_ICAL_KULUBE2" },
  "Tiny House": { total: 1, envKey: "AIRBNB_ICAL_TINY" },
};

/** Airbnb takviminin yeniden okunma aralığı (panel takviminde de yazıyor). */
export const AIRBNB_REFRESH_SECONDS = 15 * 60;

function urlsFor(envKey: string): string[] {
  return (process.env[envKey] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toISO(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** Tek bir .ics linkindeki dolu günleri (YYYY-MM-DD) döndürür. */
async function bookedSet(url: string): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    // Airbnb kendi dışa aktarımını da gecikmeli günceller; biz en geç 15 dakikada bir okuruz.
    const res = await fetch(url, { next: { revalidate: AIRBNB_REFRESH_SECONDS } });
    if (!res.ok) return set;
    const text = await res.text();
    let start: string | null = null;
    let end: string | null = null;
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith("BEGIN:VEVENT")) {
        start = null;
        end = null;
      } else if (line.startsWith("DTSTART")) {
        const m = line.match(/(\d{8})/);
        if (m) start = toISO(m[1]);
      } else if (line.startsWith("DTEND")) {
        const m = line.match(/(\d{8})/);
        if (m) end = toISO(m[1]);
      } else if (line.startsWith("END:VEVENT") && start && end) {
        let d = new Date(`${start}T00:00:00Z`);
        const last = new Date(`${end}T00:00:00Z`); // çıkış günü hariç
        while (d < last) {
          set.add(d.toISOString().slice(0, 10));
          d = new Date(d.getTime() + 86_400_000);
        }
      }
    }
  } catch {
    /* çekilemezse boş */
  }
  return set;
}

/**
 * Her konaklama tipi için ENGELLİ günleri döndürür.
 * Bir tarih ancak o tipin TÜM üniteleri bağlıysa ve hepsi o gün doluysa engellenir.
 * Eksik ünite varsa (örn. 5 odadan 2'si bağlı) engelleme yapılmaz — boş oda olabilir.
 */
export async function getLockedDatesByType(): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  await Promise.all(
    Object.entries(TYPE_CONFIG).map(async ([type, cfg]) => {
      const urls = urlsFor(cfg.envKey);
      // Tüm üniteler bağlı değilse doluluk kararı veremeyiz → engelleme yok.
      if (urls.length === 0 || urls.length < cfg.total) {
        out[type] = [];
        return;
      }
      const sets = await Promise.all(urls.map(bookedSet));
      const [first, ...rest] = sets;
      // Sadece HER ünitede dolu olan günler = tip tamamen dolu
      out[type] = [...first]
        .filter((day) => rest.every((s) => s.has(day)))
        .sort();
    }),
  );
  return out;
}

/** Seçilen [giriş, çıkış) aralığında engelli bir gün var mı? */
export function rangeHasLockedDay(
  checkin: string,
  checkout: string,
  lockedDates: string[],
): boolean {
  if (!checkin || !checkout || checkout <= checkin || lockedDates.length === 0)
    return false;
  const set = new Set(lockedDates);
  let d = new Date(`${checkin}T00:00:00Z`);
  const end = new Date(`${checkout}T00:00:00Z`);
  while (d < end) {
    if (set.has(d.toISOString().slice(0, 10))) return true;
    d = new Date(d.getTime() + 86_400_000);
  }
  return false;
}
