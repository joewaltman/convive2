CREATE TABLE dinners (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE RESTRICT,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  total_seats INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  host_payout_cents INTEGER,
  menu TEXT,
  description TEXT,
  parking_note TEXT,
  booking_cutoff_at TIMESTAMPTZ,
  allows_couples BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'sold_out', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dinners_chapter ON dinners(chapter_id);
CREATE INDEX idx_dinners_status ON dinners(status);
CREATE INDEX idx_dinners_starts_at ON dinners(starts_at);
