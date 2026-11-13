import type { NextRequest } from "next/server";
import { checkFile, MAX_FILE_BYTES } from "@/lib/leads/rules";
import { clientKey, jsonError, sameOrigin, serverError } from "@/server/http";
import { hitRate } from "@/server/ratelimit";
import { getStorage } from "@/server/storage";
import { localUpload } from "@/server/uploads";

/** Development-only customer file upload (when Vercel Blob is not configured). Same limits as the Blob token. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "This request was blocked.");
  try {
    if (getStorage().mode !== "local") return jsonError(404, "Not available.");
    const rate = await hitRate("upload", clientKey(req));
    if (!rate.allowed) {
      return jsonError(429, "Too many uploads from this connection. Please wait a while.", {}, { "Retry-After": String(rate.retryAfterSeconds) });
    }
    return await localUpload(req, "leads", "leads/incoming", checkFile, MAX_FILE_BYTES);
  } catch (err) {
    return serverError("uploads-local", err);
  }
}
