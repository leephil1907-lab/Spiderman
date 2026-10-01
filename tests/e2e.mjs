// End-to-end UI checks (Playwright, headless Chromium).
//
//   npm run build && npm start          # in one terminal (uses .env)
//   npm run test:e2e                    # in another
//
// Reads ADMIN_EMAILS / ADMIN_INITIAL_PASSWORD / ADMIN_PATH from .env (or the environment).
// Use a throwaway database: DATA_DIR=/tmp/bnd-test npm start
// Screenshots go to tests/screens/ (git-ignored).
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const env = { ...Object.fromEntries((fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '').split('\n')
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]])), ...process.env }
const B = env.BASE_URL || `http://localhost:${env.PORT || 3001}`
const ADMIN = (env.ADMIN_EMAILS || '').split(',')[0].trim()
const ADMIN_PW = env.ADMIN_TEST_PASSWORD || env.ADMIN_INITIAL_PASSWORD
const ADMIN_PATH = env.ADMIN_PATH
if (!ADMIN || !ADMIN_PW || !ADMIN_PATH) { console.error('Set ADMIN_EMAILS, ADMIN_INITIAL_PASSWORD and ADMIN_PATH in .env'); process.exit(2) }

const SHOTS = path.resolve('tests/screens'); fs.mkdirSync(SHOTS, { recursive: true })
const shot = (p, n, o = {}) => p.screenshot({ path: path.join(SHOTS, n), quality: 70, ...o })
const errors = []
let fails = 0
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) { fails++; process.exitCode = 1 } }
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
const watch = (p, tag) => {
  p.on('console', (m) => m.type() === 'error' && !/status of (401|404|423)/.test(m.text()) && errors.push(`[${tag}] ${m.text()}`))
  p.on('pageerror', (e) => errors.push(`[${tag} pageerror] ${e.message}`))
}
const newPage = async (tag, opts = {}) => { const c = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts }); const p = await c.newPage(); watch(p, tag); return p }
const login = async (p, email, pw) => {
  await p.goto(`${B}/login`, { waitUntil: 'networkidle' })
  await p.getByLabel('Email').fill(email); await p.locator('input[type=password]').fill(pw)
  await p.getByRole('button', { name: /log in/i }).click(); await p.waitForURL(/dashboard/)
}

// ── public site: announcement bar, USD tiers, footer ──
const page = await newPage('desk', { locale: 'en-NG', timezoneId: 'Africa/Lagos' })
await page.goto(`${B}/membership`, { waitUntil: 'networkidle' })
ok(await page.locator('.ab').count() === 1, 'announcement bar visible')
const navTop = await page.locator('.nav').evaluate((n) => n.getBoundingClientRect().top)
ok(navTop === 38, `nav sits below the bar (top=${navTop})`)
ok(!(await page.content()).includes(ADMIN), 'admin email not in page HTML')
const prices = (await page.locator('.tier .price').allInnerTexts()).join(' ')
ok(/\$4\.99/.test(prices) && !/₦|NGN/.test(prices), 'USD prices')
const first = await page.locator('.ab-in .ab-text').innerText()
await page.locator('.ab-next').click(); await page.waitForTimeout(900)
ok((await page.locator('.ab-in .ab-text').innerText()) !== first, 'next button rotates the announcement')
ok(await page.locator('.ab-out').count() === 0, 'outgoing slide cleaned up after transition')
await shot(page, 'bar-desktop.jpg', { clip: { x: 0, y: 0, width: 1280, height: 120 } })
await page.goto(`${B}/help`, { waitUntil: 'networkidle' })
for (const l of ['Privacy Policy', 'Terms of Use', 'Refund Policy']) ok(await page.locator(`footer a:has-text("${l}")`).count() > 0, `footer link: ${l}`)

// ── guest opens a support ticket from the Help centre ──
await page.locator('#t-name').fill('Gina Guest'); await page.locator('#t-email').fill('gina@example.com')
await page.locator('#t-sub').fill('Card declined at checkout'); await page.locator('#t-msg').fill('My card keeps getting declined on the Web-Slinger plan.')
await page.getByRole('button', { name: /send message/i }).click()
await page.locator('.ticket-done').waitFor()
const ref = (await page.locator('.ticket-done h2').innerText()).match(/BND-T-\d+/)?.[0]
ok(!!ref, `ticket created (${ref})`)
const guestTicketUrl = await page.locator('.ticket-done a').getAttribute('href')
ok(/key=/.test(guestTicketUrl), 'guest gets a private ticket link')

