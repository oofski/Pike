-- PIKE Rush — local SQLite schema (replaces Cloudflare D1).
-- Mirrors the Technical Design Document, with a few additions for the
-- desktop build: voting_sessions, api_keys, app_settings, and message batches.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 4.1 users -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK(role IN ('admin', 'rush_chair', 'brother')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4.2 events ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK(type IN ('bar_tab','date_party','pong_night','social','info_night','other')),
  location     TEXT,
  description  TEXT,
  start_time   TEXT NOT NULL,
  end_time     TEXT,
  created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4.3 pnms ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pnms (
  id              TEXT PRIMARY KEY,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  photo_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','invited','accepted','rejected')),
  internal_rating TEXT NOT NULL DEFAULT 'maybe'
                    CHECK(internal_rating IN ('yes','maybe','no')),
  notes           TEXT,
  source          TEXT NOT NULL DEFAULT 'manual'
                    CHECK(source IN ('manual','google_sheets','sign_in_form')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pnms_phone ON pnms(phone);

-- 4.4 pnm_notes -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pnm_notes (
  id          TEXT PRIMARY KEY,
  pnm_id      TEXT NOT NULL REFERENCES pnms(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_pnm ON pnm_notes(pnm_id);

-- 4.5 event_attendance ------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_attendance (
  id           TEXT PRIMARY KEY,
  pnm_id       TEXT NOT NULL REFERENCES pnms(id) ON DELETE CASCADE,
  event_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  signed_in_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pnm_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_pnm ON event_attendance(pnm_id);

-- 4.6 votes -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
  id         TEXT PRIMARY KEY,
  pnm_id     TEXT NOT NULL REFERENCES pnms(id) ON DELETE CASCADE,
  voter_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision   TEXT NOT NULL CHECK(decision IN ('yes','no','abstain')),
  voted_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pnm_id, voter_id)
);
CREATE INDEX IF NOT EXISTS idx_votes_pnm ON votes(pnm_id);

-- 4.7 messages --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id           TEXT PRIMARY KEY,
  batch_id     TEXT,
  pnm_id       TEXT REFERENCES pnms(id) ON DELETE SET NULL,
  phone        TEXT NOT NULL,
  body         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK(status IN ('pending','sent','failed')),
  created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_batch ON messages(batch_id);

-- 4.8 sign_in_sessions ------------------------------------------------------
CREATE TABLE IF NOT EXISTS sign_in_sessions (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  is_open     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_signin_event ON sign_in_sessions(event_id);

-- voting_sessions (current active PNM for the Bid Room, polled every 2s) -----
CREATE TABLE IF NOT EXISTS voting_sessions (
  id               TEXT PRIMARY KEY,
  is_active        INTEGER NOT NULL DEFAULT 1,
  current_pnm_id   TEXT REFERENCES pnms(id) ON DELETE SET NULL,
  pnm_order        TEXT NOT NULL DEFAULT '[]',
  results_revealed INTEGER NOT NULL DEFAULT 0,
  started_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- api_keys — for the local Mac iMessage bridge to authenticate ---------------
CREATE TABLE IF NOT EXISTS api_keys (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  key         TEXT UNIQUE NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  last_used   TEXT
);

-- app_settings — simple key/value store -------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
