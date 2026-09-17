/**
 * Airbnb iCal takvimlerini okuyup dolu (müsait olmayan) günleri çıkarır.
 * Amaç: sitede double-booking'i önlemek — Airbnb'de dolu tarihler burada da dolu görünür.
 * Not: iCal senkronu anlık değildir (Airbnb birkaç saatte bir günceller).
 */

function icalUrls(): string[] {
  return (process.env.AIRBNB_ICAL_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toISO(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** Bir .ics metnindeki her etkinlik için [başlangıç, bitiş) tarih aralıklarını döndürür. */
function parseIcs(text: string): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = [];
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
    } else if (line.startsWith("END:VEVENT")) {
      if (start && end) ranges.push({ start, end });
    }
  }
  return ranges;
}

/** Tüm Airbnb takvimlerindeki dolu günleri (YYYY-MM-DD) tek bir sıralı listede döndürür. */
export async function getBookedDates(): Promise<string[]> {
  const urls = icalUrls();
  if (urls.length === 0) return [];

  const booked = new Set<string>();
  await Promise.all(
    urls.map(async (url) => {
      try {
        // Saatte bir yenilenir (Airbnb'nin kendi güncelleme hızıyla uyumlu)
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) return;
        const text = await res.text();
        for (const { start, end } of parseIcs(text)) {
          let d = new Date(`${start}T00:00:00Z`);
          const last = new Date(`${end}T00:00:00Z`); // bitiş günü hariç (checkout)
          while (d < last) {
            booked.add(d.toISOString().slice(0, 10));
            d = new Date(d.getTime() + 86_400_000);
          }
        }
      } catch {
        /* bir takvim çekilemezse sessizce atla */
      }
    }),
  );
  return [...booked].sort();
}

/** Seçilen [giriş, çıkış) aralığında dolu bir gün var mı? */
export function rangeHasBookedDay(
  checkin: string,
  checkout: string,
  bookedDates: string[],
): boolean {
  if (!checkin || !checkout || checkout <= checkin) return false;
  const set = new Set(bookedDates);
  let d = new Date(`${checkin}T00:00:00Z`);
  const end = new Date(`${checkout}T00:00:00Z`);
  while (d < end) {
    if (set.has(d.toISOString().slice(0, 10))) return true;
    d = new Date(d.getTime() + 86_400_000);
  }
  return false;
}
