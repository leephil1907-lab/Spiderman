// Admin control panel API.
// Access model (defence in depth):
//   1. The account's email must be listed in ADMIN_EMAILS (server-side env only).
//   2. The panel lives at a secret path, ADMIN_PATH (server-side env only, never in the JS bundle).
//      The browser asks /api/admin/route whether the current URL is the panel — only for admins.
//   3. The admin must re-enter their password to "unlock" an admin session (30 min, per device).
//   4. Every admin endpoint answers 404 to anyone else, so the panel's existence isn't revealed.
//   5. Every admin action is written to the audit log.
import crypto from 'node:crypto'
import { db } from './db.js'
import { isAdmin, verifyPassword, hashPassword, publicUser } from './auth.js'
import { getSettings, saveSettings } from './settings.js'
import { send } from './mailer.js'
import { TIERS, tierById } from '../shared/tiers.js'

const UNLOCK_MS = 30 * 60 * 1000
const failedUnlocks = new Map()
const notFound = (res) => res.status(404).json({ error: 'Not found.' })
const clean = (s, max) => String(s ?? '').trim().slice(0, max)

export function adminPath() {
  let p = (process.env.ADMIN_PATH || '').trim()
  if (!p) {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_path'").get()
    p = row?.value || '/hq-' + crypto.randomBytes(6).toString('hex')
    if (!row) db.prepare("INSERT INTO settings (key, value) VALUES ('admin_path', ?)").run(p)
  }
  return p.startsWith('/') ? p : '/' + p
}

/** Create the admin account(s) on first start so nobody else can register that email. */
export async function bootstrapAdmins() {
  const emails = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  for (const email of emails) {
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) continue
    const pw = process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(9).toString('base64url')
    const memberNo = 'BND-000001-AD'
    const no = db.prepare('SELECT 1 FROM users WHERE member_no = ?').get(memberNo) ? 'BND-' + crypto.randomInt(100000, 999999) + '-AD' : memberNo
    db.prepare("INSERT INTO users (email, name, password_hash, member_no, tier, currency, tier_since) VALUES (?,?,?,?, 'multiverse', 'USD', datetime('now'))")
      .run(email, 'Club Admin', await hashPassword(pw), no)
    console.log(`\n🔐 Admin account created for the address in ADMIN_EMAILS.${process.env.ADMIN_INITIAL_PASSWORD ? ' Password = ADMIN_INITIAL_PASSWORD.' : ` Temporary password: ${pw}`}\n   Change it after first login (Account → Change password).\n`)
  }
}

