import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = process.env.DATA_DIR || path.resolve('data')
fs.mkdirSync(DATA_DIR, { recursive: true })
export const db = new Database(path.join(DATA_DIR, 'club.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  tier          TEXT NOT NULL DEFAULT 'free',
  country       TEXT,
  currency      TEXT NOT NULL DEFAULT 'USD',
  tier_since    TEXT,
  member_no     TEXT NOT NULL UNIQUE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER
);
CREATE TABLE IF NOT EXISTS payments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier       TEXT NOT NULL,
  amount     REAL NOT NULL,
  currency   TEXT NOT NULL,
  provider   TEXT NOT NULL,
  reference  TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS theories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  spoiler    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS theory_likes (
  theory_id INTEGER NOT NULL REFERENCES theories(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (theory_id, user_id)
);
CREATE TABLE IF NOT EXISTS quiz_scores (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  best       INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  city      TEXT NOT NULL,
  venue     TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  tz        TEXT NOT NULL DEFAULT 'UTC',
  capacity  INTEGER NOT NULL,
  min_tier  TEXT NOT NULL DEFAULT 'webslinger'
);
CREATE TABLE IF NOT EXISTS rsvps (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);
CREATE TABLE IF NOT EXISTS support_threads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  guest_hash  TEXT,
  email       TEXT,
  name        TEXT,
  status      TEXT NOT NULL DEFAULT 'bot',      -- bot | human | closed
  priority    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS support_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id  INTEGER NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  sender     TEXT NOT NULL,                     -- user | bot | agent | system
  body       TEXT NOT NULL,
  meta       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tickets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ref         TEXT NOT NULL UNIQUE,
  access_hash TEXT NOT NULL,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  category    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',     -- open | answered | closed
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS ticket_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender     TEXT NOT NULL,                     -- user | admin
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER,
  action     TEXT NOT NULL,
  detail     TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs ON ticket_messages(ticket_id, id);
CREATE INDEX IF NOT EXISTS idx_support_user ON support_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_support_guest ON support_threads(guest_hash);
CREATE INDEX IF NOT EXISTS idx_support_msgs ON support_messages(thread_id, id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);
`)

// light migrations for databases created by earlier versions
const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name)
if (!cols('users').includes('country')) db.exec('ALTER TABLE users ADD COLUMN country TEXT')
if (!cols('users').includes('currency')) db.exec("ALTER TABLE users ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'")
if (!cols('users').includes('disabled')) db.exec('ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0')
if (!cols('sessions').includes('admin_until')) db.exec('ALTER TABLE sessions ADD COLUMN admin_until INTEGER')
if (!cols('users').includes('billing_interval')) db.exec('ALTER TABLE users ADD COLUMN billing_interval TEXT')
if (!cols('users').includes('renews_at')) db.exec('ALTER TABLE users ADD COLUMN renews_at TEXT')
if (!cols('payments').includes('interval')) db.exec("ALTER TABLE payments ADD COLUMN interval TEXT NOT NULL DEFAULT 'month'")
if (!cols('rsvps').includes('created_at')) db.exec('ALTER TABLE rsvps ADD COLUMN created_at TEXT')
db.exec("UPDATE users SET currency = 'USD' WHERE currency <> 'USD'") // pricing is USD-only now
if (!cols('events').includes('tz')) db.exec("ALTER TABLE events ADD COLUMN tz TEXT NOT NULL DEFAULT 'UTC'")
if (cols('payments').includes('amount_ngn')) {
  db.exec("ALTER TABLE payments ADD COLUMN amount REAL NOT NULL DEFAULT 0; ALTER TABLE payments ADD COLUMN currency TEXT NOT NULL DEFAULT 'NGN'; UPDATE payments SET amount = amount_ngn")
}

// Never ship placeholder events. Remove TBC rows created by older builds while preserving
// real events created through the admin panel.
db.prepare("DELETE FROM events WHERE venue LIKE 'Venue TBC%'").run()
