import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { confirmedStaysForUnit } from "@/db/panel";
import { todayInDemre } from "@/db/reservations";
import { units } from "@/db/schema";
import { buildIcs, verifyIcalToken } from "@/lib/ical";

/** Airbnb polls this URL every few hours: /api/ical/ambar-1?token=... */
export async function GET(request: Request, { params }: { params: Promise<{ unit: string }> }) {
  const { unit } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const secret = process.env.BETTER_AUTH_SECRET;
  const db = getDb();
  if (!secret || !db || !verifyIcalToken(unit, token, secret)) {
    return new Response("Not found", { status: 404 });
  }

  const [u] = await db.select().from(units).where(eq(units.slug, unit));
  if (!u) return new Response("Not found", { status: 404 });

  const stays = await confirmedStaysForUnit(db, unit, todayInDemre(new Date()));
  return new Response(buildIcs(u.name, stays), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
