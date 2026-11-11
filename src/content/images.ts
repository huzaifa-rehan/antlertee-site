import manifest from "./image-manifest.json";
import generated from "./images.generated.json";

export type ImageId = keyof typeof generated;

export interface SiteImage {
  id: ImageId;
  alt: string;
  width: number;
  height: number;
  widths: number[];
}

const alts = new Map(manifest.images.map((i) => [i.id, i.alt]));

export function getImage(id: ImageId): SiteImage {
  const meta = generated[id];
  return { id, alt: alts.get(id) ?? "", width: meta.width, height: meta.height, widths: meta.widths };
}

export function srcSet(img: SiteImage, format: "avif" | "webp"): string {
  return img.widths.map((w) => `/img/${img.id}-${w}.${format} ${w}w`).join(", ");
}

export function fallbackSrc(img: SiteImage): string {
  return `/img/${img.id}-${img.widths.at(-1)}.webp`;
}
