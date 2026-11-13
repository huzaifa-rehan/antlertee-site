// Environment configuration for the backend. Server-only (never import from a client component).
//
// Production (NODE_ENV=production, i.e. `next build` / `next start` / Vercel): every variable is required and a
// missing one throws a ConfigError with a clear message. There is no silent fallback.
// Development (`next dev`): missing variables fall back to the local embedded database, local file storage and
// the clearly-labelled dev credentials documented in .env.example.

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export const isProduction = process.env.NODE_ENV === "production";
/** True while `next build` prerenders pages. */
export const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/** Dev-only defaults. Also written in .env.example; never used when NODE_ENV=production. */
const DEV_ADMIN_PASSWORD = "antlertee-dev-only";
const DEV_SESSION_SECRET = "dev-only-session-secret-do-not-use-in-production";

const env = (name: string): string | undefined => {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
};

export type DbConfig = { kind: "neon"; url: string } | { kind: "local" };

export function dbConfig(): DbConfig {
  const url = env("DATABASE_URL");
  if (url) return { kind: "neon", url };
  if (isProduction) {
    throw new ConfigError("DATABASE_URL is not set. Connect a Neon Postgres database to the Vercel project (see docs/go-live.md).");
  }
  return { kind: "local" };
}

export type StorageConfig = { kind: "blob"; mediaToken: string; leadsToken: string } | { kind: "local" };

export function storageConfig(): StorageConfig {
  const mediaToken = env("BLOB_READ_WRITE_TOKEN");
  const leadsToken = env("LEADS_BLOB_READ_WRITE_TOKEN");
  if (mediaToken && leadsToken) return { kind: "blob", mediaToken, leadsToken };
  if (isProduction || mediaToken || leadsToken) {
    throw new ConfigError(
      "Vercel Blob is not fully configured. Set BLOB_READ_WRITE_TOKEN (public store for site media) and LEADS_BLOB_READ_WRITE_TOKEN (private store for customer files); see docs/go-live.md.",
    );
  }
  return { kind: "local" };
}

export interface AuthConfig {
  /** Key that signs sessions and CSRF tokens (changes when the password changes). */
  sessionSecret: string;
  password: { hash?: string; plain?: string };
  /** Stable string identifying the password config, mixed into the signing key. */
  passwordFingerprint: string;
  devDefaults: boolean;
}

export function authConfig(): AuthConfig {
  const hash = env("ADMIN_PASSWORD_HASH");
  const plain = env("ADMIN_PASSWORD");
  const secret = env("SESSION_SECRET");
  if (isProduction) {
    if (!hash && !plain) throw new ConfigError("ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD) is not set. The admin is disabled until it is.");
    if (!secret || secret.length < 32) throw new ConfigError("SESSION_SECRET must be set to a random string of at least 32 characters.");
    return { sessionSecret: secret, password: hash ? { hash } : { plain }, passwordFingerprint: hash ?? `plain:${plain}`, devDefaults: false };
  }
  const password = hash ? { hash } : { plain: plain ?? DEV_ADMIN_PASSWORD };
  return {
    sessionSecret: secret ?? DEV_SESSION_SECRET,
    password,
    passwordFingerprint: hash ?? `plain:${password.plain}`,
    devDefaults: !secret || (!hash && !plain),
  };
}

/** Secret used to salt IP hashes. Falls back to the session secret. */
export function ipSalt(): string {
  return env("IP_HASH_SALT") ?? authConfig().sessionSecret;
}
