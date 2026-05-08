
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
    IF v_invite_only AND NOT EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = p_room_id AND user_id = auth.uid()
    ) THEN
      -- Allow existing members to rejoin
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
