# Lunch Club scripts

Self-contained data layer for the Lunch Club module. Everything lives in the
Postgres `lunchclub` schema and never touches existing convive2 tables.

## Environment

- `DATABASE_URL` — TARGET (the convive2 Postgres where `lunchclub.*` lives).
- `SOURCE_DATABASE_URL` — SOURCE (the legacy con-vive Postgres). Read-only.

Both URLs are read from the environment. Do not hardcode them. The SOURCE
database is never written to.

## Run order

1. **Migration.** Create the `lunchclub` schema and tables in TARGET.
   ```bash
   DATABASE_URL='postgresql://...convive2...' npm run migrate
   ```
   The runner is idempotent; subsequent runs report `0 new migration(s) applied.`

2. **Archive SOURCE.** Dump every table in SOURCE to `./archive/<schema>__<table>.csv`.
   ```bash
   SOURCE_DATABASE_URL='postgresql://...legacy...' \
     npx ts-node --transpile-only scripts/lunchclub/archive.ts
   ```
   The `archive/` directory is gitignored. Keep these CSVs backed up somewhere
   safe — they are your full-fidelity copy of the legacy data.

3. **Harvest.** Upsert legacy guests into `lunchclub.prospects`. Idempotent on
   `source_guest_id`; the per-prospect `token` is generated on first insert
   and preserved on subsequent runs.
   ```bash
   SOURCE_DATABASE_URL='postgresql://...legacy...' \
     DATABASE_URL='postgresql://...convive2...' \
     npx ts-node --transpile-only scripts/lunchclub/harvest.ts
   ```
   The script prints inserted/updated counts and a verification summary.

## What gets harvested

- SOURCE filter: any `public.guests` row with a non-empty `phone_clean`.
- Mapped straight across: `first_name`, `last_name`, `email`, `phone_clean`,
  `age_range`, `zip_code`, `dietary_restrictions`, `dietary_notes`,
  `curious_about`, `surprising_knowledge`, `what_do_you_do`, `about`.
- Renamed: `priority` → `legacy_priority`.
- Auto-detected: the first column matching `available_days`, `availability`,
  `available_weeknights`, `available_evenings`, or `weeknight_availability`
  (or any column whose name starts with `avail`) is copied into
  `available_days_legacy`. The script prints which one it matched.
- Intentionally NOT copied: the legacy `one_thing` column.
