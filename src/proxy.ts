import { NextResponse, type NextRequest } from "next/server";
import { signingKey, verifySession } from "@/server/auth/session";
import { authConfig } from "@/server/config";

/**
 * Admin pages: send visitors without a valid session to the login page before anything renders.
 * This is the first layer only: every admin page and /api/admin handler checks the session again itself.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login" || pathname === "/admin/login/") return NextResponse.next();
  let valid = false;
  try {
    const cfg = authConfig();
    valid = verifySession(signingKey(cfg.sessionSecret, cfg.passwordFingerprint), req.cookies.get("acs_admin")?.value, Math.floor(Date.now() / 1000)) !== null;
  } catch {
    // Admin not configured (production without env vars): the login page explains it.
    valid = false;
  }
  if (valid) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
