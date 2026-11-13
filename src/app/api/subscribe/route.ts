import type { NextRequest } from "next/server";
import { normalizeEmail } from "@/lib/newsletter";
import { clientKey, json, jsonError, readJson, sameOrigin, serverError, truncate } from "@/server/http";
import { hitRate } from "@/server/ratelimit";
import { addSubscriber } from "@/server/subscribers";

const MAX_BODY = 2 * 1024;

/** Newsletter sign-up from the footer. The reply is the same whether or not the address was already on the list. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "This request was blocked.");
  try {
    const body = await readJson(req, MAX_BODY);
    if (typeof body !== "object" || body === null) return jsonError(400, "Invalid request.");
    const b = body as Record<string, unknown>;
    // Honeypot: a filled hidden field means a bot. Pretend it worked.
    if (typeof b.website === "string" && b.website.trim() !== "") return json({ ok: true });
    const email = normalizeEmail(b.email);
    if (!email) return jsonError(400, "Enter a valid email, like name@brand.com.");

    const ipHash = clientKey(req);
    const rate = await hitRate("subscribe", ipHash);
    if (!rate.allowed) {
      return jsonError(429, "Too many sign-ups from this connection. Please try again later.", {}, { "Retry-After": String(rate.retryAfterSeconds) });
    }
    await addSubscriber(email, { sourcePath: truncate(typeof b.sourcePath === "string" ? b.sourcePath : "", 200), ipHash });
    return json({ ok: true }, 201);
  } catch (err) {
    return serverError("subscribe", err);
  }
}
