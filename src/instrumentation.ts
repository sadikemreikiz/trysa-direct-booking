import type { Instrumentation } from "next";

/** Unexpected server errors alert the admins (features/monitoring). */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportServerError } = await import("@/features/monitoring/server-errors");
  await reportServerError(err, request, context);
};
