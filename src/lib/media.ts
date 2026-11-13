// Site image overrides: shared types and resolution used by <Picture>, page metadata and the admin.
import { fallbackSrc, getImage, srcSet, type ImageId, type SiteImage } from "@/content/images";

export interface ImageVariant {
  width: number;
  format: "avif" | "webp";
  url: string;
}

/** What the public pages need to know about a replaced slot (serialisable: passed from the root layout). */
export interface MediaOverride {
  /** Largest WebP, used as the <img> fallback. Empty when only the alt text was changed. */
  url: string;
  width: number;
  height: number;
  /** Alt text set in the admin (null = use the manifest alt). */
  alt: string | null;
  variants: ImageVariant[];
  updatedAt: string;
}

export type MediaOverrides = Partial<Record<string, MediaOverride>>;

export interface ResolvedImage {
  alt: string;
  width: number;
  height: number;
  avifSrcSet: string;
  webpSrcSet: string;
  src: string;
}

const variantSrcSet = (variants: ImageVariant[], format: "avif" | "webp") =>
  variants
    .filter((v) => v.format === format)
    .sort((a, b) => a.width - b.width)
    .map((v) => `${v.url} ${v.width}w`)
    .join(", ");

/** The image for a slot: the admin replacement when there is one, otherwise the built-in files. */
export function resolveImage(id: ImageId, override: MediaOverride | undefined): ResolvedImage {
  const img: SiteImage = getImage(id);
  const alt = override?.alt ?? img.alt;
  if (override && override.url && override.variants.length > 0) {
    return {
      alt,
      width: override.width,
      height: override.height,
      avifSrcSet: variantSrcSet(override.variants, "avif"),
      webpSrcSet: variantSrcSet(override.variants, "webp"),
      src: override.url,
    };
  }
  return { alt, width: img.width, height: img.height, avifSrcSet: srcSet(img, "avif"), webpSrcSet: srcSet(img, "webp"), src: fallbackSrc(img) };
}

/** Absolute URL for Open Graph / JSON-LD. */
export function absoluteUrl(src: string, siteUrl: string): string {
  return /^https?:\/\//.test(src) ? src : `${siteUrl}${src}`;
}
