// Admin guard for pages (server components) and route handlers. Every /admin page and /api/admin handler calls
// one of these; proxy.ts only adds an early redirect for pages.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest, NextResponse } from "next/server";
import { authConfig, isProduction } from "../config";
import { jsonError, sameOrigin } from "../http";
import { csrfToken, signingKey, signSession, verifyCsrf, verifySession, SESSION_TTL_SECONDS, type SessionPayload } from "./session";

export const SESSION_COOKIE = "acs_admin";

const now = () => Math.floor(Date.now() / 1000);

function key(): string {
  const cfg = authConfig();
  return signingKey(cfg.sessionSecret, cfg.passwordFingerprint);
}

export function sessionFromToken(token: string | undefined): SessionPayload | null {
  return verifySession(key(), token, now());
}

export function newSessionCookie(): { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] } {
  const { token } = signSession(key(), now());
  return {
    name: SESSION_COOKIE,
    value: token,
    options: { httpOnly: true, sameSite: "strict", secure: isProduction, path: "/", maxAge: SESSION_TTL_SECONDS },
  };
}

export function clearedSessionCookie() {
  return { name: SESSION_COOKIE, value: "", options: { httpOnly: true, sameSite: "strict" as const, secure: isProduction, path: "/", maxAge: 0 } };
}

export interface AdminContext {
  session: SessionPayload;
  csrf: string;
}

/** For admin pages: redirects to the login page when there is no valid session. */
export async function requireAdminPage(): Promise<AdminContext> {
  const jar = await cookies();
  const session = sessionFromToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login/");
  return { session, csrf: csrfToken(key(), session.sid) };
}

export async function currentAdmin(): Promise<AdminContext | null> {
  const jar = await cookies();
  const session = sessionFromToken(jar.get(SESSION_COOKIE)?.value);
  return session ? { session, csrf: csrfToken(key(), session.sid) } : null;
}

/**
 * For /api/admin handlers. Reads are allowed with a valid session; changes (`mutating`) also need the CSRF header
 * and a same-origin request. Returns the context, or an error response to return as-is.
 */
export function requireAdminApi(req: NextRequest, mutating: boolean): AdminContext | NextResponse {
  const session = sessionFromToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return jsonError(401, "Please log in again.");
  if (mutating && (!sameOrigin(req) || !verifyCsrf(key(), session.sid, req.headers.get("x-csrf-token")))) {
    return jsonError(403, "This request was blocked. Reload the page and try again.");
  }
  return { session, csrf: csrfToken(key(), session.sid) };
}

export const isAdminContext = (v: AdminContext | NextResponse): v is AdminContext => !(v instanceof Response);
