// File storage behind one small interface, chosen by environment:
// - blob:  Vercel Blob. Two stores: a PUBLIC one for site media (BLOB_READ_WRITE_TOKEN) and a PRIVATE one for
//          customer lead files (LEADS_BLOB_READ_WRITE_TOKEN), which are only readable through the admin route.
// - local: files under .data/uploads/<area>/<key> (development without cloud accounts). Media is served by
//          /api/media/..., lead files only by the authenticated admin route.
// Keys are validated by the callers (src/lib/leads/rules.ts); the local driver also refuses any path that
// escapes its folder.
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del, get, head, put } from "@vercel/blob";
import { FILE_TYPES, extensionOf } from "@/lib/leads/rules";
import { storageConfig } from "./config";

export type Area = "leads" | "media";

export interface ObjectInfo {
  size: number;
  contentType: string;
  /** Public URL for media; for private lead files this URL is NOT usable without the token. */
  url: string;
}

export interface ObjectStream extends ObjectInfo {
  stream: ReadableStream<Uint8Array>;
}

export interface Storage {
  mode: "blob" | "local";
  put(area: Area, key: string, body: Buffer, contentType: string): Promise<ObjectInfo>;
  stat(area: Area, key: string): Promise<ObjectInfo | null>;
  read(area: Area, key: string): Promise<ObjectStream | null>;
  remove(area: Area, keys: readonly string[]): Promise<void>;
}

const MEDIA_TYPES: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  mp4: "video/mp4",
  webm: "video/webm",
};

export function contentTypeFor(key: string): string {
  const ext = extensionOf(key);
  return MEDIA_TYPES[ext] ?? FILE_TYPES[ext]?.[0] ?? "application/octet-stream";
}

/* ---------- local ---------- */

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

function localPath(area: Area, key: string): string {
  const base = path.join(LOCAL_ROOT, area);
  const full = path.resolve(base, key);
  if (!full.startsWith(base + path.sep)) throw new Error("Invalid storage key.");
  return full;
}

/** Public URL of a locally stored media file (served by app/api/media/[...path]/route.ts). */
export function localMediaUrl(key: string): string {
  return `/api/media/${key.replace(/^media\//, "")}`;
}

const localStorage: Storage = {
  mode: "local",
  async put(area, key, body, contentType) {
    const file = localPath(area, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body, { flag: "wx" });
    return { size: body.length, contentType, url: area === "media" ? localMediaUrl(key) : "" };
  },
  async stat(area, key) {
    try {
      const s = await fs.stat(localPath(area, key));
      if (!s.isFile()) return null;
      return { size: s.size, contentType: contentTypeFor(key), url: area === "media" ? localMediaUrl(key) : "" };
    } catch {
      return null;
    }
  },
  async read(area, key) {
    const info = await localStorage.stat(area, key);
    if (!info) return null;
    const stream = Readable.toWeb(createReadStream(localPath(area, key))) as ReadableStream<Uint8Array>;
    return { ...info, stream };
  },
  async remove(area, keys) {
    for (const key of keys) {
      const file = localPath(area, key);
      await fs.rm(file, { force: true });
      // Tidy the per-upload folder if it is now empty.
      await fs.rmdir(path.dirname(file)).catch(() => undefined);
    }
  },
};

/** Writes a stream to local storage (multipart uploads in development), enforcing a byte cap. */
export async function localPutStream(area: Area, key: string, body: ReadableStream<Uint8Array>, maxBytes: number): Promise<number> {
  const file = localPath(area, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const handle = await fs.open(file, "wx");
  let total = 0;
  try {
    const reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("too-large");
      await handle.write(value);
    }
  } catch (err) {
    await handle.close();
    await fs.rm(file, { force: true });
    throw err;
  }
  await handle.close();
  return total;
}

/* ---------- Vercel Blob ---------- */

function blobStorage(mediaToken: string, leadsToken: string): Storage {
  const token = (area: Area) => (area === "leads" ? leadsToken : mediaToken);
  const access = (area: Area) => (area === "leads" ? ("private" as const) : ("public" as const));
  return {
    mode: "blob",
    async put(area, key, body, contentType) {
      const r = await put(key, body, {
        access: access(area),
        token: token(area),
        contentType,
        addRandomSuffix: false,
        allowOverwrite: false,
        cacheControlMaxAge: area === "media" ? 31_536_000 : undefined,
      });
      return { size: body.length, contentType, url: r.url };
    },
    async stat(area, key) {
      try {
        const h = await head(key, { token: token(area) });
        return { size: h.size, contentType: h.contentType, url: h.url };
      } catch {
        return null;
      }
    },
    async read(area, key) {
      const r = await get(key, { access: access(area), token: token(area), useCache: false });
      if (!r || r.statusCode !== 200) return null;
      return { stream: r.stream, size: r.blob.size, contentType: r.blob.contentType, url: r.blob.url };
    },
    async remove(area, keys) {
      if (keys.length) await del([...keys], { token: token(area) });
    },
  };
}

export function getStorage(): Storage {
  const cfg = storageConfig();
  return cfg.kind === "blob" ? blobStorage(cfg.mediaToken, cfg.leadsToken) : localStorage;
}

export function blobTokens(): { media: string; leads: string } | null {
  const cfg = storageConfig();
  return cfg.kind === "blob" ? { media: cfg.mediaToken, leads: cfg.leadsToken } : null;
}

/** Reads a stored object fully into memory (for image processing), refusing anything over `maxBytes`. */
export async function readBuffer(area: Area, key: string, maxBytes: number): Promise<Buffer | null> {
  const obj = await getStorage().read(area, key);
  if (!obj) return null;
  if (obj.size > maxBytes) {
    await obj.stream.cancel();
    throw new Error("too-large");
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = obj.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("too-large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
