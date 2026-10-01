import { describe, expect, it } from "vitest";
import { buildIcs, icalToken, verifyIcalToken } from "./ical";

describe("Airbnb calendar link", () => {
  it("a token that differs per unit and can't be produced without the secret", () => {
    const a = icalToken("ambar-1", "s3cret");
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(icalToken("ambar-2", "s3cret")).not.toBe(a);
    expect(icalToken("ambar-1", "other")).not.toBe(a);
    expect(verifyIcalToken("ambar-1", a, "s3cret")).toBe(true);
    expect(verifyIcalToken("ambar-2", a, "s3cret")).toBe(false);
    expect(verifyIcalToken("ambar-1", "kisa", "s3cret")).toBe(false);
  });

  it("produces valid iCal; date range excludes the checkout day, no personal data", () => {
    const ics = buildIcs(
      "Ambar-1",
      [{ id: "abc", checkIn: "2026-11-10", checkOut: "2026-11-13" }],
      new Date("2026-10-01T09:00:00Z"),
    );
    expect(ics).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Trysa//Rezervasyon//TR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Trysa · Ambar-1",
        "BEGIN:VEVENT",
        "UID:abc@trysacamping.com",
        "DTSTAMP:20261001T090000Z",
        "DTSTART;VALUE=DATE:20261110",
        "DTEND;VALUE=DATE:20261113",
        "SUMMARY:Trysa – direkt rezervasyon",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
    );
  });
});
