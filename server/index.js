import './env.js'
import express from 'express'
import cookieParser from 'cookie-parser'
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import { db } from './db.js'
import {
  SESSION_COOKIE, SESSION_TTL_MS, hashPassword, verifyPassword, burnTime, createSession,
  destroySession, destroyAllSessions, userFromSession, createReset, findReset, rateLimit, publicUser, isAdmin,
} from './auth.js'
import { send, MAIL_MODE } from './mailer.js'
import { getSettings, publicSettings } from './settings.js'
import { mountAdmin, bootstrapAdmins, adminPath } from './admin.js'
import { PROVIDER, SIMULATED, PROVIDER_SUMMARY, newReference, charge } from './payments.js'
import { TIERS, tierById, hasTier, priceOf, isInterval } from '../shared/tiers.js'
import { mountSupport } from './support.js'
import { isCountry } from '../shared/countries.js'

const PORT = +process.env.PORT || 3001
const DEMO = process.env.DEMO_MODE !== '0' // on by default until email is wired
const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || readEnvFile().VITE_SITE_URL || '').replace(/\/$/, '')
function readEnvFile() {
  try { return Object.fromEntries(fs.readFileSync(path.resolve('.env'), 'utf8').split('\n').filter((l) => /^\w+=/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()])) } catch { return {} }
}
const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(express.json({ limit: '20kb' }))
app.use(cookieParser())

// DEBUG=1 → log every API request with status + timing (handy when debugging deploys)
if (process.env.DEBUG) {
  app.use('/api', (req, res, next) => {
    const t0 = Date.now()
    res.on('finish', () => console.log(`[api] ${req.method} ${req.originalUrl} → ${res.statusCode} ${Date.now() - t0}ms`))
    next()
  })
}

// basic hardening headers (no CSP framing block — the preview embeds the site)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')
  next()
})

// CSRF: SameSite=Lax cookie + every state-changing API call must be JSON with
// our custom header — a cross-site form post can do neither.
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.get('x-bnd') !== '1') return res.status(403).json({ error: 'Bad request origin.' })
  next()
})

const setSessionCookie = (req, res, token) => res.cookie(SESSION_COOKIE, token, {
  httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: SESSION_TTL_MS, path: '/',
})
const clearSessionCookie = (res) => res.clearCookie(SESSION_COOKIE, { path: '/' })

app.use('/api', (req, res, next) => { req.user = userFromSession(req.cookies[SESSION_COOKIE]); next() })

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()), payments: PROVIDER_SUMMARY, mail: MAIL_MODE }))
app.get('/api/settings', (req, res) => res.set('Cache-Control', 'no-store').json({ settings: publicSettings() }))
const requireUser = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Please log in.' }))
const requireTier = (tier) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Please log in.' })
  if (!hasTier(req.user.tier, tier)) return res.status(403).json({ error: `This needs ${tierById(tier).name} membership.`, needs: tier })
  next()
}

// ── validation ──────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const clean = (s, max) => String(s ?? '').trim().slice(0, max)
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters.'
  if (pw.length > 200) return 'Password is too long.'
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use at least one letter and one number.'
  return null
}
const newMemberNo = () => 'BND-' + crypto.randomInt(100000, 999999) + '-' + crypto.randomBytes(1).toString('hex').toUpperCase()

