import type { NextRequest } from "next/server";
import { isMediaUploadKey } from "@/lib/leads/rules";
import { jsonError, serverError } from "@/server/http";
import { getStorage } from "@/server/storage";

const SLOT_FILE = /^media\/slots\/[a-z0-9-]{1,60}\/[0-9a-f]{8}-\d{2,4}\.(avif|webp)$/;

/**
 * Serves site media in LOCAL development only (in production media lives on the public Vercel Blob store).
 * Only replaced slot images and library items; never lead files, never media/incoming originals.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const storage = getStorage();
    if (storage.mode !== "local") return jsonError(404, "Not found.");
    const { path } = await params;
    const key = `media/${path.join("/")}`;
    if (!SLOT_FILE.test(key) && !isMediaUploadKey(key, "library")) return jsonError(404, "Not found.");
    const obj = await storage.read("media", key);
    if (!obj) return jsonError(404, "Not found.");
    return new Response(obj.stream, {
      headers: {
        "Content-Type": obj.contentType,
        "Content-Length": String(obj.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return serverError("media-file", err);
  }
}
