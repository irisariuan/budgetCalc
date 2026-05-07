-- ============================================================
-- 003_balance_adjustments.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS balance_adjustments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     TEXT        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  member_id   UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount      NUMERIC     NOT NULL,  -- positive = credit, negative = debit
  description TEXT        NOT NULL,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS balance_adjustments_room_id_idx  ON balance_adjustments(room_id);
CREATE INDEX IF NOT EXISTS balance_adjustments_member_id_idx ON balance_adjustments(member_id);
CREATE INDEX IF NOT EXISTS balance_adjustments_date_idx      ON balance_adjustments(date);

ALTER TABLE balance_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "balance_adjustments: allow all" ON balance_adjustments FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE balance_adjustments;
