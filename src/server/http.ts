// Shared helpers for route handlers: stable JSON errors, size-capped JSON bodies, client hashing, origin checks.
// Request bodies and file contents are never logged.
import { NextResponse, type NextRequest } from "next/server";
import { hashIp } from "./auth/session";
import { ConfigError, ipSalt } from "./config";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(data, { status, headers: { ...NO_STORE, ...headers } });
}

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}): NextResponse {
  return json({ error, ...extra }, status, headers);
}

/** Logs the kind of failure only (never the request body), and returns a generic message. */
export function serverError(where: string, err: unknown): NextResponse {
  if (err instanceof ConfigError) {
    console.error(`[${where}] configuration error: ${err.message}`);
    return jsonError(503, "This service is not set up yet. Please contact us on WhatsApp or email.");
  }
  console.error(`[${where}] failed: ${err instanceof Error ? err.name : "unknown error"}`);
  return jsonError(500, "Something went wrong on our side. Please try again.");
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "local";
}

/** Salted hash of the client IP (the raw IP is never stored). */
export function clientKey(req: NextRequest): string {
  return hashIp(ipSalt(), clientIp(req));
}

/** Rejects cross-site browser posts: when an Origin header is present it must match this host. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Reads a JSON body up to `maxBytes`. Returns undefined for oversized or malformed bodies. */
export async function readJson(req: NextRequest, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return undefined;
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return undefined;
  const text = await req.text();
  if (text.length > maxBytes) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function truncate(v: string | null, max: number): string {
  return (v ?? "").slice(0, max);
}
