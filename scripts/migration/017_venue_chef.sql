-- Chef defaults on the venue.

ALTER TABLE venues
  ADD COLUMN chef_name TEXT,
  ADD COLUMN about_chef TEXT;
