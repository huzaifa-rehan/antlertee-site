import type { NextRequest } from "next/server";
import { isLeadStatus } from "@/lib/leads/rules";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { deleteLead, setLeadStatus } from "@/server/leads";
import { getStorage } from "@/server/storage";

type Ctx = { params: Promise<{ id: string }> };

/** Change a lead's status: { status: "new" | "read" | "done" | "spam" }. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const { id } = await params;
    const body = await readJson(req, 1024);
    const status = typeof body === "object" && body !== null ? (body as { status?: unknown }).status : undefined;
    if (!isLeadStatus(status)) return jsonError(400, "Unknown status.");
    if (!(await setLeadStatus(id, status))) return jsonError(404, "Lead not found.");
    return json({ ok: true, status });
  } catch (err) {
    return serverError("admin-lead-status", err);
  }
}

/** Delete a lead and its files. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const { id } = await params;
    const keys = await deleteLead(id);
    if (keys === null) return jsonError(404, "Lead not found.");
    if (keys.length) {
      await getStorage()
        .remove("leads", keys)
        .catch(() => console.error("[admin-lead-delete] lead deleted, but some files could not be removed from storage"));
    }
    return json({ ok: true });
  } catch (err) {
    return serverError("admin-lead-delete", err);
  }
}
