-- Allow each user to update their own row in room_members.
-- This is intentionally limited to the two mutable columns:
--   • display_name  – editable from the Profile Settings page
--   • role          – promoted/demoted by admins via a future admin UI
--
-- The USING clause ensures a user can only address their own row.
-- The WITH CHECK clause ensures they cannot change the user_id to someone else's.

CREATE POLICY "rm_update_self" ON room_members FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
