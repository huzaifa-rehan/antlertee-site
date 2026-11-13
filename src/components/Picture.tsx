"use client";

import type { ImageId } from "@/content/images";
import { resolveImage } from "@/lib/media";
import { useMediaOverride } from "./MediaOverrides";

interface PictureProps {
  id: ImageId;
  /** CSS sizes hint, e.g. "(max-width: 860px) 76vw, 24vw". */
  sizes: string;
  className?: string;
  /** Above-the-fold images: load eagerly with high priority. */
  priority?: boolean;
  /** Override the manifest alt text ("" for decorative images). */
  alt?: string;
  draggable?: boolean;
}

/**
 * AVIF with WebP fallback, intrinsic width/height to prevent layout shift. Images are pre-built by `npm run images`;
 * a replacement uploaded in the admin (/admin/media/) takes over when there is one.
 */
export function Picture({ id, sizes, className, priority, alt, draggable }: PictureProps) {
  const img = resolveImage(id, useMediaOverride(id));
  return (
    <picture>
      <source type="image/avif" srcSet={img.avifSrcSet} sizes={sizes} />
      <source type="image/webp" srcSet={img.webpSrcSet} sizes={sizes} />
      <img
        src={img.src}
        alt={alt ?? img.alt}
        width={img.width}
        height={img.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={className}
        draggable={draggable}
      />
    </picture>
  );
}