export function mountAdmin(app) {
  const audit = (req, action, detail) => db.prepare('INSERT INTO audit_log (admin_id, action, detail, ip) VALUES (?,?,?,?)')
    .run(req.user?.id ?? null, action, detail ? String(detail).slice(0, 500) : null, req.ip)
  const isAdminUser = (req, res, next) => (isAdmin(req.user) ? next() : notFound(res))
  const unlocked = (req, res, next) => {
    if (!isAdmin(req.user)) return notFound(res)
    if (!req.user.admin_until || req.user.admin_until < Date.now()) return res.status(423).json({ error: 'Admin session locked. Re-enter your password.', locked: true })
    // sliding window: activity keeps the unlock alive
    db.prepare('UPDATE sessions SET admin_until = ? WHERE token_hash = ?').run(Date.now() + UNLOCK_MS, req.user.session_hash)
    next()
  }
  app.locals.adminUnlocked = unlocked

  // is this URL the control panel? (only answered for admins)
  app.post('/api/admin/route', isAdminUser, (req, res) => {
    const p = String(req.body.path || '').replace(/\/+$/, '')
    const ok = p === adminPath().replace(/\/+$/, '')
    res.json({ ok, unlocked: ok && req.user.admin_until > Date.now() })
  })
  app.post('/api/admin/unlock', isAdminUser, async (req, res) => {
    // only failed attempts count: 5 wrong passwords → locked out for 15 minutes
    const now = Date.now(), recent = (failedUnlocks.get(req.user.id) || []).filter((t) => now - t < 15 * 60 * 1000)
    if (recent.length >= 5) return res.status(429).json({ error: 'Too many wrong attempts. Wait 15 minutes.' })
    if (!(await verifyPassword(String(req.body.password ?? ''), req.user.password_hash))) {
      failedUnlocks.set(req.user.id, [...recent, now])
      audit(req, 'unlock.failed')
      return res.status(401).json({ error: 'Password is incorrect.', field: 'password' })
    }
    db.prepare('UPDATE sessions SET admin_until = ? WHERE token_hash = ?').run(Date.now() + UNLOCK_MS, req.user.session_hash)
    audit(req, 'unlock')
    res.json({ ok: true, minutes: UNLOCK_MS / 60000 })
  })
  app.post('/api/admin/lock', isAdminUser, (req, res) => {
    db.prepare('UPDATE sessions SET admin_until = NULL WHERE token_hash = ?').run(req.user.session_hash)
    audit(req, 'lock')
    res.json({ ok: true })
  })

  // ── overview ──
  app.get('/api/admin/overview', unlocked, (req, res) => {
    const one = (sql, ...a) => db.prepare(sql).get(...a)
    const byTier = Object.fromEntries(TIERS.map((t) => [t.id, 0]))
    for (const r of db.prepare('SELECT tier, COUNT(*) n FROM users GROUP BY tier').all()) byTier[r.tier] = r.n
    res.json({
      members: one('SELECT COUNT(*) n FROM users').n,
      signups7d: one("SELECT COUNT(*) n FROM users WHERE created_at >= datetime('now', '-7 days')").n,
      byTier,
      revenue: one("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = 'success'").s,
      revenue30d: one("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = 'success' AND created_at >= datetime('now', '-30 days')").s,
      simulatedPayments: one("SELECT COUNT(*) n FROM payments WHERE provider LIKE '%simulated'").n,
      openTickets: one("SELECT COUNT(*) n FROM tickets WHERE status = 'open'").n,
      waitingChats: one("SELECT COUNT(*) n FROM support_threads WHERE status = 'human'").n,
      theories: one('SELECT COUNT(*) n FROM theories').n,
      upcomingEvents: db.prepare('SELECT starts_at FROM events').all().filter((e) => new Date(e.starts_at) > new Date()).length,
      recentMembers: db.prepare('SELECT id, name, email, tier, country, created_at FROM users ORDER BY id DESC LIMIT 6').all(),
      recentPayments: db.prepare('SELECT p.amount, p.interval, p.tier, p.provider, p.created_at, u.name FROM payments p JOIN users u ON u.id = p.user_id ORDER BY p.id DESC LIMIT 6').all(),
    })
  })

  // ── members ──
  app.get('/api/admin/members', unlocked, (req, res) => {
    const q = `%${clean(req.query.q, 100)}%`
    const tier = TIERS.some((t) => t.id === req.query.tier) ? req.query.tier : null
    const page = Math.max(0, +req.query.page || 0)
    const where = `WHERE (name LIKE @q OR email LIKE @q OR member_no LIKE @q)${tier ? ' AND tier = @tier' : ''}`
    const rows = db.prepare(`SELECT id, name, email, tier, billing_interval, renews_at, country, member_no, disabled, created_at FROM users ${where} ORDER BY id DESC LIMIT 25 OFFSET @off`)
      .all({ q, tier, off: page * 25 }).map((u) => ({ ...u, isAdmin: isAdmin(u) }))
    res.json({ members: rows, total: db.prepare(`SELECT COUNT(*) n FROM users ${where}`).get({ q, tier }).n })
  })
  app.patch('/api/admin/members/:id', unlocked, (req, res) => {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(+req.params.id)
    if (!u) return res.status(404).json({ error: 'Member not found.' })
    if (req.body.tier !== undefined) {
      const t = TIERS.find((x) => x.id === req.body.tier)
      if (!t) return res.status(400).json({ error: 'Unknown tier.' })
      db.prepare(`UPDATE users SET tier = ?, billing_interval = ?, renews_at = ${t.rank ? "COALESCE(renews_at, datetime('now', '+1 month'))" : 'NULL'}, tier_since = datetime('now') WHERE id = ?`)
        .run(t.id, t.rank ? (u.billing_interval || 'month') : null, u.id)
      audit(req, 'member.tier', `${u.member_no} → ${t.id}`)
    }
    if (req.body.disabled !== undefined) {
      if (isAdmin(u)) return res.status(400).json({ error: 'You can’t suspend an admin account.' })
      db.prepare('UPDATE users SET disabled = ? WHERE id = ?').run(req.body.disabled ? 1 : 0, u.id)
      if (req.body.disabled) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id)
      audit(req, req.body.disabled ? 'member.suspend' : 'member.restore', u.member_no)
    }
    res.json({ ok: true })
  })
  app.delete('/api/admin/members/:id', unlocked, (req, res) => {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(+req.params.id)
    if (!u) return res.status(404).json({ error: 'Member not found.' })
    if (isAdmin(u)) return res.status(400).json({ error: 'You can’t delete an admin account here.' })
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id)
    audit(req, 'member.delete', u.member_no)
    res.json({ ok: true })
  })

  // ── events ──
  const eventBody = (b) => {
    const e = {
      title: clean(b.title, 120), city: clean(b.city, 60), venue: clean(b.venue, 120), tz: clean(b.tz, 60) || 'UTC',
      starts_at: clean(b.starts_at, 40), capacity: Math.max(1, Math.min(100000, +b.capacity | 0)), min_tier: TIERS.some((t) => t.id === b.min_tier) ? b.min_tier : 'webslinger',
    }
    try { new Intl.DateTimeFormat('en', { timeZone: e.tz }) } catch { return { error: 'Unknown time zone (use e.g. Africa/Lagos, Europe/London).' } }
    if (e.title.length < 3 || !e.city || !e.venue) return { error: 'Title, city and venue are required.' }
    if (Number.isNaN(Date.parse(e.starts_at))) return { error: 'Start time is invalid.' }
    return { e }
  }
  app.get('/api/admin/events', unlocked, (req, res) => {
    res.json({ events: db.prepare('SELECT e.*, (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id) going FROM events e ORDER BY starts_at').all() })
  })
  app.post('/api/admin/events', unlocked, (req, res) => {
    const { e, error } = eventBody(req.body)
    if (error) return res.status(400).json({ error })
    const info = db.prepare('INSERT INTO events (title, city, venue, starts_at, tz, capacity, min_tier) VALUES (@title,@city,@venue,@starts_at,@tz,@capacity,@min_tier)').run(e)
    audit(req, 'event.create', `${e.title} · ${e.city}`)
    res.status(201).json({ id: info.lastInsertRowid })
  })
  app.put('/api/admin/events/:id', unlocked, (req, res) => {
    const { e, error } = eventBody(req.body)
    if (error) return res.status(400).json({ error })
    const r = db.prepare('UPDATE events SET title=@title, city=@city, venue=@venue, starts_at=@starts_at, tz=@tz, capacity=@capacity, min_tier=@min_tier WHERE id=@id').run({ ...e, id: +req.params.id })
    if (!r.changes) return res.status(404).json({ error: 'Event not found.' })
    audit(req, 'event.update', `${e.title} · ${e.city}`)
    res.json({ ok: true })
  })
  app.delete('/api/admin/events/:id', unlocked, (req, res) => {
    const e = db.prepare('SELECT * FROM events WHERE id = ?').get(+req.params.id)
    if (!e) return res.status(404).json({ error: 'Event not found.' })
    db.prepare('DELETE FROM events WHERE id = ?').run(e.id)
    audit(req, 'event.delete', `${e.title} · ${e.city}`)
    res.json({ ok: true })
  })

  // ── community moderation ──
  app.get('/api/admin/theories', unlocked, (req, res) => {
    res.json({ theories: db.prepare(`SELECT t.id, t.title, t.body, t.spoiler, t.created_at, u.name author, u.member_no,
      (SELECT COUNT(*) FROM theory_likes l WHERE l.theory_id = t.id) likes FROM theories t JOIN users u ON u.id = t.user_id ORDER BY t.id DESC LIMIT 100`).all() })
  })
  app.delete('/api/admin/theories/:id', unlocked, (req, res) => {
    const t = db.prepare('SELECT title FROM theories WHERE id = ?').get(+req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found.' })
    db.prepare('DELETE FROM theories WHERE id = ?').run(+req.params.id)
    audit(req, 'theory.delete', t.title)
    res.json({ ok: true })
  })

  // ── settings ──
  app.get('/api/admin/settings', unlocked, (req, res) => res.json({ settings: getSettings() }))
  app.put('/api/admin/settings', unlocked, (req, res) => {
    const before = getSettings()
    const next = saveSettings(req.body.settings || {})
    const changed = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(before[k]))
    audit(req, 'settings.update', changed.join(', ') || 'no changes')
    res.json({ settings: next })
  })

  // ── tickets (email enquiries) ──
  app.get('/api/admin/tickets', unlocked, (req, res) => {
    const status = ['open', 'answered', 'closed'].includes(req.query.status) ? req.query.status : 'open'
    const rows = db.prepare(`SELECT t.id, t.ref, t.name, t.email, t.category, t.subject, t.status, t.updated_at, u.tier, u.member_no,
        (SELECT body FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.id DESC LIMIT 1) last,
        (SELECT sender FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.id DESC LIMIT 1) last_sender
      FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE t.status = ? ORDER BY (u.tier = 'multiverse') DESC, t.updated_at DESC LIMIT 200`).all(status)
    const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM tickets GROUP BY status').all().map((r) => [r.status, r.n]))
    res.json({ tickets: rows, counts })
  })
  app.get('/api/admin/tickets/:id', unlocked, (req, res) => {
    const t = db.prepare('SELECT t.*, u.tier, u.member_no FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ?').get(+req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found.' })
    delete t.access_hash
    res.json({ ticket: t, messages: db.prepare('SELECT id, sender, body, created_at FROM ticket_messages WHERE ticket_id = ? ORDER BY id').all(t.id) })
  })
  app.post('/api/admin/tickets/:id/reply', unlocked, async (req, res) => {
    const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(+req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found.' })
    const body = clean(req.body.body, 5000)
    if (!body) return res.status(400).json({ error: 'Write a reply first.' })
    db.prepare("INSERT INTO ticket_messages (ticket_id, sender, body) VALUES (?, 'admin', ?)").run(t.id, body)
    const status = req.body.close ? 'closed' : 'answered'
    db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, t.id)
    audit(req, 'ticket.reply', t.ref)
    const S = getSettings()
    const origin = `${req.protocol}://${req.get('host')}`
    await send({
      to: t.email, replyTo: S.support.supportEmail,
      subject: `Re: ${t.subject} [${t.ref}]`,
      text: `Hi ${t.name},\n\n${body}\n\n— ${S.support.agentName}\n\n${t.user_id ? `View or reply to this ticket: ${origin}/tickets` : 'To reply, use the ticket link in your confirmation email.'}\n(Reference ${t.ref})`,
    })
    res.json({ ok: true, status })
  })
  app.post('/api/admin/tickets/:id/status', unlocked, (req, res) => {
    const status = ['open', 'answered', 'closed'].includes(req.body.status) ? req.body.status : null
    if (!status) return res.status(400).json({ error: 'Bad status.' })
    const t = db.prepare('SELECT ref FROM tickets WHERE id = ?').get(+req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found.' })
    db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, +req.params.id)
    audit(req, 'ticket.status', `${t.ref} → ${status}`)
    res.json({ ok: true })
  })

  // ── audit ──
  app.get('/api/admin/audit', unlocked, (req, res) => {
    res.json({ log: db.prepare('SELECT a.action, a.detail, a.ip, a.created_at, u.name FROM audit_log a LEFT JOIN users u ON u.id = a.admin_id ORDER BY a.id DESC LIMIT 200').all() })
  })
  app.get('/api/admin/me', unlocked, (req, res) => res.json({ user: publicUser(req.user), unlockedUntil: req.user.admin_until, tiers: TIERS.map((t) => ({ id: t.id, name: tierById(t.id).name })) }))
}
