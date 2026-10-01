import { describe, expect, it } from "vitest";
import { jsonLd } from "./seo";

describe("jsonLd", () => {
  it("can't close its <script> tag, whatever the text contains", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
