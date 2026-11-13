// Rate limits stored in Postgres (works across serverless instances). Keys are salted IP hashes.
import { query } from "./db";
import { decideRate, RATE_RULES, type RateBucket, type RateDecision } from "./ratelimit-core";

async function recentTimes(bucket: RateBucket, key: string, now: number): Promise<number[]> {
  const since = new Date(now - RATE_RULES[bucket].windowMs).toISOString();
  const rows = await query<{ created_at: unknown }>(
    "SELECT created_at FROM rate_events WHERE bucket = $1 AND key = $2 AND created_at > $3 ORDER BY created_at DESC LIMIT 200",
    [bucket, key, since],
  );
  return rows.map((r) => new Date(r.created_at instanceof Date ? r.created_at : String(r.created_at)).getTime());
}

export async function recordRate(bucket: RateBucket, key: string, now = Date.now()): Promise<void> {
  await query("INSERT INTO rate_events (bucket, key, created_at) VALUES ($1, $2, $3)", [bucket, key, new Date(now).toISOString()]);
  // Occasional housekeeping: nothing needs events older than a day.
  if (Math.random() < 0.02) await query("DELETE FROM rate_events WHERE created_at < $1", [new Date(now - 86_400_000).toISOString()]);
}

/** Checks without recording (e.g. logins: only failures count). */
export async function checkRate(bucket: RateBucket, key: string, now = Date.now()): Promise<RateDecision> {
  return decideRate(await recentTimes(bucket, key, now), now, RATE_RULES[bucket]);
}

/** Checks and, when allowed, records this event. */
export async function hitRate(bucket: RateBucket, key: string, now = Date.now()): Promise<RateDecision> {
  const decision = await checkRate(bucket, key, now);
  if (decision.allowed) await recordRate(bucket, key, now);
  return decision;
}
