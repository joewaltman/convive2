CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  dinner_id INTEGER NOT NULL REFERENCES dinners(id) ON DELETE RESTRICT,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE RESTRICT,
  grad_year INTEGER NOT NULL,
  major TEXT,
  brings_partner BOOLEAN NOT NULL DEFAULT false,
  seat_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  amount_paid_cents INTEGER,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  confirm_token TEXT NOT NULL UNIQUE,
  cancel_token TEXT NOT NULL UNIQUE,
  calendar_token TEXT NOT NULL UNIQUE,
  pending_expires_at TIMESTAMPTZ,
  waitlist_entry_id INTEGER,
  booked_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  post_dinner_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_guest ON reservations(guest_id);
CREATE INDEX idx_reservations_dinner ON reservations(dinner_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_confirm_token ON reservations(confirm_token);
CREATE INDEX idx_reservations_cancel_token ON reservations(cancel_token);
CREATE INDEX idx_reservations_calendar_token ON reservations(calendar_token);
CREATE INDEX idx_reservations_stripe_session ON reservations(stripe_checkout_session_id);
CREATE INDEX idx_reservations_pending_expires ON reservations(pending_expires_at)
  WHERE status = 'pending';
