// Fotoğrafları web için küçültür (bir kez / yeni fotoğraf eklenince çalıştırılır):
//   node scripts/optimize-images.mjs
// - Büyük sürüm: en fazla 1600 px (kapak görseli 1920 px), sıkıştırılmış JPEG.
//   Zaten küçültülmüş dosyaya tekrar dokunmaz (kalite kaybı birikmesin).
// - Küçük sürüm: yanına "<ad>.sm.jpg" (800 px) — telefonlar ve kartlar bunu indirir.
// - Fotoğraf üst verisi (EXIF: konum, cihaz) silinir.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "img");
const MAX_WIDTH = { "hero.jpg": 1920 };
const DEFAULT_MAX = 1600;
const SMALL_WIDTH = 800;
/** Bu boyutun altındaki büyük sürümler zaten işlenmiş sayılır. */
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
      .rotate() // EXIF yönünü uygula, sonra üst veriyi at
      .resize({ width: max, withoutEnlargement: true })
      .jpeg({ quality: 74, mozjpeg: true, progressive: true })
      .toBuffer();
    // Belirgin kazanç yoksa dokunma: zaten işlenmiş dosyayı tekrar sıkıştırıp kalite kaybetme.
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
  console.log(`${name.padEnd(28)} ${kb(original.length).padStart(7)} → ${kb(large.length).padStart(7)}  (küçük: ${kb(small.length)})`);
}

console.log(`\nToplam büyük sürümler: ${kb(before)} → ${kb(after)}`);
