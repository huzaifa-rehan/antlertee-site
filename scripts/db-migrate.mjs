// Applies db/migrations/*.sql in order, once each (tracked in schema_migrations). Idempotent.
//
//   npm run db:migrate            uses DATABASE_URL (Neon) from the environment or .env.local
//                                 without DATABASE_URL: the local embedded database in .data/pglite
//                                 (stop `next dev` first: only one process can open it at a time)
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "db", "migrations");
const files = (await fs.readdir(dir)).filter((n) => /^\d+_[a-z0-9_]+\.sql$/.test(n)).sort();
const url = process.env.DATABASE_URL?.trim();

const TRACK = "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())";

async function run() {
  if (url) {
    const { Pool } = await import("@neondatabase/serverless");
    const pool = new Pool({ connectionString: url });
    const client = await pool.connect();
    try {
      await client.query(TRACK);
      const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
      for (const name of files) {
        if (done.has(name)) {
          console.log(`skip    ${name}`);
          continue;
        }
        const sql = await fs.readFile(path.join(dir, name), "utf8");
        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
          await client.query("COMMIT");
          console.log(`applied ${name}`);
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        }
      }
    } finally {
      client.release();
      await pool.end();
    }
    return "Neon (DATABASE_URL)";
  }

  if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is not set.");
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = path.join(root, ".data", "pglite");
  await fs.mkdir(dataDir, { recursive: true });
  const db = await PGlite.create(dataDir);
  try {
    await db.exec(TRACK);
    const done = new Set((await db.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
    for (const name of files) {
      if (done.has(name)) {
        console.log(`skip    ${name}`);
        continue;
      }
      await db.transaction(async (tx) => {
        await tx.exec(await fs.readFile(path.join(dir, name), "utf8"));
        await tx.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
      });
      console.log(`applied ${name}`);
    }
  } finally {
    await db.close();
  }
  return "local embedded database (.data/pglite)";
}

try {
  const target = await run();
  console.log(`Migrations up to date on the ${target}.`);
} catch (err) {
  // The message only: connection strings are never printed.
  console.error(`Migration failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