// ── hidden admin: nobody else can find or reach it ──
await page.goto(B + ADMIN_PATH, { waitUntil: 'networkidle' })
ok(await page.locator('.h-display', { hasText: '404' }).count() === 1, 'guest at admin path → 404')
const robots = await (await page.request.get(`${B}/robots.txt`)).text()
ok(!robots.includes('admin') && !robots.includes(ADMIN_PATH), 'robots.txt does not reveal the panel')
const member = await newPage('member')
const memberEmail = `pw${Date.now()}@example.com`
await member.goto(`${B}/signup`, { waitUntil: 'networkidle' })
await member.getByLabel('Name', { exact: true }).fill('Web Tester'); await member.getByLabel('Email').fill(memberEmail)
await member.getByLabel('Password', { exact: true }).fill('swing1234abc'); await member.locator('.check input').check()
await member.getByRole('button', { name: /create account/i }).click(); await member.waitForURL(/dashboard/)
await member.goto(B + ADMIN_PATH, { waitUntil: 'networkidle' })
ok(await member.locator('.h-display', { hasText: '404' }).count() === 1, 'signed-in member at admin path → 404')
const probe = await member.evaluate(async () => (await fetch('/api/admin/overview', { headers: { 'x-bnd': '1' } })).status)
ok(probe === 404, `member calling admin API → ${probe}`)
const signupAs = await member.request.post(`${B}/api/auth/signup`, { headers: { 'x-bnd': '1' }, data: { name: 'Imposter', email: ADMIN, password: 'swing1234' } })
ok(signupAs.status() >= 400 && signupAs.status() < 500, `cannot register the admin email (${signupAs.status()})`)
const forgot = await (await member.request.post(`${B}/api/auth/forgot`, { headers: { 'x-bnd': '1' }, data: { email: ADMIN } })).json()
ok(!forgot.demoLink, 'no on-screen reset link for the admin account')
ok(await member.locator('.nav a', { hasText: /inbox|admin/i }).count() === 0, 'no admin link in the nav')

// ── admin: login → secret path → unlock ──
const ap = await newPage('admin')
await login(ap, ADMIN, ADMIN_PW)
ok(await ap.locator('.nav a', { hasText: /inbox|admin/i }).count() === 0, 'no admin link in the nav even for the admin')
await ap.goto(`${B}${ADMIN_PATH}-nope`, { waitUntil: 'networkidle' })
ok(await ap.locator('.h-display', { hasText: '404' }).count() === 1, 'admin at a wrong path → 404')
await ap.goto(B + ADMIN_PATH, { waitUntil: 'networkidle' })
await ap.locator('.hq-unlock-card').waitFor()
ok(await ap.locator('.ab, .nav, .chat-launcher').evaluateAll((els) => els.every((e) => getComputedStyle(e).display === 'none')), 'site chrome hidden in admin mode')
await ap.locator('.hq-unlock-card input[type=password]').fill('wrong-password-1'); await ap.getByRole('button', { name: /unlock/i }).click()
await ap.locator('.field-error').waitFor(); ok(true, 'wrong password rejected')
await shot(ap, 'admin-unlock.jpg')
await ap.locator('.hq-unlock-card input[type=password]').fill(ADMIN_PW); await ap.getByRole('button', { name: /unlock/i }).click()
await ap.locator('.hq-stats').waitFor()
ok(await ap.locator('.hq-stat').count() === 6, 'overview stats')
await shot(ap, 'admin-overview.jpg')

// tickets: reply to Gina
await ap.locator('.hq-nav', { hasText: 'Inbox' }).click()
await ap.locator('.inbox-list li button', { hasText: 'Card declined' }).first().click()
await ap.locator('#treply').fill('Hi Gina — we’ve reset your checkout. Please try again now.')
await ap.getByRole('button', { name: /^send reply$/i }).click()
await ap.locator('.hq-toast').waitFor()
ok(await ap.locator('.inbox .bubble', { hasText: 'reset your checkout' }).count() === 1, 'admin replied to the ticket')
await shot(ap, 'admin-tickets.jpg')
await page.goto(B + guestTicketUrl, { waitUntil: 'networkidle' })
ok(await page.locator('.ticket-msg.admin', { hasText: 'reset your checkout' }).count() === 1, 'guest sees the reply on their ticket link')
await page.locator('.ticket-reply textarea').fill('Worked, thanks!'); await page.getByRole('button', { name: /send reply/i }).click()
await page.locator('.ticket-msg.user', { hasText: 'Worked, thanks' }).waitFor(); ok(true, 'guest can reply on the ticket')
const badKey = await page.request.get(`${B}/api/support/tickets/${ref}?key=wrong`)
ok(badKey.status() === 404, 'ticket link with a wrong key → 404')

