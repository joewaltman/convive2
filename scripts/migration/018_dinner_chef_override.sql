-- Per-dinner chef override. NULL means inherit from the venue.

ALTER TABLE dinners
  ADD COLUMN chef_name TEXT,
  ADD COLUMN about_chef TEXT;
