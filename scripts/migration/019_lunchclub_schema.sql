-- Lunch Club module: isolated schema. Nothing in here references existing
-- convive2 tables and existing tables never reference these. Re-running this
-- migration is a no-op (IF NOT EXISTS everywhere).

CREATE SCHEMA IF NOT EXISTS lunchclub;

CREATE TABLE IF NOT EXISTS lunchclub.prospects (
  id                    bigserial PRIMARY KEY,
  source_guest_id       text UNIQUE NOT NULL,
  token                 text UNIQUE NOT NULL,
  first_name            text,
  last_name             text,
  email                 text,
  phone_clean           text,
  age_range             text,
  zip_code              text,
  dietary_restrictions  text[],
  dietary_notes         text,
  available_days_legacy text,
  curious_about         text,
  surprising_knowledge  text,
  what_do_you_do        text,
  about                 text,
  legacy_priority       text,
  contacted_at          timestamptz,
  signed_up             boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lunchclub.signups (
  id                    bigserial PRIMARY KEY,
  prospect_token        text,
  who_for               text NOT NULL DEFAULT 'self',
  buyer_name            text,
  buyer_email           text,
  buyer_phone           text,
  buyer_relationship    text,
  first_name            text,
  last_name             text,
  email                 text,
  phone                 text,
  zip_code              text,
  weekday_availability  text[],
  age_range             text,
  life_stage            text,
  solo_or_with          text,
  companion_name        text,
  comfort_notes         text,
  dietary_restrictions  text[],
  dietary_notes         text,
  q_career              text,
  q_chapter             text,
  q_curious             text,
  q_surprising          text,
  q_best_gathering      text,
  q_hopes               text,
  q_anything_else       text,
  source                text NOT NULL DEFAULT 'organic',
  arm                   text,
  status                text NOT NULL DEFAULT 'new',
  admin_note            text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
