// Site image overrides and the media library: data access, image processing (sharp) and cache revalidation.
import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import sharp from "sharp";
import manifest from "@/content/image-manifest.json";
import generated from "@/content/images.generated.json";
import { extensionOf, sanitizeFilename } from "@/lib/leads/rules";
import type { ImageId } from "@/content/images";
import { resolveImage, type ImageVariant, type MediaOverride, type MediaOverrides, type ResolvedImage } from "@/lib/media";
import { ConfigError, isBuildPhase } from "./config";
import { iso, json, num, query, str, type Row } from "./db";
import { getStorage, readBuffer } from "./storage";

export const MEDIA_TAG = "media-overrides";
const TARGET_WIDTHS = [360, 720];

export const SLOT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const SLOT_UPLOAD_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
export const LIBRARY_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const LIBRARY_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const LIBRARY_TYPES: Record<string, { mime: string; kind: "image" | "video" }> = {
  jpg: { mime: "image/jpeg", kind: "image" },
  jpeg: { mime: "image/jpeg", kind: "image" },
  png: { mime: "image/png", kind: "image" },
  webp: { mime: "image/webp", kind: "image" },
  avif: { mime: "image/avif", kind: "image" },
  mp4: { mime: "video/mp4", kind: "video" },
  webm: { mime: "video/webm", kind: "video" },
};

export interface SlotInfo {
  id: string;
  alt: string;
  aspect: string;
  focusY: number;
}

const slots: SlotInfo[] = manifest.images.map((i) => ({ id: i.id, alt: i.alt, aspect: i.aspect, focusY: typeof i.focusY === "number" ? i.focusY : 0.5 }));

/** Only ids that have built images are real slots (images.generated.json defines the ImageId type). */
export function getSlot(id: string): SlotInfo | undefined {
  return Object.hasOwn(generated, id) ? slots.find((s) => s.id === id) : undefined;
}

export function allSlots(): SlotInfo[] {
  return slots.filter((s) => Object.hasOwn(generated, s.id));
}

/* ---------- overrides ---------- */

interface OverrideRecord extends MediaOverride {
  slotId: string;
  keys: string[];
}

function toVariants(v: unknown): (ImageVariant & { key: string })[] {
  const arr = json(v);
  if (!Array.isArray(arr)) return [];
  return arr.flatMap((x: unknown) => {
    if (typeof x !== "object" || x === null) return [];
    const o = x as Record<string, unknown>;
    const format = o.format === "avif" || o.format === "webp" ? o.format : null;
    if (!format || typeof o.url !== "string") return [];
    return [{ width: num(o.width), format, url: o.url, key: str(o.key) }];
  });
}

function toOverride(r: Row): OverrideRecord {
  const variants = toVariants(r.variants);
  return {
    slotId: str(r.slot_id),
    url: str(r.url),
    width: num(r.width),
    height: num(r.height),
    alt: r.alt == null ? null : str(r.alt),
    variants: variants.map(({ width, format, url }) => ({ width, format, url })),
    keys: variants.map((v) => v.key).filter(Boolean),
    updatedAt: iso(r.updated_at),
  };
}

export async function listOverrides(): Promise<OverrideRecord[]> {
  return (await query("SELECT * FROM media_overrides ORDER BY slot_id")).map(toOverride);
}

async function readOverrides(): Promise<MediaOverrides> {
  try {
    const out: MediaOverrides = {};
    for (const o of await listOverrides()) {
      out[o.slotId] = { url: o.url, width: o.width, height: o.height, alt: o.alt, variants: o.variants, updatedAt: o.updatedAt };
    }
    return out;
  } catch (err) {
    // Building without a database (e.g. `npm run check` on a laptop): pages are built with the original images.
    // At runtime in production a missing DATABASE_URL still fails loudly.
    if (isBuildPhase && err instanceof ConfigError) {
      if (!globalThis.__acsWarnedNoDb) {
        console.warn("[media] DATABASE_URL is not set: building pages with the original images (no admin replacements).");
        globalThis.__acsWarnedNoDb = true;
      }
      return {};
    }
    throw err;
  }
}

declare global {
  var __acsWarnedNoDb: boolean | undefined;
}

/** One cached read shared by every page; invalidated by revalidateMedia() after an admin change. */
export const getMediaOverrides = unstable_cache(readOverrides, ["media-overrides-v1"], { tags: [MEDIA_TAG] });

/** A slot's current image (replacement or built-in) for server-side use such as Open Graph tags. */
export async function slotImage(id: ImageId): Promise<ResolvedImage> {
  return resolveImage(id, (await getMediaOverrides())[id]);
}

