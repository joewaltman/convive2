CREATE TABLE auth_codes (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('guest', 'admin')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_codes_email_purpose ON auth_codes(LOWER(email), purpose);
CREATE INDEX idx_auth_codes_expires ON auth_codes(expires_at);
