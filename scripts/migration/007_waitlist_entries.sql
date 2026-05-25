CREATE TABLE waitlist_entries (
  id SERIAL PRIMARY KEY,
  dinner_id INTEGER NOT NULL REFERENCES dinners(id) ON DELETE RESTRICT,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE RESTRICT,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'promoted', 'expired', 'cancelled')),
  promoted_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waitlist_dinner ON waitlist_entries(dinner_id);
CREATE INDEX idx_waitlist_guest ON waitlist_entries(guest_id);
CREATE INDEX idx_waitlist_status ON waitlist_entries(status);

CREATE UNIQUE INDEX idx_waitlist_one_active_per_guest_per_dinner
  ON waitlist_entries(dinner_id, guest_id)
  WHERE status IN ('pending', 'promoted');

ALTER TABLE reservations
  ADD CONSTRAINT fk_reservations_waitlist_entry
  FOREIGN KEY (waitlist_entry_id) REFERENCES waitlist_entries(id) ON DELETE SET NULL;
