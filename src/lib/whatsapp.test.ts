import { describe, expect, it } from "vitest";
import { guestMessage, toWhatsAppNumber, whatsAppLink } from "./whatsapp";

describe("toWhatsAppNumber", () => {
  it.each([
    ["0555 111 22 33", "905551112233"],
    ["555 111 22 33", "905551112233"],
    ["+90 555 111 22 33", "905551112233"],
    ["+49 170 1234567", "491701234567"],
    ["0049 170 1234567", "491701234567"],
    ["(0555) 111-22-33", "905551112233"],
  ])("%s → %s", (input, expected) => {
    expect(toWhatsAppNumber(input)).toBe(expected);
  });
});

describe("guestMessage", () => {
  const r = {
    guestName: "Hans Müller",
    checkIn: "2026-12-03",
    checkOut: "2026-12-07",
    reference: "TRY-7K3Q9",
    locale: "de",
  };

  it("misafirin dilinde, ilk adıyla yazar", () => {
    const text = guestMessage("confirmed", r, "Kulübe-1");
    expect(text).toBe(
      "Hallo Hans, dein Aufenthalt in Kulübe-1 vom 3. Dezember – 7. Dezember ist bestätigt ✅ (TRY-7K3Q9). Wir freuen uns auf dich! — Trysa",
    );
  });

  it("bilinmeyen dilde Türkçeye düşer", () => {
    expect(guestMessage("reply", { ...r, locale: "fr" }, null)).toMatch(/^Merhaba Hans, Trysa'dan/);
  });

  it("wa.me linkini kodlanmış metinle üretir", () => {
    expect(whatsAppLink("0555 111 22 33", "Merhaba & hoş geldiniz")).toBe(
      "https://wa.me/905551112233?text=Merhaba%20%26%20ho%C5%9F%20geldiniz",
    );
  });
});
