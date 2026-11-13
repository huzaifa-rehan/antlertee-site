import type { NextRequest } from "next/server";
import { composeTechPack, sanitize } from "@/components/techpack/logic";
import { checkFile, checkSelection, leadReference, validateLead, type LeadFileRef } from "@/lib/leads/rules";
import { clientKey, json, jsonError, readJson, sameOrigin, serverError, truncate } from "@/server/http";
import { createLead, type LeadPayload } from "@/server/leads";
import { hitRate } from "@/server/ratelimit";
import { getStorage } from "@/server/storage";

const MAX_BODY = 96 * 1024;

/** Creates a quote or tech pack lead. Files were uploaded first; here we only verify and attach them. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "This request was blocked.");
  try {
    const body = await readJson(req, MAX_BODY);
    if (body === undefined) return jsonError(400, "Invalid request.");
    const result = validateLead(body);
    if (!result.ok) return jsonError(400, "Please check the form.", { errors: result.errors });
    const input = result.value;

    const ipHash = clientKey(req);
    const rate = await hitRate("lead", ipHash);
    if (!rate.allowed) {
      return jsonError(429, "Too many messages from this connection. Please wait a while, or send it on WhatsApp or email.", {}, {
        "Retry-After": String(rate.retryAfterSeconds),
      });
    }

    // Each file must exist in OUR store under the lead prefix (the key format was checked by validateLead).
    // Sizes and types are re-checked against what was actually stored, not what the browser said.
    const storage = getStorage();
    const files: LeadFileRef[] = [];
    for (const f of input.files) {
      const info = await storage.stat("leads", f.key);
      if (!info) return jsonError(400, "One of your files did not finish uploading. Please add it again.", { errors: { files: "Upload missing." } });
      const check = checkFile(f.name, storage.mode === "blob" ? info.contentType : f.mime, info.size);
      if (!check.ok) return jsonError(400, check.error, { errors: { files: check.error } });
      files.push({ ...f, size: info.size, mime: check.mime });
    }
    const selectionError = checkSelection(files);
    if (selectionError) return jsonError(400, selectionError, { errors: { files: selectionError } });

    const payload: LeadPayload = {};
    if (Object.keys(input.fields).length) payload.fields = input.fields;
    if (input.techPack) {
      const techPack = sanitize(input.techPack);
      payload.techPack = techPack;
      payload.summary = composeTechPack(techPack).body;
    }

    const id = await createLead(input, payload, files, { ipHash, userAgent: truncate(req.headers.get("user-agent"), 300) });
    return json({ id, reference: leadReference(id) }, 201);
  } catch (err) {
    return serverError("leads", err);
  }
}
