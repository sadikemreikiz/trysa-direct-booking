/**
 * Unexpected server errors (pages, route handlers, server actions), reported by Next.js
 * through src/instrumentation.ts. The admins get one alert per route per hour.
 */
import { getDb } from "@/db";
import { alertAdmins } from "./alerts";

/** Errors that aren't ours to fix, e.g. an old browser tab posting to a previous deployment. */
const IGNORED = [/Failed to find Server Action/i];

export type ErrorContext = { routePath: string; routeType: string };

export async function reportServerError(
  err: unknown,
  request: { method: string },
  context: ErrorContext,
  alert: typeof alertAdmins = alertAdmins,
) {
  const message = err instanceof Error ? err.message : String(err);
  if (IGNORED.some((pattern) => pattern.test(message))) return;
  // React replaces messages from Server Components in production; the digest finds the log line.
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? ` · ${String(err.digest)}` : "";
  await alert(getDb(), {
    key: `error:${context.routePath}`,
    title: "⚠️ Sitede hata",
    body: `${context.routePath} (${context.routeType}, ${request.method}): ${message}${digest}`,
  });
}
