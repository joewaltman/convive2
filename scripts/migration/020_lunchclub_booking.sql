-- Lunch Club booking + payment + cancellation tables. All FKs stay inside
-- the `lunchclub` schema. Idempotent (CREATE TABLE IF NOT EXISTS,
-- guarded CREATE INDEX). Run after 019_lunchclub_schema.sql.

CREATE TABLE IF NOT EXISTS lunchclub.standing_tables (
  id              bigserial PRIMARY KEY,
  name            text NOT NULL,
  day_of_week     smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  area            text,
  default_venue   text,
  default_address text,
  status          text NOT NULL DEFAULT 'forming'
                  CHECK (status IN ('forming','active','paused')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lunchclub.table_members (
  id                  bigserial PRIMARY KEY,
  standing_table_id   bigint NOT NULL REFERENCES lunchclub.standing_tables(id),
  signup_id           bigint NOT NULL REFERENCES lunchclub.signups(id),
  seats               smallint NOT NULL DEFAULT 1 CHECK (seats IN (1,2)),
  status              text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','released')),
  consecutive_unpaid  int NOT NULL DEFAULT 0,
  joined_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (standing_table_id, signup_id)
);

CREATE TABLE IF NOT EXISTS lunchclub.lunches (
  id                   bigserial PRIMARY KEY,
  standing_table_id    bigint NOT NULL REFERENCES lunchclub.standing_tables(id),
  venue                text NOT NULL,
  address              text NOT NULL,
  lunch_date           date NOT NULL,
  start_time           time NOT NULL,
  starts_at            timestamptz GENERATED ALWAYS AS
                       ((lunch_date::timestamp + start_time) AT TIME ZONE 'America/Los_Angeles') STORED,
  price_cents          int NOT NULL,
  total_seats          int NOT NULL DEFAULT 6,
  booking_cutoff_at    timestamptz NOT NULL,
  menu                 text,
  status               text NOT NULL DEFAULT 'tentative'
                       CHECK (status IN ('tentative','confirmed','cancelled','completed')),
  non_pay_processed_at timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (standing_table_id, lunch_date)
);
CREATE INDEX IF NOT EXISTS idx_lunches_cutoff ON lunchclub.lunches (booking_cutoff_at)
  WHERE status IN ('tentative','confirmed');

CREATE TABLE IF NOT EXISTS lunchclub.bookings (
  id                       bigserial PRIMARY KEY,
  lunch_id                 bigint NOT NULL REFERENCES lunchclub.lunches(id),
  signup_id                bigint NOT NULL REFERENCES lunchclub.signups(id),
  table_member_id          bigint REFERENCES lunchclub.table_members(id),
  seats                    smallint NOT NULL DEFAULT 1 CHECK (seats IN (1,2)),
  status                   text NOT NULL DEFAULT 'invited'
                           CHECK (status IN ('invited','checkout_pending','paid','cancelled','refunded')),
  magic_token              text NOT NULL UNIQUE,
  stripe_session_id        text UNIQUE,
  stripe_payment_intent_id text,
  refund_id                text,
  amount_cents             int,
  invited_at               timestamptz NOT NULL DEFAULT now(),
  paid_at                  timestamptz,
  reminder_sent_at         timestamptz,
  nudge_sent_at            timestamptz,
  cancelled_at             timestamptz,
  refunded_at              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lunch_id, signup_id)
);
CREATE INDEX IF NOT EXISTS idx_bookings_lunch_status ON lunchclub.bookings (lunch_id, status);

-- Stripe webhook idempotency is shared with alumni via the top-level
-- public.processed_stripe_events table (see /api/webhook/stripe). No
-- lunchclub-specific table needed.
