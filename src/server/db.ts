// One tiny query function over two drivers with the same SQL:
// - production: Neon serverless Postgres over HTTP (DATABASE_URL)
// - development without DATABASE_URL: an embedded Postgres (PGlite, a devDependency) stored in .data/pglite,
//   migrated automatically on first use. It is imported dynamically and only outside production, so it never
//   enters the production bundle.
// Always pass values as parameters ($1, $2...). Never build SQL from input.
import fs from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { dbConfig, isProduction } from "./config";

export type Row = Record<string, unknown>;
type QueryFn = (text: string, params: readonly unknown[]) => Promise<Row[]>;

interface LocalDb {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Row[] }>;
  exec: (text: string) => Promise<unknown>;
}

// Survive dev hot reloads: one embedded database per process.
const globalForDb = globalThis as unknown as { __acsLocalDb?: Promise<LocalDb>; __acsNeon?: { url: string; fn: QueryFn } };

export const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

async function migrationFiles(): Promise<{ name: string; sql: string }[]> {
  const names = (await fs.readdir(MIGRATIONS_DIR)).filter((n) => /^\d+_[a-z0-9_]+\.sql$/.test(n)).sort();
  return Promise.all(names.map(async (name) => ({ name, sql: await fs.readFile(path.join(MIGRATIONS_DIR, name), "utf8") })));
}

async function openLocal(): Promise<LocalDb> {
  if (isProduction) throw new Error("The embedded development database is not available in production.");
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".data", "pglite");
  await fs.mkdir(dir, { recursive: true });
  const db = await PGlite.create(dir);
  await db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const applied = new Set((await db.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  for (const m of await migrationFiles()) {
    if (applied.has(m.name)) continue;
    await db.exec(m.sql);
    await db.query("INSERT INTO schema_migrations (name) VALUES ($1)", [m.name]);
  }
  return {
    query: async (text, params) => ({ rows: (await db.query<Row>(text, params)).rows }),
    exec: (text) => db.exec(text),
  };
}

function queryFn(): QueryFn {
  const cfg = dbConfig();
  if (cfg.kind === "neon") {
    if (globalForDb.__acsNeon?.url !== cfg.url) {
      const sql = neon(cfg.url);
      globalForDb.__acsNeon = { url: cfg.url, fn: async (text, params) => (await sql.query(text, [...params])) as Row[] };
    }
    return globalForDb.__acsNeon.fn;
  }
  return async (text, params) => {
    globalForDb.__acsLocalDb ??= openLocal().catch((err: unknown) => {
      globalForDb.__acsLocalDb = undefined;
      throw err;
    });
    const db = await globalForDb.__acsLocalDb;
    return (await db.query(text, [...params])).rows;
  };
}

export async function query<T extends Row = Row>(text: string, params: readonly unknown[] = []): Promise<T[]> {
  return (await queryFn()(text, params)) as T[];
}

/* ---------- small row helpers (rows are untyped at runtime) ---------- */

export function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export function num(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : Number.parseFloat(str(v));
  return Number.isFinite(n) ? n : 0;
}

export function iso(v: unknown): string {
  const d = v instanceof Date ? v : new Date(str(v));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function json(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}
