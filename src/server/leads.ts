// Leads data access. Parameterised SQL only.
import type { LeadFileRef, LeadInput, LeadKind, LeadStatus } from "@/lib/leads/rules";
import { iso, json, num, query, str, type Row } from "./db";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface LeadPayload {
  fields?: Record<string, string>;
  techPack?: unknown;
  /** Plain-text tech pack summary composed on the server from the sanitised builder state. */
  summary?: string;
}

export interface Lead {
  id: string;
  createdAt: string;
  kind: LeadKind;
  status: LeadStatus;
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  brand: string;
  message: string;
  payload: LeadPayload;
  sourcePath: string;
  userAgent: string;
  fileCount: number;
}

export interface LeadFile {
  id: string;
  leadId: string;
  originalName: string;
  mime: string;
  size: number;
  storageKey: string;
  createdAt: string;
}

function toPayload(v: unknown): LeadPayload {
  const p = json(v);
  return typeof p === "object" && p !== null && !Array.isArray(p) ? (p as LeadPayload) : {};
}

function toLead(r: Row): Lead {
  return {
    id: str(r.id),
    createdAt: iso(r.created_at),
    kind: str(r.kind) === "techpack" ? "techpack" : "quote",
    status: (["new", "read", "done", "spam"].includes(str(r.status)) ? str(r.status) : "new") as LeadStatus,
    name: str(r.name),
    email: str(r.email),
    whatsapp: str(r.whatsapp),
    country: str(r.country),
    brand: str(r.brand),
    message: str(r.message),
    payload: toPayload(r.payload),
    sourcePath: str(r.source_path),
    userAgent: str(r.user_agent),
    fileCount: num(r.file_count),
  };
}

function toFile(r: Row): LeadFile {
  return {
    id: str(r.id),
    leadId: str(r.lead_id),
    originalName: str(r.original_name),
    mime: str(r.mime),
    size: num(r.size),
    storageKey: str(r.storage_key),
    createdAt: iso(r.created_at),
  };
}

/** Inserts the lead and its files in one statement, so either both are saved or neither. */
export async function createLead(
  input: LeadInput,
  payload: LeadPayload,
  files: LeadFileRef[],
  meta: { ipHash: string; userAgent: string },
): Promise<string> {
  const fileRows = files.map((f) => ({ original_name: f.name, mime: f.mime, size: f.size, storage_key: f.key }));
  const rows = await query<{ id: string }>(
    `WITH l AS (
       INSERT INTO leads (kind, name, email, whatsapp, country, brand, message, payload, source_path, ip_hash, user_agent)
       VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), $8::jsonb, NULLIF($9, ''), $10, NULLIF($11, ''))
       RETURNING id
     ), f AS (
       INSERT INTO lead_files (lead_id, original_name, mime, size, storage_key)
       SELECT l.id, x.original_name, x.mime, x.size, x.storage_key
       FROM l, jsonb_to_recordset($12::jsonb) AS x(original_name text, mime text, size bigint, storage_key text)
     )
     SELECT id FROM l`,
    [
      input.kind,
      input.name,
      input.email,
      input.whatsapp,
      input.country,
      input.brand,
      input.message,
      JSON.stringify(payload),
      input.sourcePath,
      meta.ipHash,
      meta.userAgent,
      JSON.stringify(fileRows),
    ],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("Lead insert returned no id.");
  return str(id);
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export interface LeadFilter {
  status?: LeadStatus;
  q?: string;
  limit?: number;
  offset?: number;
}

const LIST_COLUMNS = `l.*, (SELECT count(*) FROM lead_files f WHERE f.lead_id = l.id) AS file_count`;

export async function listLeads(filter: LeadFilter): Promise<{ leads: Lead[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    where.push(`l.status = $${params.length}`);
  }
  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    params.push(`%${escapeLike(q)}%`);
    const p = `$${params.length}`;
    where.push(`(l.name ILIKE ${p} OR l.email ILIKE ${p} OR l.brand ILIKE ${p} OR l.whatsapp ILIKE ${p})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countRows = await query(`SELECT count(*) AS n FROM leads l ${whereSql}`, params);
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const offset = Math.max(filter.offset ?? 0, 0);
  const rows = await query(
    `SELECT ${LIST_COLUMNS} FROM leads l ${whereSql} ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  return { leads: rows.map(toLead), total: num(countRows[0]?.n) };
}

export async function statusCounts(): Promise<Record<LeadStatus | "all", number>> {
  const rows = await query("SELECT status, count(*) AS n FROM leads GROUP BY status");
  const out: Record<LeadStatus | "all", number> = { all: 0, new: 0, read: 0, done: 0, spam: 0 };
  for (const r of rows) {
    const s = str(r.status) as LeadStatus;
    if (s in out) out[s] = num(r.n);
    out.all += num(r.n);
  }
  return out;
}

export async function getLead(id: string): Promise<{ lead: Lead; files: LeadFile[] } | null> {
  if (!UUID_RE.test(id)) return null;
  const rows = await query(`SELECT ${LIST_COLUMNS} FROM leads l WHERE l.id = $1`, [id]);
  const row = rows[0];
  if (!row) return null;
  const files = await query("SELECT * FROM lead_files WHERE lead_id = $1 ORDER BY created_at, original_name", [id]);
  return { lead: toLead(row), files: files.map(toFile) };
}

export async function getLeadFile(leadId: string, fileId: string): Promise<LeadFile | null> {
  if (!UUID_RE.test(leadId) || !UUID_RE.test(fileId)) return null;
  const rows = await query("SELECT * FROM lead_files WHERE id = $1 AND lead_id = $2", [fileId, leadId]);
  return rows[0] ? toFile(rows[0]) : null;
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  const rows = await query("UPDATE leads SET status = $2 WHERE id = $1 RETURNING id", [id, status]);
  return rows.length > 0;
}

/** Deletes the lead row (files cascade) and returns the storage keys so the caller can delete the files. */
export async function deleteLead(id: string): Promise<string[] | null> {
  if (!UUID_RE.test(id)) return null;
  const files = await query<{ storage_key: string }>("SELECT storage_key FROM lead_files WHERE lead_id = $1", [id]);
  const rows = await query("DELETE FROM leads WHERE id = $1 RETURNING id", [id]);
  if (!rows.length) return null;
  return files.map((f) => str(f.storage_key));
}

export async function allLeadsForExport(): Promise<Lead[]> {
  const rows = await query(`SELECT ${LIST_COLUMNS} FROM leads l ORDER BY l.created_at DESC LIMIT 10000`);
  return rows.map(toLead);
}
