import { describe, expect, it, vi } from "vitest";
import type { alertAdmins } from "./alerts";
import { reportServerError } from "./server-errors";

const context = { routePath: "/[lang]/rezervasyon", routeType: "action" };

describe("server errors", () => {
  it("alert the admins with the route, once per route and hour", async () => {
    const alert = vi.fn<typeof alertAdmins>().mockResolvedValue("push");
    const err = Object.assign(new Error("connection refused"), { digest: "123" });
    await reportServerError(err, { method: "POST" }, context, alert);
    expect(alert).toHaveBeenCalledWith(null, {
      key: "error:/[lang]/rezervasyon",
      title: "⚠️ Sitede hata",
      body: "/[lang]/rezervasyon (action, POST): connection refused · 123",
    });
  });

  it("ignore errors that aren't ours to fix", async () => {
    const alert = vi.fn<typeof alertAdmins>();
    await reportServerError(
      new Error(
        'Failed to find Server Action "abc". This request might be from an older deployment.',
      ),
      { method: "POST" },
      context,
      alert,
    );
    expect(alert).not.toHaveBeenCalled();
  });
});
