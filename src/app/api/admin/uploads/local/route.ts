import type { NextRequest } from "next/server";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { jsonError, serverError } from "@/server/http";
import { LIBRARY_VIDEO_MAX_BYTES } from "@/server/media";
import { checkMediaFile } from "@/server/media-upload-policy";
import { getStorage } from "@/server/storage";
import { localUpload } from "@/server/uploads";

/** Development-only admin media upload (when Vercel Blob is not configured). `?area=incoming|library`. */
export async function POST(req: NextRequest) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    if (getStorage().mode !== "local") return jsonError(404, "Not available.");
    const area = req.nextUrl.searchParams.get("area") === "library" ? "library" : "incoming";
    return await localUpload(
      req,
      "media",
      area === "library" ? "media/library" : "media/incoming",
      (name, mime, size) => checkMediaFile(area, name, mime, size),
      LIBRARY_VIDEO_MAX_BYTES,
    );
  } catch (err) {
    return serverError("admin-upload-local", err);
  }
}