// ── auth ────────────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  if (!rateLimit('signup:' + req.ip, 10, 60 * 60 * 1000)) return res.status(429).json({ error: 'Too many sign-ups from this network. Try again later.' })
  const name = clean(req.body.name, 60)
  const email = clean(req.body.email, 200).toLowerCase()
  const { password } = req.body
  const country = isCountry(req.body.country) ? String(req.body.country).toUpperCase() : null
  const S = getSettings()
  if (S.site.maintenance || !S.site.signupsOpen) return res.status(503).json({ error: 'New sign-ups are paused right now. Please check back soon.' })
  if (name.length < 2) return res.status(400).json({ error: 'Tell us your name (2+ characters).', field: 'name' })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'That email doesn’t look right.', field: 'email' })
  const pp = passwordProblem(password)
  if (pp) return res.status(400).json({ error: pp, field: 'password' })
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists. Try logging in.', field: 'email' })
  }
  const hash = await hashPassword(password)
  let memberNo = newMemberNo()
  while (db.prepare('SELECT 1 FROM users WHERE member_no = ?').get(memberNo)) memberNo = newMemberNo()
  const info = db.prepare("INSERT INTO users (email, name, password_hash, member_no, country, currency, tier_since) VALUES (?,?,?,?,?,'USD', datetime('now'))")
    .run(email, name, hash, memberNo, country)
  const token = createSession(info.lastInsertRowid)
  setSessionCookie(req, res, token)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
  send({ to: email, subject: 'Welcome to the BND Fan Club', text: `Hi ${name},\nYour member number is ${memberNo}.` })
  res.status(201).json({ user: publicUser(user) })
})

app.post('/api/auth/login', async (req, res) => {
  const email = clean(req.body.email, 200).toLowerCase()
  const password = String(req.body.password ?? '')
  if (!rateLimit('login-ip:' + req.ip, 30, 15 * 60 * 1000) || !rateLimit('login-email:' + email, 8, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts. Wait 15 minutes or reset your password.' })
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  const ok = user ? await verifyPassword(password, user.password_hash) : (await burnTime(password), false)
  if (!ok) return res.status(401).json({ error: 'Email or password is incorrect.' })
  if (user.disabled) return res.status(403).json({ error: 'This account is suspended. Contact support if you think this is a mistake.' })
  setSessionCookie(req, res, createSession(user.id))
  res.json({ user: publicUser(user) })
})

app.post('/api/auth/logout', (req, res) => {
  destroySession(req.cookies[SESSION_COOKIE])
  clearSessionCookie(res)
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => res.json({ user: publicUser(req.user) }))

app.post('/api/auth/forgot', async (req, res) => {
  const email = clean(req.body.email, 200).toLowerCase()
  if (!rateLimit('forgot-ip:' + req.ip, 10, 60 * 60 * 1000) || !rateLimit('forgot-email:' + email, 3, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many reset requests. Try again in an hour.' })
  }
  // Same answer whether or not the account exists — no account enumeration.
  const generic = { ok: true, message: 'If that email belongs to a member, a reset link is on its way. It expires in 30 minutes.' }
  const user = EMAIL_RE.test(email) && db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) return res.json(generic)
  const token = createReset(user.id)
  const origin = `${req.protocol}://${req.get('host')}`
  const link = `${origin}/reset-password?token=${token}`
  await send({ to: user.email, subject: 'Reset your BND Fan Club password', text: `Hi ${user.name},\nReset your password: ${link}\nThis link expires in 30 minutes. If you didn’t ask for this, ignore this email.` })
  // the on-screen demo link is never offered for admin accounts
  res.json(DEMO && !isAdmin(user) ? { ...generic, demoLink: `/reset-password?token=${token}` } : generic)
})

app.get('/api/auth/reset/check', (req, res) => res.json({ valid: !!findReset(String(req.query.token || '')) }))

app.post('/api/auth/reset', async (req, res) => {
  if (!rateLimit('reset-ip:' + req.ip, 20, 60 * 60 * 1000)) return res.status(429).json({ error: 'Too many attempts.' })
  const r = findReset(String(req.body.token || ''))
  if (!r) return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' })
  const pp = passwordProblem(req.body.password)
  if (pp) return res.status(400).json({ error: pp, field: 'password' })
  const hash = await hashPassword(req.body.password)
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, r.user_id)
    db.prepare('UPDATE password_resets SET used_at = ? WHERE token_hash = ?').run(Date.now(), r.token_hash)
    destroyAllSessions(r.user_id) // log out every device
  })
  tx()
  setSessionCookie(req, res, createSession(r.user_id))
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(r.user_id)) })
})