/** Rebuilds the statically generated pages so a media change is live without a redeploy. */
export function revalidateMedia(): void {
  revalidateTag(MEDIA_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}

/** Crop box for a W:H aspect, positioned by focusY (same maths as scripts/build-images.mjs). */
function cropBox(width: number, height: number, aspect: string, focusY: number) {
  const [aw = 1, ah = 1] = aspect.split(":").map(Number);
  const target = aw / ah;
  if (width / height > target) {
    const w = Math.round(height * target);
    return { left: Math.round((width - w) / 2), top: 0, width: w, height };
  }
  const h = Math.round(width / target);
  return { left: 0, top: Math.round((height - h) * focusY), width, height: h };
}

export class MediaInputError extends Error {}

/**
 * Replaces a slot's image: crops to the slot's aspect, builds 360/720 AVIF + WebP (like `npm run images`),
 * stores them, saves the override and deletes the previous replacement's files.
 */
export async function replaceSlot(slot: SlotInfo, source: Buffer): Promise<MediaOverride> {
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(source, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new MediaInputError("That file is not a readable image.");
  }
  if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) throw new MediaInputError("Use a JPG, PNG or WebP image.");

  // Apply EXIF orientation first so phone photos are the right way up.
  const upright = await sharp(source, { limitInputPixels: 60_000_000 }).rotate().toBuffer({ resolveWithObject: true });
  const { width: srcW, height: srcH } = upright.info;
  if (srcW < 300 || srcH < 300) throw new MediaInputError("That image is too small. Use one at least 720 pixels wide.");
  const box = cropBox(srcW, srcH, slot.aspect, slot.focusY);
  const [aw = 1, ah = 1] = slot.aspect.split(":").map(Number);
  const widths = TARGET_WIDTHS.filter((w) => w < box.width);
  widths.push(Math.min(box.width, TARGET_WIDTHS.at(-1) ?? 720));
  const unique = [...new Set(widths)].sort((a, b) => a - b);

  const storage = getStorage();
  const version = randomUUID().slice(0, 8);
  const variants: (ImageVariant & { key: string })[] = [];
  for (const w of unique) {
    const h = Math.round((w * ah) / aw);
    const pipeline = sharp(upright.data).extract(box).resize(w, h, { fit: "cover" });
    const outputs: [ImageVariant["format"], Buffer][] = [
      ["avif", await pipeline.clone().avif({ quality: 52, effort: 4 }).toBuffer()],
      ["webp", await pipeline.clone().webp({ quality: 74, effort: 4 }).toBuffer()],
    ];
    for (const [format, buf] of outputs) {
      const key = `media/slots/${slot.id}/${version}-${w}.${format}`;
      const stored = await storage.put("media", key, buf, format === "avif" ? "image/avif" : "image/webp");
      variants.push({ width: w, format, url: stored.url, key });
    }
  }
  const largest = unique.at(-1) ?? 720;
  const height = Math.round((largest * ah) / aw);
  const fallback = variants.find((v) => v.format === "webp" && v.width === largest);
  if (!fallback) throw new Error("No fallback variant was produced.");

  const previous = (await query("SELECT * FROM media_overrides WHERE slot_id = $1", [slot.id])).map(toOverride)[0];
  const rows = await query(
    `INSERT INTO media_overrides (slot_id, url, width, height, alt, mime, variants, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'image/webp', $6::jsonb, now())
     ON CONFLICT (slot_id) DO UPDATE SET url = EXCLUDED.url, width = EXCLUDED.width, height = EXCLUDED.height,
       mime = EXCLUDED.mime, variants = EXCLUDED.variants, updated_at = now()
     RETURNING *`,
    [slot.id, fallback.url, largest, height, previous?.alt ?? null, JSON.stringify(variants)],
  );
  if (previous?.keys.length) await storage.remove("media", previous.keys).catch(() => console.error("[media] could not delete old slot files"));
  const saved = rows[0];
  if (!saved) throw new Error("Override upsert returned nothing.");
  return toOverride(saved);
}

/** Sets (or clears, with null) the alt text for a slot, keeping any replacement image. */
export async function setSlotAlt(slot: SlotInfo, alt: string | null): Promise<void> {
  if (alt === null) {
    // Clearing the alt: drop alt-only rows entirely, keep image rows.
    await query("DELETE FROM media_overrides WHERE slot_id = $1 AND url = ''", [slot.id]);
    await query("UPDATE media_overrides SET alt = NULL, updated_at = now() WHERE slot_id = $1", [slot.id]);
    return;
  }
  await query(
    `INSERT INTO media_overrides (slot_id, url, width, height, alt, mime, variants, updated_at)
     VALUES ($1, '', 0, 0, $2, '', '[]'::jsonb, now())
     ON CONFLICT (slot_id) DO UPDATE SET alt = EXCLUDED.alt, updated_at = now()`,
    [slot.id, alt],
  );
}

