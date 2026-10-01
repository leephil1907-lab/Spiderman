# BRAND NEW DAY — Fan Club

The scroll film is the opening section. Below it: the film, trailer, cast, timeline,
where to watch, and a full fan club with real accounts.

Stack: React 18 + Vite + React Three Fiber (front end), Express + SQLite via better-sqlite3 (API). Node 20+.

```bash
cp .env.example .env   # then fill it in (see "Admin control panel" and "Email")
npm install
npm run build
npm start              # → http://localhost:3001  (API + site, one process)
# dev with hot reload:  npm run dev   (API :3001, Vite :5173 proxies /api)
```

`.env` is git-ignored and must never be committed. The database lives in `data/` (also git-ignored). Override its location with `DATA_DIR=`.

## Pages
| Route | What |
|---|---|
| `/` | Scroll film → ticker → film info, live stats, trailer, cast (spoiler-blur roles), timeline, cinemas by region, next watch party countdown, plans |
| `/signup` `/login` | Accounts. `?plan=webslinger` carries a chosen plan through signup into checkout |
| `/forgot-password` → `/reset-password?token=` | Reset flow |
| `/membership` | Plans + checkout |
| `/club` | Members area: card · Theory Board · Trivia + leaderboard · Watch parties · Wallpapers · Spoiler Vault |
| `/account` | Name, country, currency, password, plan, payment history, **export my data**, **delete account** |
| `/privacy` `/terms` | Template legal pages — **have a lawyer review and fill in the [brackets]** |
| `/help` | Help centre: FAQ, live chat and the **support ticket form** |
| `/tickets` | A member's support tickets and replies (guests get a private link `/tickets/:ref?key=…` by email) |

## Membership (USD only)
`shared/tiers.js` is the single source for tiers, prices and the comparison table (used by the API **and** the UI):

| Tier | Monthly | Yearly |
|---|---|---|
| 1 · Friendly Neighborhood | Free | Free |
| 2 · Web-Slinger | $4.99 | $49.99 |
| 3 · Spider-Sense | $9.99 | $99.99 |
| 4 · Multiverse | $19.99 | $199.99 |