// live chat: member asks for a person, admin answers
await member.goto(`${B}/help`, { waitUntil: 'networkidle' })
await member.locator('.help-card', { hasText: 'Live chat' }).click()
await member.locator('#chat-text').fill('talk to a human'); await member.keyboard.press('Enter')
await member.locator('.chat-system', { hasText: 'queue' }).waitFor()
await ap.getByRole('tab', { name: /live chats/i }).click()
await ap.locator('.inbox-list li button', { hasText: 'Web Tester' }).first().click()
await ap.locator('#reply').fill('Live reply test'); await ap.locator('.inbox .chat-send').click()
await member.locator('.bubble.agent', { hasText: 'Live reply test' }).waitFor({ timeout: 9000 })
ok(true, 'admin chat reply appears live for the member')

// members
await ap.locator('.hq-nav', { hasText: 'Members' }).click()
await ap.locator('.hq-search input').fill('Web Tester'); await ap.waitForTimeout(700)
ok(await ap.locator('.hq-table tbody tr', { hasText: memberEmail }).count() === 1, 'member search')
await ap.locator('.hq-table tbody tr', { hasText: memberEmail }).locator('select').selectOption('spidersense'); await ap.locator('.hq-toast').waitFor()
await member.goto(`${B}/dashboard`, { waitUntil: 'networkidle' })
ok((await member.locator('main').innerText()).includes('Spider-Sense'), 'complimentary upgrade reflected on member dashboard')

// announcements: add a message, switch transition, publish → live on the site
await ap.locator('.hq-nav', { hasText: 'Announcements' }).click()
await ap.getByRole('button', { name: /add message/i }).click()
await ap.locator('.hq-item').last().locator('input').first().fill('E2E: Brand New Day trivia night this Friday')
await ap.getByRole('radio', { name: 'Swing' }).click()
await ap.locator('.hq-savebar.show').waitFor()
await shot(ap, 'admin-announcements.jpg', { fullPage: true })
await ap.getByRole('button', { name: /save & publish/i }).click(); await ap.locator('.hq-toast').waitFor()
const pub = await (await ap.request.get(`${B}/api/settings`)).json()
ok(pub.settings.announcement.transition === 'swing' && pub.settings.announcement.items.some((i) => i.text.startsWith('E2E')), 'announcement saved publicly')
ok(!JSON.stringify(pub).includes(ADMIN) && !JSON.stringify(pub).includes(ADMIN_PATH), 'public settings contain no admin email/path')

// settings: turn the chat widget off → gone for visitors; then restore
await ap.locator('.hq-nav', { hasText: 'Settings' }).click()
await ap.locator('.hq-switch', { hasText: 'Live chat widget' }).click()
await ap.getByRole('button', { name: /save & publish/i }).click(); await ap.locator('.hq-toast').waitFor()
await page.goto(`${B}/membership`, { waitUntil: 'networkidle' })
ok(await page.locator('.chat-launcher').count() === 0, 'chat widget hidden when disabled')
await shot(ap, 'admin-settings.jpg')
await ap.locator('.hq-switch', { hasText: 'Live chat widget' }).click()
await ap.getByRole('button', { name: /save & publish/i }).click(); await ap.locator('.hq-toast').waitFor()

// audit + lock
await ap.locator('.hq-nav', { hasText: 'Audit log' }).click()
await ap.locator('.hq-table tbody tr').first().waitFor()
const audit = await ap.locator('.hq-table').innerText()
ok(/Failed unlock attempt/.test(audit) && /Replied to ticket/.test(audit) && /Updated settings/.test(audit), 'audit log records actions')
await ap.locator('.hq-nav', { hasText: 'Lock panel' }).click()
await ap.locator('.hq-unlock-card').waitFor()
const locked = await ap.evaluate(async () => (await fetch('/api/admin/overview', { headers: { 'x-bnd': '1' } })).status)
ok(locked === 423, `locked panel refuses API calls (${locked})`)

// ── mobile 390 ──
const mp = await newPage('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
for (const p of ['/membership', '/help', '/signup', '/privacy']) {
  await mp.goto(B + p, { waitUntil: 'networkidle' })
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok(ov <= 0, `no overflow at 390 ${p} (${ov})`)
}
await shot(mp, 'bar-mobile.jpg', { clip: { x: 0, y: 0, width: 390, height: 140 } })

ok(errors.length === 0, `console errors: ${errors.length}`)
errors.forEach((e) => console.log('   ', e))
console.log(fails ? `\n${fails} check(s) failed` : '\nAll checks passed')
await browser.close()
