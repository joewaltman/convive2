# Con-Vive

White-labeled alumni chapter dinner platform. Con-Vive (operator) runs all logistics; partner alumni chapters get private, white-labeled landing pages where members book a seat at a curated dinner. Members never see Con-Vive branding.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4
- PostgreSQL via `pg` (raw SQL, no ORM)
- Stripe (single account, API version `2025-09-30.clover`)
- Resend + React Email
- date-fns / date-fns-tz (all dinner times stored UTC, rendered America/Los_Angeles)
- Jest + ts-jest

The repo has two services:

| Path | Service | Purpose |
| --- | --- | --- |
| `/` (root) | `convive2` Next.js app | Web app: public site, white-label chapter pages, admin, guest auth, Stripe webhook |
| `booking-cron/` | `convive-booking-cron` Node service | Scheduled jobs (reminders, post-dinner, waitlist sweep, pending-expiry) |

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Stripe CLI (for local webhook testing)
- A Resend API key + verified sending domain (`invite.con-vive.com` in production)

## First-time setup

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env.local
# Fill in DATABASE_URL, STRIPE_*, RESEND_API_KEY, ADMIN_EMAILS, etc.

# 3. Run migrations (creates schema + seeds Cal/USC/UVA)
npm run migrate

# 4. Start dev server
npm run dev
```

The app boots at <http://localhost:3000>.

### Booking-cron service

```bash
cd booking-cron
npm install
npm run build            # produces dist/
node dist/run-all.js     # runs all four jobs once
```

## Environment variables

All vars are documented in `.env.example`. Summary:

| Var | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Single Postgres instance, shared by web + cron |
| `ADMIN_EMAILS` | yes | Comma-separated lowercased emails; super-admin allowlist |
| `STRIPE_SECRET_KEY` | yes | `sk_test_*` for dev, `sk_live_*` in prod |
| `STRIPE_WEBHOOK_SECRET` | yes | From `stripe listen` or Stripe Dashboard |
| `RESEND_API_KEY` | yes | `re_*` |
| `EMAIL_FROM_DEFAULT` | yes | Platform-tagged sends, e.g. `Con-Vive <noreply@invite.con-vive.com>` |
| `EMAIL_FROM_DOMAIN` | yes | Bare domain, e.g. `invite.con-vive.com`. Used to build per-chapter From addresses. |
| `EMAIL_REPLY_TO` | yes | All sends Reply-To this. |
| `JOE_NOTIFICATION_EMAIL` | yes | Internal lead/cancel/failure notifications. |
| `NEXT_PUBLIC_BASE_URL` | yes | Public origin (`https://con-vive.com` or `http://localhost:3000`) |
| `CALENDLY_URL` | optional | Homepage "Talk to us" button. |
| `TEST_DATABASE_URL` | optional | Enables DB-integration tests. |

## Scripts

```bash
npm run dev        # Next.js dev server
npm run build      # Next.js production build
npm start          # Production server
npm run lint       # tsc --noEmit (strict TypeScript)
npm run migrate    # Apply pending SQL migrations from scripts/migration/
npm test           # Jest (node + dom projects)
```

## Database

Migrations live in `scripts/migration/`, numerically prefixed. The runner (`scripts/migration/run-migrations.ts`) records applied filenames in a `migrations` table and applies each new file inside its own transaction.

To add a migration: create `scripts/migration/015_my_change.sql` and run `npm run migrate`.

Seed data ships with `014_seed_chapters.sql` (Cal, USC, UVA) using stable hand-chosen slug/colors.

