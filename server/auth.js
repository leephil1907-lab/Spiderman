import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { db } from './db.js'

const scrypt = promisify(crypto.scrypt)
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
export const SESSION_COOKIE = 'bnd_sid'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
export const RESET_TTL_MS = 1000 * 60 * 30 // 30 minutes

// ── passwords: scrypt + per-user salt, constant-time compare ────────────────
export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(pw, salt, 64, SCRYPT)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}
export async function verifyPassword(pw, stored) {
  const [alg, saltB64, keyB64] = String(stored).split('$')
  if (alg !== 'scrypt') return false
  const key = Buffer.from(keyB64, 'base64')
  const got = await scrypt(pw, Buffer.from(saltB64, 'base64'), key.length, SCRYPT)
  return crypto.timingSafeEqual(key, got)
}
// used when the email doesn't exist, so response timing doesn't leak accounts
const DUMMY_HASH = await hashPassword(crypto.randomBytes(12).toString('hex'))
export const burnTime = (pw) => verifyPassword(pw, DUMMY_HASH)

// ── opaque tokens: only the SHA-256 is stored, never the token itself ───────
export const newToken = () => crypto.randomBytes(32).toString('base64url')
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

export function createSession(userId) {
  const token = newToken()
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)')
    .run(sha256(token), userId, Date.now() + SESSION_TTL_MS)
  return token
}
export function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
}
export function destroyAllSessions(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}
export function userFromSession(token) {
  if (!token) return null
  const row = db.prepare(`
    SELECT u.* , s.expires_at, s.admin_until, s.token_hash session_hash FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?`).get(sha256(token))
  if (!row || row.disabled) return null
  if (row.expires_at < Date.now()) { destroySession(token); return null }
  return row
}

export function createReset(userId) {
  const token = newToken()
  // one live link at a time: issuing a new one kills older ones
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId)
  db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?,?,?)')
    .run(sha256(token), userId, Date.now() + RESET_TTL_MS)
  return token
}
export function findReset(token) {
  if (!token) return null
  const r = db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(sha256(token))
  if (!r || r.used_at || r.expires_at < Date.now()) return null
  return r
}

// ── tiny fixed-window rate limiter (per key), in memory ─────────────────────
const buckets = new Map()
export function rateLimit(key, max, windowMs) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return true }
  b.n++
  return b.n <= max
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k) }, 60_000).unref()

export const publicUser = (u) => u && ({
  id: u.id, email: u.email, name: u.name, tier: u.tier, tierSince: u.tier_since,
  country: u.country, currency: 'USD', billingInterval: u.billing_interval || null, renewsAt: u.renews_at || null,
  isAdmin: isAdmin(u),
  memberNo: u.member_no, createdAt: u.created_at,
})

/** Admins (support inbox) = emails listed in ADMIN_EMAILS (comma-separated, env or .env). */
export const isAdmin = (u) => !!u && (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean).includes(String(u.email).toLowerCase())
