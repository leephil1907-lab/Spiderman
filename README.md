# BRAND NEW DAY — Fan Club

A scroll-driven 3D film (React Three Fiber) plus a full fan-club site (Express + SQLite).

## Quick start
```bash
cp .env.example .env   # fill it in, never commit it
npm install
npm run build
npm start              # http://localhost:3001
npm run dev            # hot reload (API :3001, Vite :5173)
```
Requires Node 20+. Data is stored in `data/`; change it with `DATA_DIR=`.

## Features
- **Film and info:** scroll film, cast, trailer, timeline and cinemas by region.
- **Accounts:** sign up, log in, password reset, data export and account deletion.
- **Membership:** four tiers in USD (Free, $4.99, $9.99, $19.99 a month; yearly saves about 17%). Checkout is simulated until `STRIPE_SECRET_KEY` or `PAYSTACK_SECRET_KEY` is set.
- **Members:** personal dashboard and Club area (Theory Board, trivia, watch parties, wallpapers).
- **Support:** draggable live chat with an assistant and human handoff, and support tickets (`/help`, `/tickets`).
- **Announcement bar:** rotate mode (flip, slide, blur, zoom, swing, or mix) or marquee mode, managed from the admin panel.

## Admin panel
Not linked anywhere on the site. To open it:
1. Log in as an `ADMIN_EMAILS` account.
2. Visit `ADMIN_PATH`.
3. Re-enter your password. Unlocking lasts 30 minutes.

Everyone else gets a 404, both on the page and on the admin API. The admin account is created on first start from `ADMIN_INITIAL_PASSWORD`; change that password after logging in.

Sections: Overview · Inbox (tickets and chats) · Members · Events · Community · Announcements · Settings · Audit log.

## Environment
| Variable | Purpose |
|---|---|
| `ADMIN_EMAILS`, `ADMIN_PATH`, `ADMIN_INITIAL_PASSWORD` | Admin access (server-only) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Email. For Gmail use `smtp.gmail.com`, port 465 and an App Password. Without these, mail is logged to the console. |
| `PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY`, `PAYSTACK_SECRET_KEY` | Payments |
| `VITE_SITE_URL` | Public URL used in SEO tags; rebuild after changing it |
| `DEMO_MODE=0` | Stop showing reset links on screen (set this once email works) |
| `DEBUG=1` | Log every API request |

## Debug and test
```bash
npm run start:debug             # request logs + Node inspector on :9229
curl localhost:3001/api/health
npm run check                   # syntax-check the server and build
DATA_DIR=/tmp/bnd-test npm start && npm run test:e2e   # Playwright end-to-end tests
```

## Before launch
- Set up SMTP and `DEMO_MODE=0`.
- Add the payment keys and verify payments with webhooks.
- Set `VITE_SITE_URL`.
- Have a lawyer review `/privacy` and `/terms`.
- Host on a Node server with a persistent disk, behind HTTPS.
