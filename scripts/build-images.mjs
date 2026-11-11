// Builds optimised AVIF + WebP images from src/content/image-manifest.json.
// Run with `npm run images` whenever the manifest changes. Outputs are committed, so a normal
// `npm run build` does not need the source photos (which live outside this project).
//
//   public/img/<id>-<width>.avif|webp   cropped to the manifest aspect at each width
//   public/og.jpg                      1200x630 Open Graph card
//   src/content/images.generated.json  intrinsic sizes and widths, read by <Picture>
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "src/content/image-manifest.json");
const outDir = path.join(root, "public/img");
const TARGET_WIDTHS = [360, 720];

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const sourceRoot = path.resolve(root, manifest.sourceRoot);
await fs.mkdir(outDir, { recursive: true });

/** Crop box for a W:H aspect, positioned vertically (or horizontally) by focus 0..1. */
function cropBox(width, height, aspect, focusY = 0.5) {
  const [aw, ah] = aspect.split(":").map(Number);
  const target = aw / ah;
  if (width / height > target) {
    const w = Math.round(height * target);
    return { left: Math.round((width - w) / 2), top: 0, width: w, height };
  }
  const h = Math.round(width / target);
  return { left: 0, top: Math.round((height - h) * focusY), width, height: h };
}

const generated = {};
let bytes = 0;
for (const img of manifest.images) {
  const src = path.join(sourceRoot, img.src);
  const meta = await sharp(src).metadata();
  const box = cropBox(meta.width, meta.height, img.aspect, img.focusY);
  const widths = TARGET_WIDTHS.filter((w) => w < box.width);
  widths.push(Math.min(box.width, TARGET_WIDTHS.at(-1)));
  const uniqueWidths = [...new Set(widths)].sort((a, b) => a - b);
  const [aw, ah] = img.aspect.split(":").map(Number);
  for (const w of uniqueWidths) {
    const h = Math.round((w * ah) / aw);
    const pipeline = sharp(src).extract(box).resize(w, h, { fit: "cover" });
    const avif = await pipeline.clone().avif({ quality: 52, effort: 5 }).toBuffer();
    const webp = await pipeline.clone().webp({ quality: 74, effort: 5 }).toBuffer();
    await fs.writeFile(path.join(outDir, `${img.id}-${w}.avif`), avif);
    await fs.writeFile(path.join(outDir, `${img.id}-${w}.webp`), webp);
    bytes += avif.length + webp.length;
  }
  const largest = uniqueWidths.at(-1);
  generated[img.id] = {
    width: largest,
    height: Math.round((largest * ah) / aw),
    widths: uniqueWidths,
  };
  console.log(`${img.id.padEnd(28)} ${meta.width}x${meta.height} -> ${img.aspect} @ ${uniqueWidths.join(", ")}`);
}

await fs.writeFile(
  path.join(root, "src/content/images.generated.json"),
  JSON.stringify(generated, null, 2) + "\n",
);

// Open Graph card: ink panel with the headline, product photo on the right.
const ogPhoto = manifest.images.find((i) => i.id === "hoodie-heavyweight");
if (ogPhoto) {
  const src = path.join(sourceRoot, ogPhoto.src);
  const meta = await sharp(src).metadata();
  const photo = await sharp(src)
    .extract(cropBox(meta.width, meta.height, "3:4", 0.5))
    .resize(473, 630)
    .toBuffer();
  const text = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#0d0c0b"/>
    <text x="64" y="96" font-family="Arial, sans-serif" font-size="22" letter-spacing="1" fill="#8a8580">( KARACHI, PK )  [ PRIVATE-LABEL MANUFACTURING ]</text>
    <text x="58" y="330" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="150" letter-spacing="-6" fill="#f4f2ee">Yarn</text>
    <text x="58" y="470" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="150" letter-spacing="-6" fill="#f4f2ee">to pack<tspan fill="#ffe500">.</tspan></text>
    <text x="64" y="566" font-family="Arial Black, Arial, sans-serif" font-size="30" letter-spacing="-1" fill="#ffe500">ANTLERTEE CREATIVE STUDIOS</text>
  </svg>`);
  await sharp(text)
    .composite([{ input: photo, left: 727, top: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(root, "public/og.jpg"));
}

console.log(`\n${manifest.images.length} images, ${(bytes / 1024).toFixed(0)} KB total (AVIF + WebP)`);
