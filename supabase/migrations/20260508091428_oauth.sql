-- ─── 1. listed column (if not already added) ──────────────────────────────────
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS listed boolean NOT NULL DEFAULT true;

-- ─── 2. room_members table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_members (
  room_id   text        NOT NULL REFERENCES rooms(id)      ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member'
                        CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- ─── 3. Enable RLS on every table ─────────────────────────────────────────────
ALTER TABLE rooms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_additions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_adjustments ENABLE ROW LEVEL SECURITY;

-- ─── 4. room_members policies ─────────────────────────────────────────────────
-- Any member can read the membership roster of rooms they belong to.
CREATE POLICY "rm_select" ON room_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM room_members rm2
      WHERE rm2.room_id = room_members.room_id
        AND rm2.user_id = auth.uid()
    )
  );
-- Only handled through join_room RPC (SECURITY DEFINER), but allow
-- self-inserts as a fallback for the admin path inside createRoom.
CREATE POLICY "rm_insert_self" ON room_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
-- Admins can remove members (kick).
CREATE POLICY "rm_delete_admin" ON room_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members rm2
      WHERE rm2.room_id = room_members.room_id
        AND rm2.user_id = auth.uid()
        AND rm2.role = 'admin'
    )
  );

-- ─── 5. rooms policies ────────────────────────────────────────────────────────
-- Listed rooms are discoverable by anyone authenticated (for the join screen).
CREATE POLICY "rooms_select_listed" ON rooms FOR SELECT TO authenticated
  USING (listed = true);
-- Members can always see their own rooms (even unlisted).
CREATE POLICY "rooms_select_member" ON rooms FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = rooms.id AND user_id = auth.uid()
    )
  );
-- Any authenticated user can create a room.
CREATE POLICY "rooms_insert" ON rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
-- Only admins can rename/update a room.
CREATE POLICY "rooms_update" ON rooms FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = rooms.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 6. Data-table policies (members / expenses / budget_additions / balance_adjustments)
-- Pattern: any room member can read and write; non-members see nothing.
CREATE POLICY "members_all" ON members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = members.room_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM room_members WHERE room_id = members.room_id AND user_id = auth.uid()));

CREATE POLICY "expenses_all" ON expenses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = expenses.room_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM room_members WHERE room_id = expenses.room_id AND user_id = auth.uid()));

CREATE POLICY "budget_additions_all" ON budget_additions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = budget_additions.room_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM room_members WHERE room_id = budget_additions.room_id AND user_id = auth.uid()));

CREATE POLICY "balance_adjustments_all" ON balance_adjustments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = balance_adjustments.room_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM room_members WHERE room_id = balance_adjustments.room_id AND user_id = auth.uid()));

-- ─── 7. join_room RPC ─────────────────────────────────────────────────────────
-- SECURITY DEFINER lets a non-member verify that a room code is valid and
-- add themselves, without needing direct SELECT on the rooms table.
CREATE OR REPLACE FUNCTION join_room(p_room_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rooms WHERE id = p_room_id) THEN
    RETURN json_build_object('found', false);
  END IF;

  INSERT INTO room_members (room_id, user_id, role)
  VALUES (p_room_id, auth.uid(), 'member')
  ON CONFLICT (room_id, user_id) DO NOTHING;

  RETURN json_build_object('found', true);
END;
$$;
