ALTER TABLE public.expenses ALTER COLUMN receipt_url TYPE text[] USING ARRAY[receipt_url]::text[];
