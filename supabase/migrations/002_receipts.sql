-- ============================================================
-- 002_receipts.sql  –  Add receipt_url to expenses + Storage bucket
-- ============================================================

-- Add receipt_url column to existing expenses table
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- ============================================================
-- Supabase Storage bucket setup
-- ============================================================
-- Run this in the Supabase SQL editor OR create the bucket
-- manually in Storage → New bucket:
--
--   Name:    receipts
--   Public:  true (so CDN URLs work without signed tokens)
--
-- Then add this storage policy (also available in the dashboard
-- under Storage → Policies):

-- Allow anyone to upload to the receipts bucket
-- (scoped by room so paths are: {roomId}/{expenseId}.{ext})
-- INSERT POLICY
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'receipts: allow public upload'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "receipts: allow public upload"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'receipts')
    $policy$;
  END IF;
END $$;

-- Allow anyone to read from the receipts bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'receipts: allow public read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "receipts: allow public read"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'receipts')
    $policy$;
  END IF;
END $$;

-- Allow anyone to delete from the receipts bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'receipts: allow public delete'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "receipts: allow public delete"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'receipts')
    $policy$;
  END IF;
END $$;
