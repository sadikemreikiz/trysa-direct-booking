import fs from "node:fs";
import path from "node:path";

/** All photos of a room in public/img/rooms/<slug> (cover first). */
export function getRoomPhotos(slug: string): string[] {
  try {
    const dir = path.join(process.cwd(), "public", "img", "rooms", slug);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg") && !f.endsWith(".sm.jpg"));
    const kapak = files.filter((f) => f === "kapak.jpg");
    const rest = files.filter((f) => f !== "kapak.jpg").sort((a, b) => parseInt(a) - parseInt(b));
    return [...kapak, ...rest].map((f) => `/img/rooms/${slug}/${f}`);
  } catch {
    return [];
  }
}
