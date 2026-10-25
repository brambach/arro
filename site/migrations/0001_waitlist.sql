-- site/migrations/0001_waitlist.sql
-- One row per email. Stores nothing else: no IP, no user agent, no referrer.
CREATE TABLE waitlist (
  email      TEXT PRIMARY KEY CHECK (length(email) BETWEEN 3 AND 254),
  wants_beta INTEGER NOT NULL DEFAULT 0 CHECK (wants_beta IN (0, 1)),
  source     TEXT NOT NULL CHECK (source IN ('hero', 'closing')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;