Every price is charged in US dollars, worldwide, and the server recomputes it (the client can't change the amount).
`PAYMENT_PROVIDER=stripe` (default) or `paystack`; checkout stays simulated until that provider's secret key is set.
Gating is enforced on the server (`requireTier`), e.g. `/api/club/lounge` needs Multiverse.

## Personal dashboard (`/dashboard`)
Login and signup land here. It shows the member card, plan with price and renewal date, next-tier upsell, a get-started checklist, stats (theories, likes, trivia rank, RSVPs), the member's watch parties or the next one they can join (with countdown), access per club area, recent activity and support status. Data comes from `GET /api/dashboard`.

## Support chat
- The launcher (club logo) can be **dragged** anywhere and snaps to the nearest side. Its position is saved, and arrow keys move it too. On phones the chat opens as a bottom sheet.
- An instant assistant answers from the knowledge base in `server/support.js` (no third-party AI). Edit the `KB` entries to change answers.
- “Talk to a person” hands the chat to staff. Guests are asked for an email. Multiverse members are flagged as priority.
- Staff answer chats in the control panel (Inbox → Live chats). Replies appear live in the visitor's chat. The assistant, the handoff and the widget itself can be switched off in Settings.
- Open the chat from any code with `openChat('optional first message')` from `src/components/SupportChat.jsx`.

## Footer & legal
Footer: contact email, live chat, hours, social links, accepted payment cards, company details and links to Help, Privacy, Terms, Cookies, Refunds and Accessibility.
Company details, support email, hours and social links are edited in the control panel (Settings). The defaults are in `server/settings.js`. Legal pages live in `src/pages/Legal.jsx` and are **templates: have them reviewed before launch**.

## Admin control panel (hidden)
The panel isn't linked anywhere on the site and has no client-side route. To reach it:
1. Log in normally with an account whose email is in `ADMIN_EMAILS`.
2. Visit the secret path from `ADMIN_PATH` (e.g. `https://your-domain.com/hq-…`).
3. Re-enter your password to unlock it. Unlocking lasts 30 minutes of activity, per device, and **Lock panel** ends it early.

How it's protected:
- `ADMIN_EMAILS`, `ADMIN_PATH` and the admin password are server-side only. They are never in the JS bundle, the public settings, robots.txt or the HTML.
- Visitors and members get an ordinary 404 at the panel path, and `/api/admin/*` answers **404** to them, so the panel doesn't reveal that it exists. The browser asks the server whether a URL is the panel only when an admin is signed in.
- Every admin API needs a session that was unlocked with the password. Five wrong passwords lock unlocking for 15 minutes.
- The admin account is created on first start, using `ADMIN_INITIAL_PASSWORD`, so nobody can register that email first. Change the password after the first login (Account → Change password). Password-reset links for admin accounts go by email only and are never shown on screen.
- Admin accounts can't be suspended or deleted from the panel. Every action, including failed unlocks, goes to the **Audit log**.

Sections:
- **Overview**: members, sign-ups, revenue, open tickets, waiting chats, members by tier, recent payments.
- **Inbox**: *Tickets* (email enquiries; replies are emailed to the member) and *Live chats*. Multiverse members are flagged priority.
- **Members**: search, filter, change tier (complimentary upgrade), suspend (signs them out), delete.
- **Events**: create, edit or delete watch parties, using the venue's local time zone.
- **Community**: moderate Theory Board posts.
- **Announcements**: edit the top bar with a live preview.
- **Settings**: maintenance mode, sign-ups on/off, chat/assistant/handoff/tickets toggles, support email and hours, USD prices, company and legal details, trailer and poster, social links.
- **Audit log**.

Settings are stored in the `settings` table and served publicly from `GET /api/settings` (non-secret values only).

## Announcement bar
`src/components/AnnouncementBar.jsx` is a fixed 38px strip above the nav. It sets `--ab-h`, so the nav and page padding move down with it.
- *Rotate* mode shows one message at a time. Transitions are **flip** (3D rotateX cube), **slide**, **blur** (letter-spacing focus pull), **zoom** (flies in from depth and out through the camera) and **swing** (hangs from a strand and settles like a pendulum). **Mix** cycles through all of them.
- Each change also gets a light sheen sweep, a progress line that doubles as the timer (it pauses on hover or focus), and a drifting web-lattice texture behind the text.
- *Marquee* mode is a continuous scroll with spider separators and faded edges.
- Themes: Scarlet, Ink, Glass. Dismissal is remembered per device until the messages change. Under `prefers-reduced-motion` there is no auto-advance and no animation.

## Support tickets
- The Help-centre form creates a ticket for members and guests. It is rate-limited and has a honeypot field.
- The member gets a confirmation email: signed-in members see their tickets at `/tickets`, and guests get a private link (`?key=`, stored hashed).
- The admin gets an email notification and replies from Inbox → Tickets. The reply is emailed and shown on the ticket, and the member can answer back.

## Email
`server/mailer.js` sends through SMTP (nodemailer) when `SMTP_HOST` is set. Otherwise it prints mail to the server console.
For Gmail:
1. Turn on 2-Step Verification.
2. Create an App Password (Google Account → Security → App passwords).
3. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<address>`, `SMTP_PASS=<16-char app password>` and `MAIL_FROM="BND Fan Club <address>"`.

Members see the `MAIL_FROM` address on every email, so use a dedicated support mailbox rather than a personal one. Admin notifications go to `ADMIN_EMAILS`.

## Security (what's already done)
- Passwords: scrypt + per-user salt, constant-time compare.
- Sessions: random token in an httpOnly, SameSite=Lax cookie; only its SHA-256 is stored.
- CSRF: state-changing calls need JSON + the `x-bnd` header.
- Login: same error for wrong email or wrong password, dummy hash for unknown emails (no timing leak), rate limits per IP and per email.
- Forgot password: identical response whether or not the email exists; single-use token, 30-min expiry, hashed at rest; a new request kills older links; resetting signs out every device.

## Before going live
1. **Email**: set the `SMTP_*` variables (see Email), then set `DEMO_MODE=0` so password-reset links stop appearing on screen for members.
2. **Payments** — `server/payments.js` simulates each provider until `STRIPE_SECRET_KEY` / `PAYSTACK_SECRET_KEY` is set. Integration notes are in the file; only activate a tier after verifying the transaction (webhook signature check). Paid plans are monthly in copy but there's no recurring billing yet — use Stripe Billing / Paystack Plans.
5. **Domain** — set `VITE_SITE_URL` in `.env` (used in canonical/OG tags, robots.txt, sitemap.xml), then rebuild.
6. **Legal** — review `/privacy` and `/terms` (`src/pages/Legal.jsx`).
3. **HTTPS** — cookies become `Secure` automatically behind an HTTPS proxy (`trust proxy` is on).
4. **Hosting** — needs a Node host with a persistent disk for `data/club.db` (Render, Railway, Fly, a VPS). Not static-only hosting.

## Brand, metadata & icons
- `public/brand/spider-emblem.svg`, `public/brand/marvel-logo.svg` — vectors traced from the supplied logos. React components live in `src/components/Brand.jsx`.
- App icons (favicon.ico/svg, apple-touch, 192/512, maskable) and the 1200×630 `og-image.png` are generated from those (pre-built in `public/`).
- `index.html` has the title, description, canonical, Open Graph/Twitter tags, theme colour, manifest and JSON-LD. Each route updates its own title, description and canonical, and members-only pages get `noindex`.
- Icons: UI icons come from **lucide-react**, social glyphs from **simple-icons**. Don't mix in other icon sets.
- Motion (`src/components/Motion.jsx`): Reveal, Marquee, CountUp, Countdown, useSpotlight. All of it is CSS transform/opacity and turns off under reduced motion.

## New API endpoints
`GET /api/stats` · `GET /api/events/upcoming` · `GET /api/membership/quote?currency=` · `GET /api/account/export` · `POST /api/account/delete {password}` · `/robots.txt` · `/sitemap.xml`

## Debugging
- `DEBUG=1 npm start` logs every API request with status and timing.
- `npm run start:debug` does the same, plus the Node inspector on `:9229` (attach from Chrome `chrome://inspect` or VS Code).
- `GET /api/health` reports uptime, the payment mode and the mail mode.
- Mail without SMTP is printed to the console, including reset links, ticket notifications and replies.
- `?debug` on the home page shows the scroll film's live act gates, and `?beads=4000` lightens the bead cloud on slow GPUs.
- `npm run check` syntax-checks the server and builds the client.

## Testing
```bash
npm run build
DATA_DIR=/tmp/bnd-test npm start     # throwaway database
npx playwright install chromium      # first time only
npm run test:e2e
```
`tests/e2e.mjs` reads the admin credentials from `.env`. It checks:
- the announcement bar, USD prices and footer
- a guest ticket, the admin reply and the guest reply
- the hidden panel: 404 for guests and members, 404 from the admin API, no admin link, admin email can't be registered, no on-screen reset link for the admin
- unlock with a wrong and then the right password; overview, inbox and live chat
- member tier change, publishing an announcement, turning the chat off, the audit log and lock
- 390px layouts and console errors

Screenshots are saved to `tests/screens/` (git-ignored).

## Your content
- `src/content/film.js` — facts, synopsis, cast, timeline, `CINEMA_REGIONS`, `SOCIAL` handles, trivia, **`trailerYouTubeId`** and **`posterSrc`** slots for licensed media.
- `server/content/wallpapers.json`, `server/content/spoiler-vault.json` — gated content (placeholders now).
- `server/db.js` — sample watch parties (venues marked "TBC").
- `public/plate.png` — the figure the bead cloud is sampled from; swap in a licensed cut-out.

## Scroll film notes
`src/film.js` holds the film as pure functions of scroll; `?debug` shows live act gates.
It now measures progress on its own section, and skips rendering when scrolled past.
