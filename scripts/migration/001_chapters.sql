CREATE TABLE chapters (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  tagline TEXT,
  from_display_name TEXT NOT NULL,
  color_primary TEXT NOT NULL,
  color_secondary TEXT NOT NULL,
  color_header_bg TEXT NOT NULL,
  color_header_text TEXT NOT NULL,
  color_accent TEXT NOT NULL,
  font_family TEXT NOT NULL DEFAULT 'Inter, system-ui, sans-serif',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chapters_slug ON chapters(slug);
CREATE INDEX idx_chapters_active ON chapters(is_active);