// ── account ─────────────────────────────────────────────────────────────────
app.patch('/api/account', requireUser, (req, res) => {
  const name = req.body.name === undefined ? req.user.name : clean(req.body.name, 60)
  if (name.length < 2) return res.status(400).json({ error: 'Name must be 2+ characters.', field: 'name' })
  const country = req.body.country === undefined ? req.user.country : (isCountry(req.body.country) ? String(req.body.country).toUpperCase() : null)
  db.prepare('UPDATE users SET name = ?, country = ? WHERE id = ?').run(name, country, req.user.id)
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})
app.post('/api/account/password', requireUser, async (req, res) => {
  if (!(await verifyPassword(String(req.body.current ?? ''), req.user.password_hash))) {
    return res.status(400).json({ error: 'Current password is incorrect.', field: 'current' })
  }
  const pp = passwordProblem(req.body.password)
  if (pp) return res.status(400).json({ error: pp, field: 'password' })
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(req.body.password), req.user.id)
  destroyAllSessions(req.user.id)
  setSessionCookie(req, res, createSession(req.user.id))
  res.json({ ok: true })
})

// ── membership ──────────────────────────────────────────────────────────────
app.get('/api/membership/tiers', (req, res) => res.json({ tiers: TIERS, currency: 'USD', provider: PROVIDER, simulated: SIMULATED }))
app.post('/api/membership/checkout', requireUser, async (req, res) => {
  const tier = TIERS.find((t) => t.id === req.body.tier)
  if (!tier) return res.status(400).json({ error: 'Unknown plan.' })
  const interval = tier.rank === 0 ? null : (isInterval(req.body.interval) ? req.body.interval : 'month')
  if (tier.id === req.user.tier && interval === (req.user.billing_interval || null)) return res.status(400).json({ error: 'You’re already on this plan.' })
  const amount = interval ? priceOf(tier.id, interval) : 0 // price is decided on the server, never trusted from the client
  const reference = newReference()
  let provider = 'none'
  try {
    if (amount > 0) provider = (await charge({ amount, currency: 'USD', email: req.user.email, reference })).provider
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }
  db.transaction(() => {
    db.prepare('INSERT INTO payments (user_id, tier, amount, currency, interval, provider, reference, status) VALUES (?,?,?,?,?,?,?,?)')
      .run(req.user.id, tier.id, amount, 'USD', interval || 'none', provider, reference, 'success')
    db.prepare(`UPDATE users SET tier = ?, billing_interval = ?, renews_at = ${interval ? "datetime('now', ?)" : 'NULL'},
      tier_since = CASE WHEN tier = ? THEN tier_since ELSE datetime('now') END WHERE id = ?`)
      .run(...[tier.id, interval, ...(interval ? [interval === 'year' ? '+1 year' : '+1 month'] : []), tier.id, req.user.id])
  })()
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)), reference, simulated: provider.endsWith('simulated') })
})
app.get('/api/membership/payments', requireUser, (req, res) => {
  res.json({ payments: db.prepare('SELECT tier, amount, currency, interval, provider, reference, status, created_at FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(req.user.id) })
})

// ── public: stats + next event (home page) ──────────────────────────────────
app.get('/api/stats', (req, res) => {
  const members = db.prepare('SELECT COUNT(*) n FROM users').get().n
  const countries = db.prepare('SELECT COUNT(DISTINCT country) n FROM users WHERE country IS NOT NULL').get().n
  const cities = db.prepare('SELECT COUNT(DISTINCT city) n FROM events').get().n
  res.set('Cache-Control', 'public, max-age=60').json({ members, countries, cities })
})
app.get('/api/events/upcoming', (req, res) => {
  const now = new Date().toISOString()
  const rows = db.prepare('SELECT id, title, city, starts_at, tz, min_tier FROM events ORDER BY starts_at').all()
    .filter((e) => new Date(e.starts_at).toISOString() > now).slice(0, 6)
  res.set('Cache-Control', 'public, max-age=60').json({ events: rows })
})

// ── privacy: export + delete (GDPR / CCPA / NDPA rights) ────────────────────
app.get('/api/account/export', requireUser, (req, res) => {
  const id = req.user.id
  const data = {
    exportedAt: new Date().toISOString(),
    account: publicUser(req.user),
    payments: db.prepare('SELECT tier, amount, currency, interval, provider, reference, status, created_at FROM payments WHERE user_id = ?').all(id),
    support: db.prepare('SELECT m.sender, m.body, m.created_at FROM support_messages m JOIN support_threads t ON t.id = m.thread_id WHERE t.user_id = ? ORDER BY m.id').all(id),
    theories: db.prepare('SELECT title, body, spoiler, created_at FROM theories WHERE user_id = ?').all(id),
    likes: db.prepare('SELECT theory_id FROM theory_likes WHERE user_id = ?').all(id).map((r) => r.theory_id),
    quiz: db.prepare('SELECT best, total, updated_at FROM quiz_scores WHERE user_id = ?').get(id) || null,
    rsvps: db.prepare('SELECT e.title, e.city, e.starts_at FROM rsvps r JOIN events e ON e.id = r.event_id WHERE r.user_id = ?').all(id),
  }
  res.set('Content-Disposition', `attachment; filename="bnd-fan-club-${req.user.member_no}.json"`).json(data)
})
app.post('/api/account/delete', requireUser, async (req, res) => {
  if (!(await verifyPassword(String(req.body.password ?? ''), req.user.password_hash))) {
    return res.status(400).json({ error: 'Password is incorrect.', field: 'password' })
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id) // cascades: sessions, posts, likes, rsvps, scores, payments
  clearSessionCookie(res)
  res.json({ ok: true })
})

// ── club: theory board (free+) ──────────────────────────────────────────────
app.get('/api/club/theories', requireUser, (req, res) => {
  const rows = db.prepare(`
    SELECT t.id, t.title, t.body, t.spoiler, t.created_at, u.name author, u.tier author_tier, t.user_id = @me mine,
      (SELECT COUNT(*) FROM theory_likes l WHERE l.theory_id = t.id) likes,
      EXISTS(SELECT 1 FROM theory_likes l WHERE l.theory_id = t.id AND l.user_id = @me) liked
    FROM theories t JOIN users u ON u.id = t.user_id
    ORDER BY likes DESC, t.id DESC LIMIT 100`).all({ me: req.user.id })
  res.json({ theories: rows })
})
app.post('/api/club/theories', requireUser, (req, res) => {
  if (!rateLimit('post:' + req.user.id, 10, 60 * 60 * 1000)) return res.status(429).json({ error: 'Slow down, web-head. Try again later.' })
  const title = clean(req.body.title, 120), body = clean(req.body.body, 2000)
  if (title.length < 4) return res.status(400).json({ error: 'Give your theory a title (4+ characters).', field: 'title' })
  if (body.length < 10) return res.status(400).json({ error: 'Say a bit more (10+ characters).', field: 'body' })
  db.prepare('INSERT INTO theories (user_id, title, body, spoiler) VALUES (?,?,?,?)').run(req.user.id, title, body, req.body.spoiler ? 1 : 0)
  res.status(201).json({ ok: true })
})
app.delete('/api/club/theories/:id', requireUser, (req, res) => {
  const r = db.prepare('DELETE FROM theories WHERE id = ? AND user_id = ?').run(+req.params.id, req.user.id)
  res.json({ ok: r.changes > 0 })
})
app.post('/api/club/theories/:id/like', requireUser, (req, res) => {
  const id = +req.params.id
  const had = db.prepare('SELECT 1 FROM theory_likes WHERE theory_id = ? AND user_id = ?').get(id, req.user.id)
  if (had) db.prepare('DELETE FROM theory_likes WHERE theory_id = ? AND user_id = ?').run(id, req.user.id)
  else if (db.prepare('SELECT 1 FROM theories WHERE id = ?').get(id)) db.prepare('INSERT INTO theory_likes VALUES (?,?)').run(id, req.user.id)
  res.json({ liked: !had })
})

// ── club: trivia (free+) ────────────────────────────────────────────────────
app.post('/api/club/quiz', requireUser, (req, res) => {
  const score = Math.max(0, Math.min(50, +req.body.score | 0)), total = Math.max(1, Math.min(50, +req.body.total | 0))
  db.prepare(`INSERT INTO quiz_scores (user_id, best, total) VALUES (?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET best = MAX(best, excluded.best), total = excluded.total, updated_at = datetime('now')`).run(req.user.id, score, total)
  res.json({ ok: true })
})
app.get('/api/club/leaderboard', requireUser, (req, res) => {
  res.json({ rows: db.prepare('SELECT u.name, u.tier, q.best, q.total FROM quiz_scores q JOIN users u ON u.id = q.user_id ORDER BY q.best DESC, q.updated_at ASC LIMIT 10').all() })
})

// ── club: watch parties (web-slinger+) ──────────────────────────────────────
app.get('/api/club/events', requireUser, (req, res) => {
  const rows = db.prepare(`SELECT e.*, (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id) going,
    EXISTS(SELECT 1 FROM rsvps r WHERE r.event_id = e.id AND r.user_id = ?) mine FROM events e ORDER BY starts_at`).all(req.user.id)
  res.json({ events: rows.map((e) => ({ ...e, allowed: hasTier(req.user.tier, e.min_tier) })) })
})
app.post('/api/club/events/:id/rsvp', requireUser, (req, res) => {
  const e = db.prepare('SELECT * FROM events WHERE id = ?').get(+req.params.id)
  if (!e) return res.status(404).json({ error: 'Event not found.' })
  if (!hasTier(req.user.tier, e.min_tier)) return res.status(403).json({ error: `RSVP needs ${tierById(e.min_tier).name} membership.`, needs: e.min_tier })
  const mine = db.prepare('SELECT 1 FROM rsvps WHERE event_id = ? AND user_id = ?').get(e.id, req.user.id)
  if (mine) { db.prepare('DELETE FROM rsvps WHERE event_id = ? AND user_id = ?').run(e.id, req.user.id); return res.json({ going: false }) }
  const n = db.prepare('SELECT COUNT(*) n FROM rsvps WHERE event_id = ?').get(e.id).n
  if (n >= e.capacity) return res.status(409).json({ error: 'This one is full.' })
  db.prepare("INSERT INTO rsvps (event_id, user_id, created_at) VALUES (?,?, datetime('now'))").run(e.id, req.user.id)
  res.json({ going: true })
})

// ── club: gated vaults — content files live in server/content (yours to fill) ─
const vault = (file) => (req, res) => {
  const p = path.resolve('server/content', file)
  res.json(fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : { items: [] })
}
app.get('/api/club/wallpapers', requireTier('webslinger'), vault('wallpapers.json'))
app.get('/api/club/vault', requireTier('spidersense'), vault('spoiler-vault.json'))
app.get('/api/club/lounge', requireTier('multiverse'), vault('multiverse-lounge.json'))

// ── personal dashboard ──────────────────────────────────────────────────────
app.get('/api/dashboard', requireUser, (req, res) => {
  const id = req.user.id
  const one = (sql, ...a) => db.prepare(sql).get(...a)
  const theories = one('SELECT COUNT(*) n FROM theories WHERE user_id = ?', id).n
  const likesReceived = one('SELECT COUNT(*) n FROM theory_likes l JOIN theories t ON t.id = l.theory_id WHERE t.user_id = ?', id).n
  const quiz = one('SELECT best, total FROM quiz_scores WHERE user_id = ?', id)
  const rank = quiz ? one('SELECT COUNT(*) + 1 n FROM quiz_scores WHERE best > ?', quiz.best).n : null
  const now = new Date().toISOString()
  const myEvents = db.prepare('SELECT e.id, e.title, e.city, e.venue, e.starts_at, e.tz FROM rsvps r JOIN events e ON e.id = r.event_id WHERE r.user_id = ? ORDER BY e.starts_at').all(id)
    .filter((e) => new Date(e.starts_at).toISOString() > now)
  const nextEvent = db.prepare('SELECT id, title, city, starts_at, tz, min_tier FROM events ORDER BY starts_at').all()
    .find((e) => new Date(e.starts_at).toISOString() > now && hasTier(req.user.tier, e.min_tier) && !myEvents.some((m) => m.id === e.id)) || null
  const activity = [
    ...db.prepare("SELECT 'theory' kind, title label, created_at at FROM theories WHERE user_id = ?").all(id),
    ...db.prepare("SELECT 'payment' kind, tier label, amount, interval, created_at at FROM payments WHERE user_id = ?").all(id),
    ...db.prepare("SELECT 'rsvp' kind, e.title || ' · ' || e.city label, r.created_at at FROM rsvps r JOIN events e ON e.id = r.event_id WHERE r.user_id = ? AND r.created_at IS NOT NULL").all(id),
    ...(quiz ? [{ kind: 'quiz', label: `${quiz.best}/${quiz.total}`, at: one('SELECT updated_at u FROM quiz_scores WHERE user_id = ?', id).u }] : []),
    { kind: 'joined', label: req.user.member_no, at: req.user.created_at },
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8)
  const tickets = db.prepare('SELECT ref, subject, status, updated_at FROM tickets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 3').all(id)
  const support = one("SELECT id, status, updated_at FROM support_threads WHERE user_id = ? AND status <> 'closed' ORDER BY id DESC LIMIT 1", id) || null
  res.json({
    user: publicUser(req.user),
    stats: { theories, likesReceived, quizBest: quiz?.best ?? null, quizTotal: quiz?.total ?? null, quizRank: rank, rsvps: myEvents.length },
    myEvents, nextEvent, activity, support, tickets,
  })
})

mountAdmin(app)
mountSupport(app, { requireUser })

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }))

