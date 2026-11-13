import type { NextRequest } from "next/server";
import { cleanText } from "@/lib/leads/rules";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { UUID_RE } from "@/server/leads";
import { deleteLibraryItem, updateLibraryItem } from "@/server/media";

type Ctx = { params: Promise<{ id: string }> };

/** Edit a library item's name and/or alt text. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const { id } = await params;
    if (!UUID_RE.test(id)) return jsonError(404, "Not found.");
    const body = await readJson(req, 4096);
    if (typeof body !== "object" || body === null) return jsonError(400, "Invalid request.");
    const { name, alt } = body as Record<string, unknown>;
    if ((name !== undefined && typeof name !== "string") || (alt !== undefined && typeof alt !== "string")) return jsonError(400, "Invalid request.");
    const item = await updateLibraryItem(id, {
      name: typeof name === "string" ? cleanText(name, 120) : undefined,
      alt: typeof alt === "string" ? cleanText(alt, 300) : undefined,
    });
    if (!item) return jsonError(404, "Not found.");
    return json({ ok: true, item });
  } catch (err) {
    return serverError("admin-library-edit", err);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const { id } = await params;
    if (!UUID_RE.test(id) || !(await deleteLibraryItem(id))) return jsonError(404, "Not found.");
    return json({ ok: true });
  } catch (err) {
    return serverError("admin-library-delete", err);
  }
}
