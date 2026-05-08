-- ─── Migrate date columns: DATE → TIMESTAMP WITH TIME ZONE ───────────────────
--
-- expenses, budget_additions, and balance_adjustments previously stored only a
-- calendar date.  Now that the UI captures a full local datetime
-- ("YYYY-MM-DDTHH:mm") we need the column to hold a timestamp.
--
-- Existing DATE values are cast to midnight UTC (e.g. 2024-01-15 →
-- 2024-01-15 00:00:00+00), which is safe because the front-end normalises any
-- value to "YYYY-MM-DDTHH:mm" before use.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Drop date-column indexes (they are rebuilt below) ────────────────────────
DROP INDEX IF EXISTS public.expenses_date_idx;
DROP INDEX IF EXISTS public.budget_additions_date_idx;
DROP INDEX IF EXISTS public.balance_adjustments_date_idx;

-- ── expenses ─────────────────────────────────────────────────────────────────
ALTER TABLE public.expenses
    ALTER COLUMN date TYPE timestamp with time zone
    USING date::timestamp with time zone;

ALTER TABLE public.expenses
    ALTER COLUMN date SET DEFAULT now();

-- ── budget_additions ─────────────────────────────────────────────────────────
ALTER TABLE public.budget_additions
    ALTER COLUMN date TYPE timestamp with time zone
    USING date::timestamp with time zone;

ALTER TABLE public.budget_additions
    ALTER COLUMN date SET DEFAULT now();

-- ── balance_adjustments ──────────────────────────────────────────────────────
ALTER TABLE public.balance_adjustments
    ALTER COLUMN date TYPE timestamp with time zone
    USING date::timestamp with time zone;

ALTER TABLE public.balance_adjustments
    ALTER COLUMN date SET DEFAULT now();

-- ── Recreate indexes on the new column type ──────────────────────────────────
CREATE INDEX expenses_date_idx
    ON public.expenses USING btree (date);

CREATE INDEX budget_additions_date_idx
    ON public.budget_additions USING btree (date);

CREATE INDEX balance_adjustments_date_idx
    ON public.balance_adjustments USING btree (date);
