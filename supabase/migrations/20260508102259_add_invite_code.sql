-- Add invite_code column to rooms table (was missing from previous migrations)
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS invite_code text;
