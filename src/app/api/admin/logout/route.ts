import type { NextRequest } from "next/server";
import { clearedSessionCookie, isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { json, serverError } from "@/server/http";

export async function POST(req: NextRequest) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const res = json({ ok: true });
    const c = clearedSessionCookie();
    res.cookies.set(c.name, c.value, c.options);
    return res;
  } catch (err) {
    return serverError("admin-logout", err);
  }
}
