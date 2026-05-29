-- Post-dinner survey support.
--
-- 1. survey_token on reservations: an opaque, per-reservation token used in
--    the post-dinner survey email link. Nullable column; existing rows are
--    backfilled and new rows are populated by the application code.
-- 2. dinner_surveys: stores submitted survey responses. One row per
--    reservation (UNIQUE constraint), with three 1-5 ratings and optional
--    free-text feedback.

ALTER TABLE reservations
  ADD COLUMN survey_token TEXT;

-- Backfill existing rows with random URL-safe tokens (gen_random_uuid is
-- built into Postgres 13+).
UPDATE reservations
SET survey_token = replace(gen_random_uuid()::text, '-', '')
                || replace(gen_random_uuid()::text, '-', '')
WHERE survey_token IS NULL;

ALTER TABLE reservations
  ALTER COLUMN survey_token SET NOT NULL,
  ADD CONSTRAINT reservations_survey_token_key UNIQUE (survey_token);

CREATE INDEX idx_reservations_survey_token ON reservations(survey_token);

CREATE TABLE dinner_surveys (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
  dinner_id INTEGER NOT NULL REFERENCES dinners(id) ON DELETE CASCADE,
  venue_rating INTEGER NOT NULL CHECK (venue_rating BETWEEN 1 AND 5),
  food_rating INTEGER NOT NULL CHECK (food_rating BETWEEN 1 AND 5),
  value_rating INTEGER NOT NULL CHECK (value_rating BETWEEN 1 AND 5),
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dinner_surveys_dinner ON dinner_surveys(dinner_id);
