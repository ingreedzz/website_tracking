-- Prepare DROP of old `changed_by` column from order_status_history
-- Date: 2025-11-14
-- This script prepares the safe DROP of the legacy `changed_by` column.
-- Run this only AFTER:
--  1) application has been updated to use `changed_by_id` and snapshot columns for new inserts
--  2) backfill has populated `changed_by_id` for existing rows
--  3) monitor for a safe period to ensure no code paths still write to `changed_by`.

BEGIN;

-- 1) Drop foreign key constraint referencing the old changed_by column (if exists)
ALTER TABLE public.order_status_history
  DROP CONSTRAINT IF EXISTS order_status_history_changed_by_fkey;

-- 2) Drop the old column (if exists)
ALTER TABLE public.order_status_history
  DROP COLUMN IF EXISTS changed_by;

COMMIT;

-- IMPORTANT: Do NOT run this until you have confirmed application writes are updated and you've taken a DB backup.
-- After running, test reads of history and confirm `changed_by_id`/`changed_by_email`/`changed_by_name` are present.
