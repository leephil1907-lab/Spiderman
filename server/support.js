// Support chat: an instant answer assistant + hand-off to a real person.
// • Every message is stored (support_threads / support_messages).
// • The assistant answers from the knowledge base below — no third-party AI, no data leaves the server.
// • "Talk to a person" moves the thread to status 'human'; club staff (ADMIN_EMAILS) reply
//   from /admin/support and the visitor's chat picks the reply up live (polling).
import crypto from 'node:crypto'
import { db } from './db.js'
import { rateLimit } from './auth.js'
import { getSettings } from './settings.js'
import { send, notifyAdmins } from './mailer.js'
import { TIERS, tierById } from '../shared/tiers.js'
import { formatMoney } from '../shared/currency.js'

const GUEST_COOKIE = 'bnd_chat'
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const clean = (s, max) => String(s ?? '').trim().slice(0, max)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const priceLine = (t) => (t.price.month ? `${t.name} — ${formatMoney(t.price.month)}/month or ${formatMoney(t.price.year)}/year` : `${t.name} — Free`)

// ── knowledge base ──────────────────────────────────────────────────────────
// keywords: any match scores; more matches = better. `a` may be a function of the user.
const KB = [
  { id: 'greet', k: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'howdy', 'yo'], a: (u) => `Hey${u ? ' ' + u.name.split(' ')[0] : ''}! I’m the BND Club assistant. Ask me about memberships, billing, your account, watch parties or the film — or tap “Talk to a person” any time.`, s: ['Membership tiers', 'Where to watch', 'Talk to a person'] },
  { id: 'pricing', k: ['price', 'pricing', 'cost', 'how much', 'tier', 'tiers', 'plan', 'plans', 'membership', 'subscribe', 'subscription', 'upgrade', 'premium', 'paid'], a: () => `We have four membership tiers, all priced in US dollars:\n\n${TIERS.map((t) => '• ' + priceLine(t)).join('\n')}\n\nYearly billing saves about two months. Compare everything on the Membership page.`, link: { label: 'Compare tiers', href: '/membership' }, s: ['What’s in Multiverse?', 'How do I cancel?', 'Payment methods'] },
  { id: 'multiverse', k: ['multiverse', 'tier 4', 'top tier', 'highest', 'lounge', 'collectible', 'collectibles'], a: () => { const t = tierById('multiverse'); return `${t.name} is our top tier (${formatMoney(t.price.month)}/month or ${formatMoney(t.price.year)}/year). It includes ${t.perks.map((p) => p[0].toLowerCase() + p.slice(1)).join(', ').replace(/, ([^,]*)$/, ' and $1')}.` }, link: { label: 'See Multiverse', href: '/membership?plan=multiverse' } },
  { id: 'spidersense', k: ['spider-sense', 'spidersense', 'spoiler vault', 'vault', 'private screening', 'tier 3'], a: () => { const t = tierById('spidersense'); return `${t.name} (${formatMoney(t.price.month)}/month) unlocks the Spoiler Vault deep-dives, private screenings with Q&A, plus everything in Web-Slinger.` } },
  { id: 'webslinger', k: ['web-slinger', 'webslinger', 'wallpaper', 'wallpapers', 'tier 2', 'badge'], a: () => { const t = tierById('webslinger'); return `${t.name} (${formatMoney(t.price.month)}/month) gets you members-only watch parties worldwide, the HD wallpaper pack and a badge on your posts.` } },
  { id: 'currency', k: ['naira', 'ngn', 'currency', 'dollar', 'dollars', 'usd', 'local currency', 'convert', 'exchange', 'pounds', 'euro', 'cedi', 'rand', 'shilling'], a: () => 'All memberships are charged in US dollars (USD), wherever you are. If your card is in another currency, your bank converts it at its own rate — check with them for any foreign-transaction fee.', s: ['Payment methods', 'Membership tiers'] },
  { id: 'refund', k: ['refund', 'refunds', 'money back', 'chargeback', 'overcharged', 'double charged', 'double charge', 'charged twice', 'wrong charge'], a: () => 'If you were charged by mistake or something isn’t working, we’ll make it right. Where your local consumer law gives a cooling-off or refund right, it applies in full. Our Refund Policy has the details, or I can pass you to a person now.', link: { label: 'Refund policy', href: '/refunds' }, s: ['Talk to a person'] },
  { id: 'cancel', k: ['cancel', 'cancellation', 'stop', 'unsubscribe', 'downgrade', 'switch plan', 'change plan', 'end subscription'], a: () => 'You can switch tiers or drop back to the free plan any time from your Account page (Membership → “Switch to free”). Paid perks stay active until the end of the period you’ve paid for.', link: { label: 'Open Account', href: '/account' } },
  { id: 'payment', k: ['pay', 'payment', 'card', 'visa', 'mastercard', 'billing', 'charged', 'charge', 'invoice', 'receipt', 'stripe', 'paystack', 'declined', 'failed'], a: () => 'We take major debit and credit cards through a secure payment partner — card details never touch our servers. Your receipts are on your Dashboard and Account page. If a payment failed, try another card or ask your bank to allow international USD payments.', link: { label: 'Billing history', href: '/account' }, s: ['How do I cancel?', 'Refunds', 'Talk to a person'] },
  { id: 'password', k: ['password', 'forgot', 'reset', 'can\'t log in', 'cant log in', 'cannot log in', 'login', 'log in', 'sign in', 'locked out'], a: () => 'Use “Forgot password” on the login page — we’ll email you a reset link that works for 30 minutes. Resetting signs you out on every device for safety.', link: { label: 'Reset password', href: '/forgot-password' } },
  { id: 'signup', k: ['sign up', 'signup', 'join', 'register', 'create account', 'free account', 'become a member'], a: () => 'Joining is free and takes 30 seconds — no card needed. You get a digital member card, the Theory Board, trivia and your own dashboard straight away.', link: { label: 'Join free', href: '/signup' } },
  { id: 'dashboard', k: ['dashboard', 'my account', 'profile', 'my stats', 'member card', 'member number', 'membership card'], a: (u) => (u ? 'Your personal dashboard shows your member card, plan and renewal date, your stats, upcoming watch parties and recent activity.' : 'Every member gets a personal dashboard with their member card, plan, stats and upcoming watch parties. Log in or join free to open yours.'), link: { label: 'Open dashboard', href: '/dashboard' } },
  { id: 'delete', k: ['delete', 'delete my account', 'delete account', 'remove my account', 'remove account', 'close account', 'my data', 'gdpr', 'privacy', 'export', 'personal data', 'data'], a: () => 'You’re in control of your data. From your Account page you can download everything we hold about you or permanently delete your account. Our Privacy Policy explains what we collect and why.', link: { label: 'Privacy Policy', href: '/privacy' } },
  { id: 'events', k: ['watch party', 'watch parties', 'event', 'events', 'rsvp', 'meetup', 'screening', 'party'], a: () => 'Members’ watch parties run in cities around the world, plus an online Multiverse Lounge. Web-Slinger and above can RSVP from the Club → Watch parties tab. Times are shown in the city’s local time and yours.', link: { label: 'Watch parties', href: '/club?tab=events' } },
  { id: 'watch', k: ['where to watch', 'cinema', 'cinemas', 'theater', 'theatre', 'ticket', 'tickets', 'showtime', 'showtimes', 'imax', 'stream', 'streaming', 'watch the movie', 'watch the film', 'watch it', 'where can i watch', 'see it', 'see the movie', 'in theaters', 'in cinemas', 'near me'], a: () => 'Spider-Man: Brand New Day is in cinemas worldwide. Pick your region in “Where to watch” on the home page for the major chains near you, or find an IMAX screen. We don’t sell tickets ourselves.', link: { label: 'Where to watch', href: '/#watch' } },
  { id: 'film', k: ['release', 'released', 'release date', 'runtime', 'how long', 'director', 'cast', 'actor', 'tom holland', 'zendaya', 'rating', 'pg-13', 'box office'], a: () => 'Spider-Man: Brand New Day opened in US cinemas on July 31, 2026. It runs 2h 25m, is rated PG-13 (US), and is directed by Destin Daniel Cretton, starring Tom Holland, Zendaya, Sadie Sink, Jacob Batalon, Jon Bernthal and Mark Ruffalo.', link: { label: 'Film & cast', href: '/#cast' } },
  { id: 'trivia', k: ['trivia', 'quiz', 'leaderboard', 'theory', 'theories', 'theory board', 'post'], a: () => 'The Theory Board and Trivia are free for every member in the Club. Tag spoilers when you post, and climb the global trivia leaderboard.', link: { label: 'Open the Club', href: '/club' } },
  { id: 'official', k: ['official', 'sony', 'marvel', 'disney', 'affiliated', 'legit', 'real'], a: () => 'BND Fan Club is a fan community. Spider-Man is a trademark of Marvel, and the film is a Columbia Pictures / Marvel Studios release distributed by Sony Pictures. See our Terms for details.', link: { label: 'Terms', href: '/terms' } },
  { id: 'contact', k: ['email', 'contact', 'phone', 'address', 'reach you', 'support email'], a: () => `You can email ${getSettings().support.supportEmail}, open a support ticket in the Help centre, or chat with a person right here — tap “Talk to a person”.`, link: { label: 'Open a ticket', href: '/help#ticket' }, s: ['Talk to a person'] },
  { id: 'thanks', k: ['thanks', 'thank you', 'thx', 'cheers', 'great', 'awesome', 'perfect', 'bye', 'goodbye'], a: () => 'Any time! Your friendly neighborhood assistant is always here. 🕸️', s: [] },
]
const HUMAN_RE = /\b(human|person|agent|someone|real person|staff|operator|representative|talk to (a )?(person|human|someone)|live (chat|agent))\b/i
const norm = (s) => ' ' + s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' \-]+/g, ' ').replace(/\s+/g, ' ') + ' '

