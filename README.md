# BRAND NEW DAY — Fan Club

A scroll-driven 3D fan experience and community platform built with React Three Fiber, Express, and SQLite.

## Quick start

```bash
cp .env.example .env
npm install
npm run build
npm start
```

Requires **Node 20+**.

## Features

- Scroll-driven 3D film experience, cast, trailer, timeline, and cinema listings
- Accounts, password reset, data export, and account deletion
- Membership tiers with Stripe/Paystack integration points
- Member dashboard, theories, trivia, watch parties, and wallpapers
- Live support chat, human handoff, and support tickets
- Protected admin panel for members, events, community, announcements, settings, and audit logs

## Development

```bash
npm run dev       # Vite + API
npm run check     # syntax check + production build
npm run test:e2e  # Playwright tests
```

## Configuration

Copy `.env.example` to `.env`. Key settings include:

- `ADMIN_EMAILS`, `ADMIN_PATH`, `ADMIN_INITIAL_PASSWORD`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- `STRIPE_SECRET_KEY` / `PAYSTACK_SECRET_KEY`
- `VITE_SITE_URL`
- `DATA_DIR` for SQLite storage

For production, use HTTPS, persistent storage, working email/payment credentials, and `DEMO_MODE=0`.
