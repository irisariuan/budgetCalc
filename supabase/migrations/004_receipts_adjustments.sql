-- ============================================================
-- 004_receipts_adjustments.sql  –  Allow multiple receipt_url to expenses
-- ============================================================

-- Alter receipt_url column to existing expenses table
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_url TEXT ARRAY DEFAULT ARRAY[];
