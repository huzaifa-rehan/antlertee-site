import type { NextRequest } from "next/server";
import { isUploadPathname } from "@/lib/leads/rules";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { jsonError, serverError } from "@/server/http";
import { mediaPolicy } from "@/server/media-upload-policy";
import { blobTokens } from "@/server/storage";
import { blobTokenResponse } from "@/server/uploads";

/**
 * Vercel Blob client-upload token for admin media (public store). The admin must be logged in and send the CSRF
 * header; the pathname decides the area: media/incoming (slot originals) or media/library.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const tokens = blobTokens();
    if (!tokens) return jsonError(404, "Not available.");
    const area = req.nextUrl.searchParams.get("area") === "library" ? "library" : "incoming";
    const prefix = area === "library" ? "media/library" : "media/incoming";
    return await blobTokenResponse(req, tokens.media, prefix, mediaPolicy(area), (p) => isUploadPathname(p, prefix), async () => undefined);
  } catch (err) {
    return serverError("admin-upload-token", err);
  }
}