// ── SEO ─────────────────────────────────────────────────────────────────────
const PUBLIC_ROUTES = ['/', '/membership', '/help', '/login', '/signup', '/privacy', '/terms', '/refunds', '/accessibility']
app.get('/robots.txt', (req, res) => {
  const base = SITE_URL || `${req.protocol}://${req.get('host')}`
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /club\nDisallow: /account\nDisallow: /dashboard\nDisallow: /tickets\nDisallow: /reset-password\n\nSitemap: ${base}/sitemap.xml\n`)
})
app.get('/sitemap.xml', (req, res) => {
  const base = SITE_URL || `${req.protocol}://${req.get('host')}`
  const urls = PUBLIC_ROUTES.map((r) => `  <url><loc>${base}${r}</loc><changefreq>${r === '/' ? 'daily' : 'monthly'}</changefreq><priority>${r === '/' ? '1.0' : '0.6'}</priority></url>`).join('\n')
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
})

// ── static app (production) ─────────────────────────────────────────────────
const dist = path.resolve('dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

await bootstrapAdmins()
getSettings()
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BND Fan Club API on :${PORT}  (payments: ${PROVIDER_SUMMARY}, mail: ${MAIL_MODE}, demo reset links: ${DEMO ? 'on' : 'off'})`)
  if (!process.env.ADMIN_EMAILS) console.log('⚠️  ADMIN_EMAILS is not set — the control panel is unreachable.')
  if (!process.env.ADMIN_PATH) console.log(`ℹ️  ADMIN_PATH not set; generated panel path stored in the database: ${adminPath()}`)
})