/** Back to the built-in image and manifest alt text. */
export async function resetSlot(slot: SlotInfo): Promise<void> {
  const rows = await query("DELETE FROM media_overrides WHERE slot_id = $1 RETURNING *", [slot.id]);
  const keys = rows.map(toOverride).flatMap((o) => o.keys);
  if (keys.length) await getStorage().remove("media", keys).catch(() => console.error("[media] could not delete slot files"));
}

/** Reads an admin upload from media/incoming, checks it, and deletes the original after processing. */
export async function takeIncoming(key: string): Promise<Buffer> {
  const ext = extensionOf(key);
  if (!SLOT_UPLOAD_TYPES[ext]) throw new MediaInputError("Use a JPG, PNG or WebP image.");
  let buf: Buffer | null;
  try {
    buf = await readBuffer("media", key, SLOT_UPLOAD_MAX_BYTES);
  } catch {
    throw new MediaInputError("That image is too large (20 MB at most).");
  }
  if (!buf) throw new MediaInputError("The upload was not found. Please try again.");
  await getStorage()
    .remove("media", [key])
    .catch(() => console.error("[media] could not delete processed original"));
  return buf;
}

/* ---------- library ---------- */

export interface LibraryItem {
  id: string;
  url: string;
  storageKey: string;
  name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  kind: "image" | "video";
  alt: string;
  createdAt: string;
}

function toItem(r: Row): LibraryItem {
  return {
    id: str(r.id),
    url: str(r.url),
    storageKey: str(r.storage_key),
    name: str(r.name),
    mime: str(r.mime),
    size: num(r.size),
    width: r.width == null ? null : num(r.width),
    height: r.height == null ? null : num(r.height),
    kind: str(r.kind) === "video" ? "video" : "image",
    alt: str(r.alt),
    createdAt: iso(r.created_at),
  };
}

export async function listLibrary(): Promise<LibraryItem[]> {
  return (await query("SELECT * FROM media_library ORDER BY created_at DESC LIMIT 500")).map(toItem);
}

export async function addLibraryItem(key: string, name: string, alt: string): Promise<LibraryItem> {
  const type = LIBRARY_TYPES[extensionOf(key)];
  if (!type) throw new MediaInputError("Use JPG, PNG, WebP or AVIF images, or MP4 / WebM videos.");
  const storage = getStorage();
  const info = await storage.stat("media", key);
  if (!info) throw new MediaInputError("The upload was not found. Please try again.");
  const cap = type.kind === "video" ? LIBRARY_VIDEO_MAX_BYTES : LIBRARY_IMAGE_MAX_BYTES;
  const reject = async (msg: string): Promise<never> => {
    await storage.remove("media", [key]).catch(() => undefined);
    throw new MediaInputError(msg);
  };
  if (info.size > cap) return reject(`That file is too large (${Math.round(cap / 1024 / 1024)} MB at most).`);
  let width: number | null = null;
  let height: number | null = null;
  if (type.kind === "image") {
    const buf = await readBuffer("media", key, cap);
    try {
      const meta = buf ? await sharp(buf, { limitInputPixels: 60_000_000 }).metadata() : null;
      if (!meta?.format || !["jpeg", "png", "webp", "heif"].includes(meta.format)) return reject("That file is not a readable image.");
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      return reject("That file is not a readable image.");
    }
  }
  const displayName = name.trim().slice(0, 120) || sanitizeFilename(key.split("/").pop() ?? "file");
  const rows = await query(
    `INSERT INTO media_library (url, storage_key, name, mime, size, width, height, kind, alt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [info.url, key, displayName, type.mime, info.size, width, height, type.kind, alt.trim().slice(0, 300)],
  );
  const row = rows[0];
  if (!row) throw new Error("Library insert returned nothing.");
  return toItem(row);
}

export async function updateLibraryItem(id: string, patch: { name?: string; alt?: string }): Promise<LibraryItem | null> {
  const rows = await query(
    `UPDATE media_library SET name = COALESCE($2, name), alt = COALESCE($3, alt) WHERE id = $1 RETURNING *`,
    [id, patch.name?.trim().slice(0, 120) || null, patch.alt === undefined ? null : patch.alt.trim().slice(0, 300)],
  );
  return rows[0] ? toItem(rows[0]) : null;
}

export async function deleteLibraryItem(id: string): Promise<boolean> {
  const rows = await query("DELETE FROM media_library WHERE id = $1 RETURNING storage_key", [id]);
  const key = rows[0] ? str(rows[0].storage_key) : "";
  if (key) await getStorage().remove("media", [key]).catch(() => console.error("[media] could not delete library file"));
  return rows.length > 0;
}
