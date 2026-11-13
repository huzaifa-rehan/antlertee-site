// Pre-renders the wardrobe's wood-grain textures to PNG (public/img/grain-h.png, grain-v.png).
// The grain used to be an inline SVG with an feTurbulence filter, which the browser has to compute again whenever it
// repaints those backgrounds while scrolling; a plain PNG is only decoded once. Run: node scripts/build-grain.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matrix = "0 0 0 0 0.1 0 0 0 0 0.05 0 0 0 0 0.02 2.2 0 0 0 -0.95";

const textures = [
  { name: "grain-h", w: 640, h: 200, freq: "0.004 0.24", seed: 11 },
  { name: "grain-v", w: 200, h: 640, freq: "0.24 0.004", seed: 5 },
];

for (const t of textures) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${t.w}" height="${t.h}"><filter id="g" x="0" y="0"><feTurbulence type="fractalNoise" baseFrequency="${t.freq}" numOctaves="4" seed="${t.seed}" stitchTiles="stitch"/><feColorMatrix values="${matrix}"/></filter><rect width="${t.w}" height="${t.h}" filter="url(#g)"/></svg>`;
  const out = path.join(root, "public/img", `${t.name}.png`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`${t.name}.png ${meta.width}x${meta.height}, alpha ${meta.hasAlpha}`);
}
