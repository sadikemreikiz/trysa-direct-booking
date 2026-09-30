import { describe, expect, it } from "vitest";
import { fillRating, formatRating } from "./reviews";

describe("puan metni", () => {
  it("dile göre ondalık ayırıcı kullanır", () => {
    expect(formatRating(4.9, "tr")).toBe("4,9");
    expect(formatRating(4.9, "de")).toBe("4,9");
    expect(formatRating(4.9, "en")).toBe("4.9");
    expect(formatRating(5, "en")).toBe("5.0");
  });

  it("şablondaki puan ve yorum sayısını doldurur", () => {
    const s = { rating: 4.87, count: 1234 };
    expect(fillRating("★ {rating} · {count} yorum", s, "tr")).toBe("★ 4,9 · 1.234 yorum");
    expect(fillRating("★ {rating} · {count} reviews", s, "en")).toBe("★ 4.9 · 1,234 reviews");
  });
});
