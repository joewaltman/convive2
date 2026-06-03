-- Multi-photo gallery per venue.
--
-- venue_photos stores zero or more photos per venue with explicit ordering
-- and optional captions. The legacy venues.photo_url column is kept as a
-- fallback so existing data continues to render without a hard dependency
-- on backfill timing.

CREATE TABLE venue_photos (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venue_photos_venue_order
  ON venue_photos(venue_id, sort_order, id);

-- Backfill from the legacy single-photo column.
INSERT INTO venue_photos (venue_id, url, sort_order)
SELECT id, photo_url, 0
FROM venues
WHERE photo_url IS NOT NULL;
