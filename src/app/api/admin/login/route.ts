import type { NextRequest } from "next/server";
import { newSessionCookie } from "@/server/auth/admin";
import { checkPassword } from "@/server/auth/session";
import { authConfig } from "@/server/config";
import { clientKey, json, jsonError, readJson, sameOrigin, serverError } from "@/server/http";
import { checkRate, recordRate } from "@/server/ratelimit";

const GENERIC = "That password is not right.";

/** Single-admin login. Constant-time check, failed attempts rate-limited per client and globally. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "This request was blocked.");
  try {
    const cfg = authConfig();
    const key = clientKey(req);
    const [mine, everyone] = await Promise.all([checkRate("login", key), checkRate("loginGlobal", "all")]);
    if (!mine.allowed || !everyone.allowed) {
      const wait = Math.max(mine.retryAfterSeconds, everyone.retryAfterSeconds);
      return jsonError(429, `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute${wait > 60 ? "s" : ""}.`, {}, { "Retry-After": String(wait) });
    }
    const body = await readJson(req, 2048);
    const password = typeof body === "object" && body !== null ? (body as { password?: unknown }).password : undefined;
    if (typeof password !== "string" || !checkPassword(password, cfg.password)) {
      await Promise.all([recordRate("login", key), recordRate("loginGlobal", "all")]);
      return jsonError(401, GENERIC);
    }
    const res = json({ ok: true });
    const cookie = newSessionCookie();
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (err) {
    return serverError("admin-login", err);
  }
}
