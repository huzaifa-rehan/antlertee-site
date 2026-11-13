// What the admin may upload where: originals for slot replacement (media/incoming) and library items (media/library).
import { extensionOf, formatBytes } from "@/lib/leads/rules";
import { LIBRARY_IMAGE_MAX_BYTES, LIBRARY_TYPES, LIBRARY_VIDEO_MAX_BYTES, SLOT_UPLOAD_MAX_BYTES, SLOT_UPLOAD_TYPES } from "./media";
import type { UploadPolicy } from "./uploads";

export type MediaArea = "incoming" | "library";

export function mediaPolicy(area: MediaArea): UploadPolicy {
  if (area === "incoming") {
    return { typesFor: (ext) => (SLOT_UPLOAD_TYPES[ext] ? [SLOT_UPLOAD_TYPES[ext]] : null), maxBytesFor: () => SLOT_UPLOAD_MAX_BYTES };
  }
  return {
    typesFor: (ext) => (LIBRARY_TYPES[ext] ? [LIBRARY_TYPES[ext].mime] : null),
    maxBytesFor: (ext) => (LIBRARY_TYPES[ext]?.kind === "video" ? LIBRARY_VIDEO_MAX_BYTES : LIBRARY_IMAGE_MAX_BYTES),
  };
}

/** For the local multipart upload: checks name, browser MIME and size. */
export function checkMediaFile(area: MediaArea, name: string, mime: string, size: number): { ok: true; mime: string } | { ok: false; error: string } {
  const policy = mediaPolicy(area);
  const ext = extensionOf(name);
  const types = policy.typesFor(ext);
  if (!types) return { ok: false, error: area === "incoming" ? "Use a JPG, PNG or WebP image." : "Use JPG, PNG, WebP or AVIF images, or MP4 / WebM videos." };
  if (mime && !types.includes(mime.toLowerCase())) return { ok: false, error: `That does not look like a real .${ext} file.` };
  const max = policy.maxBytesFor(ext);
  if (size <= 0) return { ok: false, error: "That file is empty." };
  if (size > max) return { ok: false, error: `That file is ${formatBytes(size)}; the limit is ${formatBytes(max)}.` };
  return { ok: true, mime: types[0] as string };
}
