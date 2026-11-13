import type { NextRequest } from "next/server";
import { cleanText, isMediaUploadKey } from "@/lib/leads/rules";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { getSlot, MediaInputError, replaceSlot, resetSlot, revalidateMedia, setSlotAlt, takeIncoming } from "@/server/media";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

const field = (body: unknown, name: string): unknown => (typeof body === "object" && body !== null ? (body as Record<string, unknown>)[name] : undefined);

/** Replace a slot's image with an uploaded original: { key: "media/incoming/<uuid>/<name>" }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const slot = getSlot((await params).id);
    if (!slot) return jsonError(404, "Unknown image slot.");
    const key = field(await readJson(req, 2048), "key");
    if (!isMediaUploadKey(key, "incoming")) return jsonError(400, "Invalid upload.");
    const override = await replaceSlot(slot, await takeIncoming(key));
    revalidateMedia();
    return json({ ok: true, override });
  } catch (err) {
    if (err instanceof MediaInputError) return jsonError(400, err.message);
    return serverError("admin-slot-replace", err);
  }
}

/** Edit a slot's alt text: { alt: string } ("" or null resets to the manifest text). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const slot = getSlot((await params).id);
    if (!slot) return jsonError(404, "Unknown image slot.");
    const raw = field(await readJson(req, 4096), "alt");
    if (raw !== null && typeof raw !== "string") return jsonError(400, "Invalid alt text.");
    const alt = typeof raw === "string" ? cleanText(raw, 300) : "";
    await setSlotAlt(slot, alt === "" ? null : alt);
    revalidateMedia();
    return json({ ok: true });
  } catch (err) {
    return serverError("admin-slot-alt", err);
  }
}

/** Reset a slot to the built-in image and alt text. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const slot = getSlot((await params).id);
    if (!slot) return jsonError(404, "Unknown image slot.");
    await resetSlot(slot);
    revalidateMedia();
    return json({ ok: true });
  } catch (err) {
    return serverError("admin-slot-reset", err);
  }
}
