-- ─── Update join_room RPC to enforce invite_only and clear invite codes ────────

CREATE OR REPLACE FUNCTION join_room(p_room_id text, p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room record;
  v_invite_only boolean;
BEGIN
  -- ── Case 1: Join by invite code ──────────────────────────────────────────
  IF p_invite_code IS NOT NULL AND p_invite_code <> '' THEN
    SELECT * INTO v_room FROM rooms WHERE invite_code = p_invite_code;
    IF NOT FOUND THEN
      RETURN json_build_object('found', false);
    END IF;

    INSERT INTO room_members (room_id, user_id, role)
    VALUES (v_room.id, auth.uid(), 'member')
    ON CONFLICT (room_id, user_id) DO NOTHING;

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

    INSERT INTO room_members (room_id, user_id, role)
    VALUES (p_room_id, auth.uid(), 'member')
    ON CONFLICT (room_id, user_id) DO NOTHING;

    RETURN json_build_object('found', true, 'room_id', p_room_id);
  ELSE
    RETURN json_build_object('found', false, 'error', 'no_params');
  END IF;
END;
$$;
