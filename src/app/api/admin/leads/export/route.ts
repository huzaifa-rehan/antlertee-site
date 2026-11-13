import type { NextRequest } from "next/server";
import { leadReference } from "@/lib/leads/rules";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { serverError } from "@/server/http";
import { allLeadsForExport } from "@/server/leads";

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
    const leads = await allLeadsForExport();
    const header = ["reference", "created_at", "kind", "status", "name", "email", "whatsapp", "country", "brand", "message", "fields", "files", "source_path"];
    const lines = [header.map(cell).join(",")];
    for (const l of leads) {
      const fields = Object.entries(l.payload.fields ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
      lines.push(
        [leadReference(l.id), l.createdAt, l.kind, l.status, l.name, l.email, l.whatsapp, l.country, l.brand, l.message, fields, l.fileCount, l.sourcePath]
          .map(cell)
          .join(","),
      );
    }
    const date = new Date().toISOString().slice(0, 10);
    // BOM so Excel opens UTF-8 correctly.
    return new Response(`﻿${lines.join("\r\n")}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="antlertee-leads-${date}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return serverError("admin-leads-export", err);
  }
}