## Stripe webhooks (local dev)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhook/stripe
# Copy the printed `whsec_*` into STRIPE_WEBHOOK_SECRET
```

The webhook handler at `src/app/api/webhook/stripe/route.ts` is idempotent: it inserts the event ID into `processed_stripe_events` with `ON CONFLICT DO NOTHING` before touching reservation state, so Stripe retries are safe.

## Auth model

Two independent magic-code systems:

- **Guest**: cookie `cv_session`, 180 days, table `guest_sessions`. Required for booking, `/my-dinners`, waitlist join.
- **Admin (super-admin)**: cookie `cv_admin_session`, 14 days, table `admin_sessions`. Allowlisted via `ADMIN_EMAILS`. Gates `/admin/*` and `/api/admin/*` via `src/middleware.ts`.

Sessions store SHA-256 of a 32-byte random token; only the hash lives in the DB.

## Cron jobs

The `booking-cron/` service runs four jobs, each wrapped in `runCronJob` (advisory lock + `cron_runs` row + email-on-failure):

| Job | Frequency | What it does |
| --- | --- | --- |
| `send-reminders` | Daily 17:00 UTC (~9am PT) | Confirmed reservations whose dinner is tomorrow PT; idempotent via `reminder_sent_at` |
| `send-post-dinner` | Daily 17:00 UTC | Confirmed reservations whose dinner was yesterday PT; idempotent via `post_dinner_sent_at` |
| `process-waitlist` | Every 15 min | Expire 24h-stale promoted entries, cascade-promote next pending |
| `expire-pending-reservations` | Every 15 min | Sweep non-waitlist pendings past `pending_expires_at` |

The admin dashboard exposes a "Run now" button per job at `/admin/system`, hitting `POST /api/admin/cron/[job]` which runs the **same** code path (`src/lib/cron-jobs/*`) the cron service uses.

## Privacy rules

- Public dinner cards show only city + venue type + restaurant/event-space name.
- Detail pages for home venues show host first name + grad year only.
- Full street address only appears in the confirmation email, the `/my-dinners` view for the confirmed guest, and the `.ics` download — never in any public-facing page.

## Hard rules (apply throughout)

- **No em dashes** in any user-facing copy. Use commas, periods, or rewrite.
- **No emojis.**
- **No school logos / trademarks.**
- All dinner timestamps are TIMESTAMPTZ UTC. Every render goes through `formatLAClock` (or `formatLADate` / `formatLATime`) from `src/lib/time.ts`.
- **Three distinct reservation tokens** (`confirm_token`, `cancel_token`, `calendar_token`); never reuse across purposes.
- **All string inputs trimmed** before insert; CHECK constraints on `guests` enforce this defensively.
- **No automated refunds.** Cancellation emails Joe; the guest is told refund is manual within 2 business days.
- **No LLM/AI calls.** The reminder "who else is coming" block is deterministic via an LCG seeded by `dinnerId * 10000 + recipientGuestId`.
- **Chapter pages render zero Con-Vive branding.** Footer says exactly: "Questions? Contact your chapter coordinator."
- **Single Stripe account.** No Connect.
- **Single sending domain** `invite.con-vive.com`. Per-chapter From display name only (e.g., `Cal Alumni Dinners <dinners@invite.con-vive.com>`).

## Testing

```bash
npm test                                # Run all (DB tests skip if TEST_DATABASE_URL unset)
TEST_DATABASE_URL=postgres://... npm test   # Full suite including data-integrity + capacity-race
```

Tests live in `__tests__/`. See `__tests__/README.md` (if present) or each file's docstring for what it covers.

## Deployment (Railway)

Two services, both on Railway, sharing the same Postgres plugin:

1. **Web service** — root of repo, builds with `npm run build`, serves with `npm start`. Env vars from the table above. Webhook URL: `https://<your-domain>/api/webhook/stripe`.
2. **Cron service** — `booking-cron/` directory. Build command `npm install && npm run build`. Schedules defined in `booking-cron/railway.toml`.

After deploy:
- Add the Resend domain in Resend dashboard, verify DNS records on `invite.con-vive.com`.
- Configure Stripe webhook in the Stripe Dashboard, copy `whsec_*` to the web service env.
- Log in as a super-admin (any email in `ADMIN_EMAILS`) at `/admin/login`.

## Repository layout

```
.
├── booking-cron/              # Standalone Node service (Railway cron)
│   ├── src/
│   │   ├── lib/               # Self-contained copies of db, email, calendar, etc.
│   │   ├── emails/            # Email templates used by cron jobs
│   │   ├── send-reminders.ts
│   │   ├── send-post-dinner.ts
│   │   ├── process-waitlist.ts
│   │   ├── expire-pending-reservations.ts
│   │   └── run-all.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── railway.toml
├── scripts/migration/         # SQL migrations + runner
├── src/
│   ├── app/
│   │   ├── page.tsx           # Public homepage (B2B pitch)
│   │   ├── alumni/[chapter]/  # White-labeled chapter pages
│   │   ├── admin/             # Operator dashboard (super-admin only)
│   │   ├── api/               # All HTTP endpoints
│   │   ├── login/             # Guest magic-code login
│   │   ├── my-dinners/        # Guest's reservations
│   │   ├── cancel/[token]/    # Token-gated cancellation
│   │   └── unsubscribe/[id]/  # Email unsubscribe
│   ├── components/booking/    # Multi-step BookingFlow client component
│   ├── emails/                # React Email templates
│   ├── lib/
│   │   ├── auth/              # Guest + admin auth helpers
│   │   ├── cron-jobs/         # Job bodies invoked by /api/admin/cron/* and cron service
│   │   ├── types/             # Shared TS interfaces
│   │   ├── db.ts, time.ts, tokens.ts, stripe.ts, email.ts, calendar.ts
│   │   ├── chapters.ts, dinners.ts, venues.ts, guests.ts, leads.ts
│   │   ├── reservations.ts, waitlist.ts, reminder-companions.ts
│   │   ├── runCron.ts, cron-locks.ts
│   │   └── ...
│   └── middleware.ts          # Admin route gate
├── __tests__/                 # Jest tests
├── public/                    # hero.svg, joe.svg, venue-placeholder.svg
├── jest.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```
