-- ─── Fix room_members RLS ──────────────────────────────────────────────────────
--
-- Problem 1 (rm_select):
--   oauth_fix simplified the SELECT policy to `user_id = auth.uid()` to avoid
--   an infinite-recursion crash (the original policy queried room_members inside
--   its own USING clause). This makes every user see only their own row, so the
--   member roster always appears as a single entry.
--
-- Problem 2 (rm_delete):
--   The same migration replaced the admin-kick DELETE policy with a self-only
--   policy, breaking the kick functionality.
--
-- Problem 3 (realtime):
--   room_members was never added to supabase_realtime, so INSERT/DELETE events
--   on the table are never broadcast to subscribed clients.
--
-- Fix: SECURITY DEFINER helper functions bypass the table's own RLS when called,
-- breaking the recursive loop while still enforcing the intended access rules.

-- ─── Helper: is the calling user a member of the given room? ──────────────────
CREATE OR REPLACE FUNCTION auth_uid_is_room_member(p_room_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM room_members
    WHERE room_id = p_room_id
      AND user_id = auth.uid()
  );
$$;

-- ─── Helper: is the calling user an admin of the given room? ─────────────────
CREATE OR REPLACE FUNCTION auth_uid_is_room_admin(p_room_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM room_members
    WHERE room_id = p_room_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ─── Fix SELECT: show all rows for rooms the caller belongs to ────────────────
DROP POLICY IF EXISTS "rm_select" ON room_members;
CREATE POLICY "rm_select" ON room_members FOR SELECT TO authenticated
  USING (auth_uid_is_room_member(room_id));

-- ─── Fix DELETE: allow self-leave AND admin kick ──────────────────────────────
DROP POLICY IF EXISTS "rm_delete_self"  ON room_members;
DROP POLICY IF EXISTS "rm_delete_admin" ON room_members;
CREATE POLICY "rm_delete" ON room_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()                -- member leaves themselves
    OR auth_uid_is_room_admin(room_id)  -- admin kicks someone else
  );

-- ─── Add room_members to realtime so INSERT/DELETE are broadcast ──────────────
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.room_members;
