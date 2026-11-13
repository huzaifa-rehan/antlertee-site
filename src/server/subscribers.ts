// Newsletter subscribers (table `subscribers`).
import { iso, num, query, str } from "./db";

export interface Subscriber {
  id: string;
  createdAt: string;
  email: string;
  status: "subscribed" | "unsubscribed";
  sourcePath: string;
}

/** Adds an address. Signing up twice is not an error and does not create a second row. */
export async function addSubscriber(email: string, meta: { sourcePath: string; ipHash: string }): Promise<void> {
  await query(
    `INSERT INTO subscribers (email, source_path, ip_hash)
     VALUES ($1, NULLIF($2, ''), $3)
     ON CONFLICT (lower(email)) DO NOTHING`,
    [email, meta.sourcePath, meta.ipHash],
  );
}

const toSubscriber = (r: Record<string, unknown>): Subscriber => ({
  id: str(r.id),
  createdAt: iso(r.created_at),
  email: str(r.email),
  status: str(r.status) === "unsubscribed" ? "unsubscribed" : "subscribed",
  sourcePath: str(r.source_path),
});

export async function listSubscribers(limit: number, offset: number): Promise<{ subscribers: Subscriber[]; total: number }> {
  const [rows, count] = await Promise.all([
    query("SELECT * FROM subscribers ORDER BY created_at DESC LIMIT $1 OFFSET $2", [limit, offset]),
    query("SELECT count(*) AS n FROM subscribers"),
  ]);
  return { subscribers: rows.map(toSubscriber), total: num(count[0]?.n) };
}

export async function allSubscribersForExport(): Promise<Subscriber[]> {
  return (await query("SELECT * FROM subscribers ORDER BY created_at DESC")).map(toSubscriber);
}
