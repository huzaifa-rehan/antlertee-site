import type { NextRequest } from "next/server";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { serverError } from "@/server/http";
import { allSubscribersForExport } from "@/server/subscribers";

/** CSV cell: quoted, and formula-looking values prefixed so spreadsheets do not execute them. */
function cell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = requireAdminApi(req, false);
    if (!isAdminContext(ctx)) return ctx;
    const subscribers = await allSubscribersForExport();
    const lines = [["email", "status", "signed_up_at", "source_path"].map(cell).join(",")];
    for (const s of subscribers) lines.push([s.email, s.status, s.createdAt, s.sourcePath].map(cell).join(","));
    const date = new Date().toISOString().slice(0, 10);
    return new Response(`﻿${lines.join("\r\n")}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="antlertee-subscribers-${date}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return serverError("admin-subscribers-export", err);
  }
}
