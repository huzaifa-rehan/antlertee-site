import type { NextRequest } from "next/server";
import { FILE_TYPES, MAX_FILE_BYTES, isUploadPathname } from "@/lib/leads/rules";
import { clientKey, jsonError, sameOrigin, serverError } from "@/server/http";
import { hitRate } from "@/server/ratelimit";
import { blobTokens } from "@/server/storage";
import { blobTokenResponse, UploadRefused } from "@/server/uploads";

/** Vercel Blob client-upload token for a customer file (private store, leads/incoming/<uuid>/<name>). */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "This request was blocked.");
  try {
    const tokens = blobTokens();
    if (!tokens) return jsonError(404, "Not available.");
    const key = clientKey(req);
    return await blobTokenResponse(
      req,
      tokens.leads,
      "leads/incoming",
      { typesFor: (ext) => FILE_TYPES[ext] ?? null, maxBytesFor: () => MAX_FILE_BYTES },
      (p) => isUploadPathname(p, "leads/incoming"),
      async () => {
        const rate = await hitRate("upload", key);
        if (!rate.allowed) throw new UploadRefused("Too many uploads from this connection. Please wait a while.", 429);
      },
    );
  } catch (err) {
    return serverError("uploads-token", err);
  }
}
