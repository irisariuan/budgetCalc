-- Drop the broken policy
DROP POLICY IF EXISTS "rm_select" ON room_members;
DROP POLICY IF EXISTS "rm_insert_self" ON room_members;
DROP POLICY IF EXISTS "rm_delete_admin" ON room_members;

-- Recreate with non-recursive policies
CREATE POLICY "rm_select" ON room_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "rm_insert_self" ON room_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "rm_delete_self" ON room_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());
