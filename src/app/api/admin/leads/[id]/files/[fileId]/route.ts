import type { NextRequest } from "next/server";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { jsonError, serverError } from "@/server/http";
import { getLeadFile } from "@/server/leads";
import { getStorage } from "@/server/storage";

/** Types the browser may show inline (everything else downloads). Never HTML/SVG: those are not accepted at all. */
const INLINE = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

function contentDisposition(kind: "inline" | "attachment", name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** Streams a customer file to the logged-in admin. `?view=1` shows PDFs and images inline. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const ctx = requireAdminApi(req, false);
    if (!isAdminContext(ctx)) return ctx;
    const { id, fileId } = await params;
    const file = await getLeadFile(id, fileId);
    if (!file) return jsonError(404, "File not found.");
    const obj = await getStorage().read("leads", file.storageKey);
    if (!obj) return jsonError(404, "File not found in storage.");
    const inline = req.nextUrl.searchParams.get("view") === "1" && INLINE.has(file.mime);
    return new Response(obj.stream, {
      headers: {
        "Content-Type": file.mime,
        "Content-Length": String(obj.size),
        "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", file.originalName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        // Chrome's PDF viewer will not run in a sandboxed document, so PDFs get a strict policy without `sandbox`.
        "Content-Security-Policy": file.mime === "application/pdf" ? "default-src 'none'; img-src 'self'" : "default-src 'none'; img-src 'self'; sandbox",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (err) {
    return serverError("admin-lead-file", err);
  }
}
