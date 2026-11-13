import type { NextRequest } from "next/server";
import { isMediaUploadKey } from "@/lib/leads/rules";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { addLibraryItem, MediaInputError } from "@/server/media";

export const maxDuration = 60;

/** Register an uploaded library file: { key: "media/library/<uuid>/<name>", name?, alt? }. */
export async function POST(req: NextRequest) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const body = await readJson(req, 4096);
    if (typeof body !== "object" || body === null) return jsonError(400, "Invalid request.");
    const { key, name, alt } = body as Record<string, unknown>;
    if (!isMediaUploadKey(key, "library")) return jsonError(400, "Invalid upload.");
    const item = await addLibraryItem(key, typeof name === "string" ? name : "", typeof alt === "string" ? alt : "");
    return json({ ok: true, item }, 201);
  } catch (err) {
    if (err instanceof MediaInputError) return jsonError(400, err.message);
    return serverError("admin-library-add", err);
  }
}
