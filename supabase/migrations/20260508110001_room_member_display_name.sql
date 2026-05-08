-- ─── Add display_name to room_members ─────────────────────────────────────────
-- Stores the participant's display name at join time, derived from auth.users.
-- A BEFORE INSERT trigger auto-populates it so no call-site changes are needed.

ALTER TABLE room_members
  ADD COLUMN IF NOT EXISTS display_name text;

-- ─── Trigger function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fill_room_member_display_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    email,
    'Anonymous'
  )
  INTO NEW.display_name
  FROM auth.users
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER room_member_fill_display_name
BEFORE INSERT ON room_members
FOR EACH ROW
WHEN (NEW.display_name IS NULL)
EXECUTE FUNCTION fill_room_member_display_name();

-- ─── Backfill existing rows ───────────────────────────────────────────────────
UPDATE room_members rm
SET display_name = COALESCE(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name',
  u.email,
  'Anonymous'
)
FROM auth.users u
WHERE u.id = rm.user_id
  AND rm.display_name IS NULL;
