CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_admin_users_email_lower ON admin_users(LOWER(email));
CREATE INDEX idx_admin_users_chapter ON admin_users(chapter_id);
