-- ─── 1. Auto-grant admin to first joining member if no admin exists ───────────
-- Modify join_room to check for existing admins and grant admin role if none exist.

CREATE OR REPLACE FUNCTION join_room(p_room_id text, p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room record;
  v_invite_only boolean;
  v_admin_count integer;
BEGIN
  -- ── Case 1: Join by invite code ──────────────────────────────────────────
  IF p_invite_code IS NOT NULL AND p_invite_code <> '' THEN
    SELECT * INTO v_room FROM rooms WHERE invite_code = p_invite_code;
    IF NOT FOUND THEN
      RETURN json_build_object('found', false);
    END IF;

    -- Check if room has any admins
    SELECT COUNT(*) INTO v_admin_count
    FROM room_members
    WHERE room_id = v_room.id AND role = 'admin';

    -- Auto-grant admin if no admins exist
    IF v_admin_count = 0 THEN
      INSERT INTO room_members (room_id, user_id, role)
      VALUES (v_room.id, auth.uid(), 'admin')
      ON CONFLICT (room_id, user_id) DO UPDATE
        SET role = 'admin';
    ELSE
      INSERT INTO room_members (room_id, user_id, role)
      VALUES (v_room.id, auth.uid(), 'member')
      ON CONFLICT (room_id, user_id) DO NOTHING;
    END IF;

    -- Clear the invite code after successful use (one-time use)
    UPDATE rooms SET invite_code = NULL WHERE id = v_room.id;

    RETURN json_build_object('found', true, 'room_id', v_room.id);

  -- ── Case 2: Join by room ID (6-char code) ────────────────────────────────
  ELSIF p_room_id IS NOT NULL AND p_room_id <> '' THEN
    SELECT * INTO v_room FROM rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
      RETURN json_build_object('found', false);
    END IF;

    -- Check if room is invite-only
    v_invite_only := (v_room.invite_only IS NOT NULL AND v_room.invite_only = true);
    IF v_invite_only THEN
      RETURN json_build_object('found', false, 'error', 'invite_only');
    END IF;

    -- Check if room has any admins
    SELECT COUNT(*) INTO v_admin_count
    FROM room_members
    WHERE room_id = p_room_id AND role = 'admin';

    -- Auto-grant admin if no admins exist
    IF v_admin_count = 0 THEN
      INSERT INTO room_members (room_id, user_id, role)
      VALUES (p_room_id, auth.uid(), 'admin')
      ON CONFLICT (room_id, user_id) DO UPDATE
        SET role = 'admin';
    ELSE
      INSERT INTO room_members (room_id, user_id, role)
      VALUES (p_room_id, auth.uid(), 'member')
      ON CONFLICT (room_id, user_id) DO NOTHING;
    END IF;

    RETURN json_build_object('found', true, 'room_id', p_room_id);
  ELSE
    RETURN json_build_object('found', false, 'error', 'no_params');
  END IF;
END;
$$;

-- ─── 2. Add delete_room RPC (admin-only) ────────────────────────────────────
-- Deletes a room and all its associated data. ON DELETE CASCADE handles
-- room_members, members, expenses, budget_additions, balance_adjustments.

CREATE OR REPLACE FUNCTION delete_room(p_room_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count integer;
BEGIN
  -- Check if the caller is an admin of this room
  SELECT COUNT(*) INTO v_admin_count
  FROM room_members
  WHERE room_id = p_room_id AND user_id = auth.uid() AND role = 'admin';

  IF v_admin_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'only_admins_can_delete_a_room');
  END IF;

  -- ON DELETE CASCADE handles all child tables
  DELETE FROM rooms WHERE id = p_room_id;

  IF FOUND THEN
    RETURN json_build_object('success', true);
  ELSE
    RETURN json_build_object('success', false, 'error', 'room_not_found');
  END IF;
END;
$$;

-- ─── 3. Add quit_room RPC (any member can quit) ─────────────────────────────
-- Removes the calling user from the room.

CREATE OR REPLACE FUNCTION quit_room(p_room_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member integer;
  v_admin_count integer;
BEGIN
  -- Verify the user is a member of this room
  SELECT COUNT(*) INTO v_is_member
  FROM room_members
  WHERE room_id = p_room_id AND user_id = auth.uid();

  IF v_is_member = 0 THEN
    RETURN json_build_object('success', false, 'error', 'not_a_member');
  END IF;

  -- Count admins before removing
  SELECT COUNT(*) INTO v_admin_count
  FROM room_members
  WHERE room_id = p_room_id AND role = 'admin';

  DELETE FROM room_members
  WHERE room_id = p_room_id AND user_id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'was_last_admin', (v_admin_count = 1)
  );
END;
$$;
