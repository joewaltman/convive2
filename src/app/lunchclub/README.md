# Lunch Club

Recurring weekday lunches for small standing tables of 4-6. Sealed module:
all SQL lives in `src/lib/lunchclub/data.ts`, pages and route handlers never
reference schema-qualified table names.

## Environment variables

Required:

- `LUNCHCLUB_CRON_SECRET` — shared secret for cron HTTP triggers.
- `QUO_API_KEY` — OpenPhone API key.
- `QUO_FROM_PHONE` — Quo/OpenPhone send-from number (currently
  `+17602748830`). Must be E.164 (`+1...`).

Reused (already set elsewhere):

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_BASE_URL`
- `DATABASE_URL`
- `JOE_NOTIFICATION_EMAIL`

booking-cron service additionally reads:

- `LUNCHCLUB_CRON_URL` — defaults to
  `https://www.con-vive.com/api/admin/lunchclub/cron`.
- `LUNCHCLUB_CRON_SECRET` — same value as the app's secret.

## Stripe webhook

Lunch Club shares the existing Con-Vive Stripe webhook endpoint
(`/api/webhook/stripe`, signed with `STRIPE_WEBHOOK_SECRET`). No
separate endpoint or signing secret is needed.

The shared handler:

1. Verifies the signature once with `STRIPE_WEBHOOK_SECRET`.
2. Records the event id in the existing `processed_stripe_events`
   table for idempotency (shared with alumni).
3. For `checkout.session.completed`: if `session.metadata.module ===
   'lunchclub'`, dispatches to `handleLunchclubCheckoutCompleted` in
   `src/lib/lunchclub/webhook-handler.ts`. Otherwise the original
   alumni reservation flow runs.

The lunch-club checkout in
`src/app/api/lunchclub/book/[token]/checkout/route.ts` always sets
`metadata.module = 'lunchclub'` and `client_reference_id = bookingId`
so dispatch is unambiguous.

## Quo (OpenPhone)

`src/lib/sms/quo.ts` exposes `sendSms({ to, body })`. It POSTs to
`https://api.openphone.com/v1/messages` with `Authorization: <apiKey>`
(no `Bearer` prefix, matching the existing reactivation script). It
**never throws** — callers branch on `result.ok` so a Quo outage degrades
gracefully.

All guest SMS templates end with `\n\nThanks, Joe` and contain no em
dashes (admin-facing copy may still use em dashes).

## Cron jobs

Logic lives in `src/lib/lunchclub/cron/`:

| Job          | Entry                                | Notes                                                                       |
|--------------|--------------------------------------|-----------------------------------------------------------------------------|
| `nudge`      | `nudge.ts`                           | Invited-but-unpaid bookings ~24h before cutoff; one-shot per booking.       |
| `day-before` | `day-before-reminder.ts`             | Paid bookings whose lunch is tomorrow (LA); one-shot per booking.           |
| `below-floor`| `below-floor-cancel.ts`              | At cutoff: confirms or cancels-and-refunds based on the 4-paid-seat floor. |
| `monthly`    | `monthly-loop.ts`                    | Daily: closes past lunches, ticks non-pay counters, clones next week's lunch. |

Each is invoked through `POST /api/admin/lunchclub/cron/[job]`. Auth is
either a super-admin cookie session or an `x-cron-secret` request header
matching `LUNCHCLUB_CRON_SECRET`. Body is optional JSON `{ dryRun?,
limit? }`.

Manual run from a shell:

```bash
curl -X POST -H "x-cron-secret: $LUNCHCLUB_CRON_SECRET" \
  https://www.con-vive.com/api/admin/lunchclub/cron/nudge
```

Or just click the actions in the admin dashboard. The booking-cron Railway
service runs the schedules in `booking-cron/railway.toml`; its
`booking-cron/src/lunchclub/*.ts` entrypoints are tiny HTTP fetchers — they
import no lunchclub TypeScript, so the module stays sealed.

## Manual / out of scope

Mirroring the original product brief, the system intentionally does not
automate:

- Refund clicks beyond the 48-hour auto-policy.
- Permanent day/table switches for members.
- Venue reschedule rebooking.
- Plus-ones.
- The drifted-seat check-in calendar.
- Stripe disputes / chargebacks.
- Duplicate / blank-zip data hygiene.

## Deferred to v2 (do not build yet)

- Self-select-day booking.
- Subscription billing.
- Automated waitlist promotion.
- Complex refund engine.
