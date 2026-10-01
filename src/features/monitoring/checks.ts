/**
 * The health checks the scheduled job runs, and the alerts they raise. Messages are in
 * Turkish: they go to the family's phones.
 */
import type { Db } from "@/db";
import { checkAirbnbCalendars } from "@/features/airbnb-sync/airbnb-calendar";
import { alertAdmins, HOUR_MS, type AlertChannels } from "./alerts";
import { lastOk, recordCheck } from "./health";

/** Airbnb has short outages; only a calendar unreadable for this long is worth an alert. */
export const AIRBNB_GRACE_MS = 3 * HOUR_MS;
/** The scheduler runs every 15 minutes; this much silence means it has stopped. */
export const SCHEDULER_STALE_MS = 2 * HOUR_MS;

type Opts = { now?: Date; fetchImpl?: typeof fetch; channels?: AlertChannels };

const hours = (ms: number) => Math.max(1, Math.round(ms / HOUR_MS));

/** Reads every Airbnb calendar; one alert lists the rooms that stopped, one when they're back. */
export async function monitorAirbnbCalendars(db: Db, opts: Opts = {}) {
  const now = opts.now ?? new Date();
  const failing: string[] = [];
  const recovered: string[] = [];
  for (const { room, result } of await checkAirbnbCalendars(opts.fetchImpl)) {
    const change = await recordCheck(db, `airbnb:${room}`, result, AIRBNB_GRACE_MS, now);
    if (change.kind === "failing") {
      failing.push(`${room} (${hours(now.getTime() - change.since.getTime())} saattir)`);
    }
    if (change.kind === "recovered") recovered.push(room);
  }
  if (failing.length) {
    await alertAdmins(
      db,
      {
        key: "airbnb",
        title: "⚠️ Airbnb takvimi okunamıyor",
        body: `${failing.join(", ")}. Bu sürede o odalar sitede ve panelde boş görünebilir: onaylamadan önce Airbnb'ye bak.`,
        url: "/panel/takvim",
      },
      { now, cooldownMs: 0, channels: opts.channels },
    );
  }
  if (recovered.length) {
    await alertAdmins(
      db,
      {
        key: "airbnb-ok",
        title: "✅ Airbnb takvimi düzeldi",
        body: `${recovered.join(", ")} yeniden okunuyor.`,
        url: "/panel/takvim",
      },
      { now, cooldownMs: 0, channels: opts.channels },
    );
  }
  return { failing: failing.length, recovered: recovered.length };
}

/**
 * Records that the scheduled job ran. The 15-minute scheduler lives on GitHub, which turns
 * scheduled workflows off after 60 days without repository activity; then guest emails stop
 * (they only go out 10:00–20:00 and Vercel's daily run is at 09:00). Vercel's daily run
 * notices and tells the admins.
 */
export async function monitorScheduler(
  db: Db,
  source: "github" | "vercel",
  opts: Pick<Opts, "now" | "channels"> = {},
) {
  const now = opts.now ?? new Date();
  await recordCheck(db, `cron:${source}`, { ok: true }, 0, now);
  if (source !== "vercel") return { stale: false };
  const last = await lastOk(db, "cron:github");
  const stale = last !== null && now.getTime() - last.getTime() > SCHEDULER_STALE_MS;
  if (stale) {
    await alertAdmins(
      db,
      {
        key: "cron:github",
        title: "⚠️ 15 dakikalık zamanlayıcı durmuş",
        body: `GitHub'daki zamanlayıcı ${hours(now.getTime() - last.getTime())} saattir çalışmadı: misafir e-postaları ve hatırlatmalar gitmiyor. Düzeltmek için GitHub'da repo → Actions → cron → "Enable workflow".`,
      },
      { now, cooldownMs: 20 * HOUR_MS, channels: opts.channels },
    );
  }
  return { stale };
}
