-- Newsletter sign-ups from the website footer. One row per email address (case-insensitive).
CREATE TABLE IF NOT EXISTS subscribers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  email       text NOT NULL,
  status      text NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  source_path text,
  ip_hash     text
);
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_key ON subscribers (lower(email));
CREATE INDEX IF NOT EXISTS subscribers_created_at_idx ON subscribers (created_at DESC);