export function answer(text, user) {
  if (HUMAN_RE.test(text)) return { handoff: true }
  const t = norm(text)
  let best = null, score = 0
  for (const e of KB) {
    let sc = 0
    for (const k of e.k) if (t.includes(' ' + k + ' ') || t.includes(' ' + k + 's ') || t.includes(' ' + k + 'ed ') || (k.includes(' ') && t.includes(k))) sc += k.includes(' ') ? 2 : 1
    if (e.id === 'greet' && sc && t.trim().split(' ').length > 4) sc = 0.5 // greeting + real question → prefer the question
    if (sc > score) { best = e; score = sc }
  }
  if (!best) {
    return { body: 'I’m not sure I’ve got that one. I can help with memberships, billing, your account, watch parties and the film — or I can connect you with a person from the club team.', suggestions: ['Membership tiers', 'Payment methods', 'Talk to a person'] }
  }
  return { body: typeof best.a === 'function' ? best.a(user) : best.a, link: best.link, suggestions: best.s ?? ['Talk to a person'] }
}

// ── helpers ─────────────────────────────────────────────────────────────────
const getThread = (id) => db.prepare('SELECT * FROM support_threads WHERE id = ?').get(id)
const msgsAfter = (tid, after = 0) => db.prepare('SELECT id, sender, body, meta, created_at FROM support_messages WHERE thread_id = ? AND id > ? ORDER BY id').all(tid, after)
  .map((m) => ({ ...m, meta: m.meta ? JSON.parse(m.meta) : null }))
