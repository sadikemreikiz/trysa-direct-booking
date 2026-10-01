/**
 * Calendar (iCal) for Airbnb: bookings confirmed on the site show as taken on Airbnb too.
 * This makes the sync two-way: Airbnb → site (airbnb-calendar.ts), site → Airbnb (here).
 * Each unit's link carries an HMAC token so it can't be guessed; the calendar has no personal data.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function icalToken(unitSlug: string, secret: string): string {
  return createHmac("sha256", secret).update(`ical:${unitSlug}`).digest("hex").slice(0, 32);
}

export function verifyIcalToken(unitSlug: string, token: string, secret: string): boolean {
  const expected = Buffer.from(icalToken(unitSlug, secret));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const compactDate = (iso: string) => iso.replaceAll("-", "");

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(
  unitName: string,
  stays: { id: string; checkIn: string; checkOut: string }[],
  now: Date = new Date(),
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Trysa//Rezervasyon//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Trysa · ${unitName}`,
    ...stays.flatMap((s) => [
      "BEGIN:VEVENT",
      `UID:${s.id}@trysacamping.com`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${compactDate(s.checkIn)}`,
      `DTEND;VALUE=DATE:${compactDate(s.checkOut)}`,
      "SUMMARY:Trysa – direkt rezervasyon",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
