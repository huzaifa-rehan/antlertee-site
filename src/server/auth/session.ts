// Admin session tokens, CSRF tokens and password checks with Node's crypto only (no auth dependency).
// Dependency-free so `npm test` can import it directly; keep it to erasable TypeScript.
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_TTL_SECONDS = 12 * 60 * 60;

export interface SessionPayload {
  /** Random session id; the CSRF token is derived from it. */
  sid: string;
  iat: number;
  exp: number;
}

const b64url = (buf: Buffer): string => buf.toString("base64url");

function hmac(key: string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `<base64url(json)>.<base64url(hmac)>` */
export function signSession(secret: string, nowSeconds: number, ttl = SESSION_TTL_SECONDS): { token: string; payload: SessionPayload } {
  const payload: SessionPayload = { sid: b64url(randomBytes(18)), iat: nowSeconds, exp: nowSeconds + ttl };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return { token: `${body}.${b64url(hmac(secret, `session.${body}`))}`, payload };
}

/** Returns the payload when the signature is valid and the token has not expired, otherwise null. */
export function verifySession(secret: string, token: string | undefined | null, nowSeconds: number): SessionPayload | null {
  if (!token || token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  const expected = hmac(secret, `session.${body}`);
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (!safeEqual(given, expected)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.sid !== "string" || typeof p.iat !== "number" || typeof p.exp !== "number") return null;
  if (p.exp <= nowSeconds || p.iat > nowSeconds + 60) return null;
  return { sid: p.sid, iat: p.iat, exp: p.exp };
}

/** CSRF token bound to the session: sent by admin pages in the `x-csrf-token` header on every change. */
export function csrfToken(secret: string, sid: string): string {
  return b64url(hmac(secret, `csrf.${sid}`));
}

export function verifyCsrf(secret: string, sid: string, given: string | null | undefined): boolean {
  if (!given || given.length > 128) return false;
  return safeEqual(Buffer.from(given), Buffer.from(csrfToken(secret, sid)));
}

/* ---------- passwords ---------- */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };

/** `scrypt:N:r:p:<salt b64url>:<hash b64url>`, produced by `npm run admin:hash`. */
export function hashPassword(password: string, salt: Buffer = randomBytes(16)): string {
  const hash = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, b64url(salt), b64url(hash)].join(":");
}

export function isPasswordHash(v: string): boolean {
  return /^scrypt:\d+:\d+:\d+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(v);
}

/** Constant-time check against a scrypt hash (preferred) or a plain password from the environment. */
export function checkPassword(given: string, config: { hash?: string; plain?: string }): boolean {
  if (given.length === 0 || given.length > 256) return false;
  if (config.hash) {
    if (!isPasswordHash(config.hash)) return false;
    const [, n, r, p, salt, hash] = config.hash.split(":") as [string, string, string, string, string, string];
    const expected = Buffer.from(hash, "base64url");
    const N = Number(n);
    if (!Number.isInteger(N) || N < 1024 || N > 1 << 20) return false;
    const actual = scryptSync(given, Buffer.from(salt, "base64url"), expected.length, { N, r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 });
    return safeEqual(actual, expected);
  }
  if (config.plain) {
    // Hash both sides first so the comparison does not leak the length.
    const a = createHash("sha256").update(given).digest();
    const b = createHash("sha256").update(config.plain).digest();
    return safeEqual(a, b);
  }
  return false;
}

/**
 * The key that signs sessions: SESSION_SECRET mixed with the password config, so changing the password
 * logs out every existing session.
 */
export function signingKey(sessionSecret: string, passwordConfig: string): string {
  return createHash("sha256").update(`${sessionSecret}\u0000${passwordConfig}`).digest("base64url");
}

/** Salted hash of a client IP for rate limiting and the inbox: the raw IP is never stored. */
export function hashIp(secret: string, ip: string): string {
  return b64url(hmac(secret, `ip.${ip}`)).slice(0, 32);
}
