// Shrinks photos for the web (run once / whenever new photos are added):
//   node scripts/optimize-images.mjs
// - Large version: at most 1600 px (hero image 1920 px), compressed JPEG.
//   Files that are already resized are left alone (no compounding quality loss).
// - Small version: "<name>.sm.jpg" next to it (800 px), which phones and cards download.
// - Photo metadata (EXIF: location, device) is stripped.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "img");
const MAX_WIDTH = { "hero.jpg": 1920 };
const DEFAULT_MAX = 1600;
const SMALL_WIDTH = 800;
/** Large versions below this size count as already processed. */
const ALREADY_OPTIMIZED_BYTES = 350_000;

function* jpgs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* jpgs(full);
    else if (entry.name.endsWith(".jpg") && !entry.name.endsWith(".sm.jpg")) yield full;
  }
}

const kb = (n) => `${Math.round(n / 1024)} KB`;
let before = 0;
let after = 0;

for (const file of jpgs(ROOT)) {
  const name = path.relative(ROOT, file);
  const original = fs.readFileSync(file);
  before += original.length;

  let large = original;
  if (original.length > ALREADY_OPTIMIZED_BYTES) {
    const max = MAX_WIDTH[name] ?? DEFAULT_MAX;
    const out = await sharp(original)
      .rotate() // apply EXIF orientation, then drop the metadata
      .resize({ width: max, withoutEnlargement: true })
      .jpeg({ quality: 74, mozjpeg: true, progressive: true })
      .toBuffer();
    // No clear gain → leave it: don't recompress an already processed file and lose quality.
    if (out.length < original.length * 0.9) {
      fs.writeFileSync(file, out);
      large = out;
    }
  }

  const small = await sharp(large)
    .resize({ width: SMALL_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true, progressive: true })
    .toBuffer();
  fs.writeFileSync(file.replace(/\.jpg$/, ".sm.jpg"), small);

  after += large.length;
  console.log(
    `${name.padEnd(28)} ${kb(original.length).padStart(7)} → ${kb(large.length).padStart(7)}  (small: ${kb(small.length)})`,
  );
}

console.log(`\nLarge versions in total: ${kb(before)} → ${kb(after)}`);
