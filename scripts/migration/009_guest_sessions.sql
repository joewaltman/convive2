CREATE TABLE guest_sessions (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_sessions_token ON guest_sessions(token_hash);
CREATE INDEX idx_guest_sessions_guest ON guest_sessions(guest_id);
CREATE INDEX idx_guest_sessions_expires ON guest_sessions(expires_at);