const addMsg = (tid, sender, body, meta) => {
  db.prepare('INSERT INTO support_messages (thread_id, sender, body, meta) VALUES (?,?,?,?)').run(tid, sender, body, meta ? JSON.stringify(meta) : null)
  db.prepare("UPDATE support_threads SET updated_at = datetime('now') WHERE id = ?").run(tid)
}
const pubThread = (t) => t && ({ id: t.id, status: t.status, priority: !!t.priority, hasEmail: !!t.email })

function findThread(req) {
  const g = req.cookies[GUEST_COOKIE]
  if (req.user) {
    const mine = db.prepare("SELECT * FROM support_threads WHERE user_id = ? AND status <> 'closed' ORDER BY id DESC LIMIT 1").get(req.user.id)
    if (mine) return mine
    if (g) { // carry a guest conversation over when they log in
      const gt = db.prepare("SELECT * FROM support_threads WHERE guest_hash = ? AND user_id IS NULL AND status <> 'closed' ORDER BY id DESC LIMIT 1").get(sha(g))
      if (gt) { db.prepare('UPDATE support_threads SET user_id = ?, email = COALESCE(email, ?), name = COALESCE(name, ?) WHERE id = ?').run(req.user.id, req.user.email, req.user.name, gt.id); return getThread(gt.id) }
    }
    return null
  }
  if (!g) return null
  return db.prepare("SELECT * FROM support_threads WHERE guest_hash = ? AND user_id IS NULL AND status <> 'closed' ORDER BY id DESC LIMIT 1").get(sha(g)) || null
}
function createThread(req, res) {
  let guestHash = null
  if (!req.user) {
    let g = req.cookies[GUEST_COOKIE]
    if (!g) { g = crypto.randomBytes(24).toString('base64url'); res.cookie(GUEST_COOKIE, g, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 30 * 864e5, path: '/' }) }
    guestHash = sha(g)
  }
  const pri = req.user && tierById(req.user.tier).id === 'multiverse' ? 1 : 0
  const info = db.prepare('INSERT INTO support_threads (user_id, guest_hash, email, name, priority) VALUES (?,?,?,?,?)')
    .run(req.user?.id ?? null, guestHash, req.user?.email ?? null, req.user?.name ?? null, pri)
  return getThread(info.lastInsertRowid)
}
function handoff(t, user) {
  if (!getSettings().support.humanHandoff) {
    addMsg(t.id, 'bot', 'Live chat with the team is offline right now. Open a support ticket and we’ll reply by email — usually within 24 hours.', { link: { label: 'Open a ticket', href: '/help#ticket' }, suggestions: [] })
    return
  }
  notifyAdmins(`Live chat waiting${t.priority ? ' (PRIORITY)' : ''}`, `A visitor asked for a person in the support chat (thread #${t.id}).\nReply from the control panel → Inbox → Live chats.`)
  db.prepare("UPDATE support_threads SET status = 'human' WHERE id = ?").run(t.id)
  const pri = t.priority ? ' As a Multiverse member you’re at the front of the queue.' : ''
  addMsg(t.id, 'system', `You’re now in the queue for a person from the club team.${pri} We usually reply within a few hours (we’re a worldwide team, so sometimes it’s overnight). You can close this window — ${user || t.email ? 'we’ll keep the conversation here and email you too' : 'leave your email so we can reach you'}.`)
}

