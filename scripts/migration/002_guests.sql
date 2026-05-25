CREATE TABLE guests (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  what_do_you_do TEXT,
  dietary_restrictions TEXT[] NOT NULL DEFAULT '{}',
  dietary_notes TEXT,
  email_unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_trailing_whitespace_first CHECK (first_name = trim(first_name)),
  CONSTRAINT no_trailing_whitespace_last  CHECK (last_name  = trim(last_name)),
  CONSTRAINT no_trailing_whitespace_email CHECK (email = trim(email))
);

CREATE UNIQUE INDEX idx_guests_email_lower ON guests(LOWER(email));
