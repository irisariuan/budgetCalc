ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS invite_only boolean NOT NULL DEFAULT false;