// ── routes ──────────────────────────────────────────────────────────────────
export function mountSupport(app, { requireUser }) {
  const staff = (req, res, next) => app.locals.adminUnlocked(req, res, next)

  app.get('/api/support/thread', (req, res) => {
    const t = findThread(req)
    res.json({ thread: pubThread(t), messages: t ? msgsAfter(t.id) : [] })
  })
  app.get('/api/support/messages', (req, res) => {
    const t = findThread(req)
    if (!t) return res.json({ thread: null, messages: [] })
    res.json({ thread: pubThread(t), messages: msgsAfter(t.id, +req.query.after || 0) })
  })
  app.post('/api/support/messages', (req, res) => {
    const body = clean(req.body.body, 1500)
    if (!body) return res.status(400).json({ error: 'Type a message first.' })
    if (!rateLimit('chat:' + (req.user?.id || req.ip), 30, 60_000)) return res.status(429).json({ error: 'You’re sending messages too fast. Wait a moment.' })
    let t = findThread(req) || createThread(req, res)
    const lastId = db.prepare('SELECT COALESCE(MAX(id),0) m FROM support_messages WHERE thread_id = ?').get(t.id).m
    addMsg(t.id, 'user', body)
    if (t.status === 'bot' && !getSettings().support.assistantEnabled) handoff(t, req.user)
    else if (t.status === 'bot') {
      const a = answer(body, req.user)
      if (a.handoff) handoff(t, req.user)
      else addMsg(t.id, 'bot', a.body, { link: a.link, suggestions: a.suggestions })
    }
    t = getThread(t.id)
    res.json({ thread: pubThread(t), messages: msgsAfter(t.id, lastId) })
  })
  app.post('/api/support/handoff', (req, res) => {
    let t = findThread(req) || createThread(req, res)
    const email = clean(req.body.email, 200).toLowerCase()
    if (email) {
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'That email doesn’t look right.', field: 'email' })
      db.prepare('UPDATE support_threads SET email = ? WHERE id = ?').run(email, t.id)
    }
    const lastId = db.prepare('SELECT COALESCE(MAX(id),0) m FROM support_messages WHERE thread_id = ?').get(t.id).m
    if (t.status !== 'human') handoff(getThread(t.id), req.user)
    else if (email) addMsg(t.id, 'system', `Thanks — we’ll also reply to ${email}.`)
    t = getThread(t.id)
    res.json({ thread: pubThread(t), messages: msgsAfter(t.id, lastId) })
  })
  app.post('/api/support/close', (req, res) => {
    const t = findThread(req)
    if (t) { addMsg(t.id, 'system', 'Chat ended by visitor.'); db.prepare("UPDATE support_threads SET status = 'closed' WHERE id = ?").run(t.id) }
    res.json({ ok: true })
  })

  // ── support tickets (email enquiries) ──
  const TCATS = ['Membership & billing', 'Account & login', 'Watch parties', 'Technical problem', 'Privacy & data', 'Other']
  const pubTicket = (t) => ({ ref: t.ref, subject: t.subject, category: t.category, status: t.status, created_at: t.created_at, updated_at: t.updated_at,
    messages: db.prepare('SELECT id, sender, body, created_at FROM ticket_messages WHERE ticket_id = ? ORDER BY id').all(t.id) })
  app.get('/api/support/ticket-categories', (req, res) => res.json({ categories: TCATS }))
  app.post('/api/support/tickets', async (req, res) => {
    if (!getSettings().support.ticketsEnabled) return res.status(503).json({ error: 'Support tickets are paused right now. Please use the live chat.' })
    if (!rateLimit('ticket:' + (req.user?.id || req.ip), 5, 60 * 60 * 1000)) return res.status(429).json({ error: 'You’ve opened several tickets recently. Please wait for a reply.' })
    const name = req.user?.name || clean(req.body.name, 60)
    const email = (req.user?.email || clean(req.body.email, 200)).toLowerCase()
    const subject = clean(req.body.subject, 120), message = clean(req.body.message, 5000)
    const category = TCATS.includes(req.body.category) ? req.body.category : 'Other'
    if (name.length < 2) return res.status(400).json({ error: 'Tell us your name.', field: 'name' })
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'That email doesn’t look right.', field: 'email' })
    if (subject.length < 4) return res.status(400).json({ error: 'Add a short subject (4+ characters).', field: 'subject' })
    if (message.length < 10) return res.status(400).json({ error: 'Describe the problem (10+ characters).', field: 'message' })
    if (String(req.body.website || '')) return res.status(201).json({ ok: true, ref: 'BND-T-000000' }) // honeypot
    let ref; do { ref = 'BND-T-' + crypto.randomInt(100000, 999999) } while (db.prepare('SELECT 1 FROM tickets WHERE ref = ?').get(ref))
    const key = crypto.randomBytes(18).toString('base64url')
    const info = db.prepare('INSERT INTO tickets (ref, access_hash, user_id, name, email, category, subject) VALUES (?,?,?,?,?,?,?)').run(ref, sha(key), req.user?.id ?? null, name, email, category, subject)
    db.prepare("INSERT INTO ticket_messages (ticket_id, sender, body) VALUES (?, 'user', ?)").run(info.lastInsertRowid, message)
    const S = getSettings(), origin = `${req.protocol}://${req.get('host')}`
    const viewUrl = req.user ? `${origin}/tickets` : `${origin}/tickets/${ref}?key=${key}`
    send({ to: email, replyTo: S.support.supportEmail, subject: `We got your message [${ref}]`, text: `Hi ${name},\n\nThanks for contacting ${S.company.name}. Your ticket ${ref} — “${subject}” — is with our team and we usually reply within 24 hours.\n\nView or add to it: ${viewUrl}\n\n— ${S.support.agentName}` })
    notifyAdmins(`New ticket ${ref}: ${subject}`, `From: ${name}\nCategory: ${category}\n\n${message}\n\nReply from the control panel → Inbox → Tickets.`)
    res.status(201).json({ ok: true, ref, key: req.user ? undefined : key })
  })
  app.get('/api/support/tickets', requireUser, (req, res) => {
    res.json({ tickets: db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id).map(pubTicket) })
  })
  const findGuestTicket = (ref, key) => {
    const t = db.prepare('SELECT * FROM tickets WHERE ref = ?').get(String(ref || ''))
    if (!t || !key) return null
    const a = Buffer.from(t.access_hash), b = Buffer.from(sha(String(key)))
    return a.length === b.length && crypto.timingSafeEqual(a, b) ? t : null
  }
  app.get('/api/support/tickets/:ref', (req, res) => {
    const t = req.user ? db.prepare('SELECT * FROM tickets WHERE ref = ? AND user_id = ?').get(req.params.ref, req.user.id) : null
    const g = t || findGuestTicket(req.params.ref, req.query.key)
    if (!g) return res.status(404).json({ error: 'Ticket not found. Check the link in your email.' })
    res.json({ ticket: pubTicket(g) })
  })
  app.post('/api/support/tickets/:ref/reply', (req, res) => {
    const t = (req.user && db.prepare('SELECT * FROM tickets WHERE ref = ? AND user_id = ?').get(req.params.ref, req.user.id)) || findGuestTicket(req.params.ref, req.body.key)
    if (!t) return res.status(404).json({ error: 'Ticket not found.' })
    if (!rateLimit('treply:' + t.id, 20, 60 * 60 * 1000)) return res.status(429).json({ error: 'Too many replies. Try again later.' })
    const body = clean(req.body.body, 5000)
    if (body.length < 2) return res.status(400).json({ error: 'Write a message first.' })
    db.prepare("INSERT INTO ticket_messages (ticket_id, sender, body) VALUES (?, 'user', ?)").run(t.id, body)
    db.prepare("UPDATE tickets SET status = 'open', updated_at = datetime('now') WHERE id = ?").run(t.id)
    notifyAdmins(`Ticket ${t.ref} updated`, `${t.name} replied:\n\n${body}`)
    res.json({ ticket: pubTicket(db.prepare('SELECT * FROM tickets WHERE id = ?').get(t.id)) })
  })

  // ── staff inbox ──
  app.get('/api/admin/support/threads', staff, (req, res) => {
    const status = ['bot', 'human', 'closed'].includes(req.query.status) ? req.query.status : 'human'
    const rows = db.prepare(`SELECT t.id, t.status, t.priority, t.email, t.name, t.updated_at, u.tier, u.member_no,
        (SELECT body FROM support_messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) last,
        (SELECT sender FROM support_messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) last_sender
      FROM support_threads t LEFT JOIN users u ON u.id = t.user_id WHERE t.status = ? ORDER BY t.priority DESC, t.updated_at DESC LIMIT 200`).all(status)
    const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM support_threads GROUP BY status').all().map((r) => [r.status, r.n]))
    res.json({ threads: rows, counts })
  })
  app.get('/api/admin/support/threads/:id', staff, (req, res) => {
    const t = getThread(+req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found.' })
    const u = t.user_id ? db.prepare('SELECT name, email, tier, member_no, country, created_at FROM users WHERE id = ?').get(t.user_id) : null
    res.json({ thread: { ...t, guest_hash: undefined }, user: u, messages: msgsAfter(t.id, +req.query.after || 0) })
  })
  app.post('/api/admin/support/threads/:id/reply', staff, (req, res) => {
    const t = getThread(+req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found.' })
    const body = clean(req.body.body, 3000)
    if (!body) return res.status(400).json({ error: 'Empty reply.' })
    if (t.status !== 'human') db.prepare("UPDATE support_threads SET status = 'human' WHERE id = ?").run(t.id)
    addMsg(t.id, 'agent', body, { agent: getSettings().support.agentName })
    res.json({ ok: true })
  })
  app.post('/api/admin/support/threads/:id/close', staff, (req, res) => {
    const t = getThread(+req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found.' })
    addMsg(t.id, 'system', 'This conversation was closed by the club team. Send a new message any time to start again.')
    db.prepare("UPDATE support_threads SET status = 'closed' WHERE id = ?").run(t.id)
    res.json({ ok: true })
  })
}
