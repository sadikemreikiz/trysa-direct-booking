import { describe, expect, it } from "vitest";
import { fillRating, formatRating } from "./reviews";

describe("rating text", () => {
  it("uses the decimal separator of the language", () => {
    expect(formatRating(4.9, "tr")).toBe("4,9");
    expect(formatRating(4.9, "de")).toBe("4,9");
    expect(formatRating(4.9, "en")).toBe("4.9");
    expect(formatRating(5, "en")).toBe("5.0");
  });

  it("fills in the rating and review count in the template", () => {
    const s = { rating: 4.87, count: 1234 };
    expect(fillRating("★ {rating} · {count} yorum", s, "tr")).toBe("★ 4,9 · 1.234 yorum");
    expect(fillRating("★ {rating} · {count} reviews", s, "en")).toBe("★ 4.9 · 1,234 reviews");
  });
});
