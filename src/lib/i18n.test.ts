import { describe, expect, it } from "vitest";
import { negotiateLocale } from "./i18n";

describe("negotiateLocale", () => {
  it("picks a language we offer", () => {
    expect(negotiateLocale("tr-TR,tr;q=0.9")).toBe("tr");
    expect(negotiateLocale("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(negotiateLocale("en-GB")).toBe("en");
  });

  it("uses a lower-ranked language we offer before falling back", () => {
    expect(negotiateLocale("ru-RU,ru;q=0.9,de;q=0.8,en;q=0.7")).toBe("de");
  });

  it("sends visitors who ask only for other languages to English", () => {
    expect(negotiateLocale("ru-RU,ru;q=0.9")).toBe("en");
    expect(negotiateLocale("fr-FR")).toBe("en");
    expect(negotiateLocale("lt,fi;q=0.5")).toBe("en");
  });

  it("orders by q-value, not by position", () => {
    expect(negotiateLocale("en;q=0.5,tr")).toBe("tr");
  });

  it("ignores languages the browser rules out with q=0", () => {
    expect(negotiateLocale("tr;q=0,de")).toBe("de");
  });

  it("keeps the default (Turkish) when no language is given", () => {
    expect(negotiateLocale(null)).toBe("tr");
    expect(negotiateLocale("")).toBe("tr");
    expect(negotiateLocale("*")).toBe("tr");
  });
});
