import { fallbackSrc, getImage, srcSet, type ImageId } from "@/content/images";

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

/** AVIF with WebP fallback, intrinsic width/height to prevent layout shift. Images are pre-built by `npm run images`. */
export function Picture({ id, sizes, className, priority, alt, draggable }: PictureProps) {
  const img = getImage(id);
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(img, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(img, "webp")} sizes={sizes} />
      <img
        src={fallbackSrc(img)}
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
