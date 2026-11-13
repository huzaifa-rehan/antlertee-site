-- Leads inbox, uploaded lead files, site image overrides, media library and rate-limit events.
-- Idempotent: safe to run more than once. Applied by `npm run db:migrate` (and automatically by the
-- local embedded database in development).

CREATE TABLE IF NOT EXISTS leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  kind        text NOT NULL CHECK (kind IN ('quote', 'techpack')),
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'done', 'spam')),
  name        text NOT NULL,
  email       text,
  whatsapp    text,
  country     text,
  brand       text,
  message     text,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_path text,
  ip_hash     text,
  user_agent  text
);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);

CREATE TABLE IF NOT EXISTS lead_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  original_name text NOT NULL,
  mime          text NOT NULL,
  size          bigint NOT NULL,
  storage_key   text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_files_lead_id_idx ON lead_files (lead_id);

-- One row per replaced site image slot (slot_id = an ImageId from src/content/image-manifest.json).
-- `variants` lists every generated file: [{ "width": 360, "format": "avif", "url": "...", "key": "..." }, ...].
CREATE TABLE IF NOT EXISTS media_overrides (
  slot_id    text PRIMARY KEY,
  url        text NOT NULL,
  width      integer NOT NULL,
  height     integer NOT NULL,
  alt        text,
  mime       text NOT NULL,
  variants   jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_library (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url         text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  name        text NOT NULL,
  mime        text NOT NULL,
  size        bigint NOT NULL,
  width       integer,
  height      integer,
  kind        text NOT NULL CHECK (kind IN ('image', 'video')),
  alt         text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_library_created_at_idx ON media_library (created_at DESC);

-- Sliding-window rate limiting (lead posts, upload tokens, admin logins). Keys are salted hashes, never raw IPs.
CREATE TABLE IF NOT EXISTS rate_events (
  id         bigserial PRIMARY KEY,
  bucket     text NOT NULL,
  key        text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_events_lookup_idx ON rate_events (bucket, key, created_at);
