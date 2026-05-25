CREATE TABLE venues (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  venue_type TEXT NOT NULL CHECK (venue_type IN ('restaurant', 'event_space', 'home')),
  host_guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  google_maps_link TEXT,
  capacity_min INTEGER NOT NULL DEFAULT 6,
  capacity_max INTEGER NOT NULL DEFAULT 12,
  description TEXT,
  photo_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT home_requires_host CHECK (
    venue_type != 'home' OR host_guest_id IS NOT NULL
  )
);

CREATE INDEX idx_venues_type ON venues(venue_type);
CREATE INDEX idx_venues_active ON venues(is_active);
