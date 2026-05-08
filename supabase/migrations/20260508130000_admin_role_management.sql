-- ─── Fix rm_update_self: prevent users from escalating their own role ──────────
--
-- The previous rm_update_self policy allows users to update any column on their
-- own row, including `role`. We fix this by:
--   1. Revoking the blanket UPDATE privilege on room_members from authenticated.
--   2. Re-granting UPDATE only on the display_name column.
-- The rm_update_self RLS policy continues to scope updates to the caller's row.

REVOKE UPDATE ON room_members FROM authenticated;
GRANT  UPDATE (display_name) ON room_members TO authenticated;

-- ─── set_member_role RPC ──────────────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS so we can update role without needing a
-- broad UPDATE grant.  All authorization is enforced inside the function.

CREATE OR REPLACE FUNCTION set_member_role(
  p_room_id        text,
  p_target_user_id uuid,
  p_role           text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_admin_count int;
BEGIN
  -- Validate role value
  IF p_role NOT IN ('admin', 'member') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_role');
  END IF;

  -- Caller must be an admin of this room
  SELECT role INTO v_caller_role
  FROM room_members
  WHERE room_id = p_room_id
    AND user_id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'not_admin');
  END IF;

  -- Admins cannot change their own role through this function
  IF p_target_user_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'cannot_change_own_role');
  END IF;

  -- Guard: prevent demoting the last admin
  IF p_role = 'member' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM room_members
    WHERE room_id = p_room_id
      AND role = 'admin';

    IF v_admin_count <= 1 THEN
      RETURN json_build_object('success', false, 'error', 'last_admin');
    END IF;
  END IF;

  -- Apply the role change
  UPDATE room_members
  SET role = p_role
  WHERE room_id = p_room_id
    AND user_id = p_target_user_id;

  RETURN json_build_object('success', true);
END;
$$;
