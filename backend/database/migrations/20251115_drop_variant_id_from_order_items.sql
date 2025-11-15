-- 20251115_drop_variant_id_from_order_items.sql
-- Safe migration template: backup and drop `variant_id` column from `order_items`.
-- Steps:
-- 1) Backup `order_items` to `backups.order_items_backup_20251115`.
-- 2) Drop FK constraints that reference `order_items.variant_id` (if any).
-- 3) Drop the `variant_id` column from `public.order_items`.

BEGIN;

CREATE SCHEMA IF NOT EXISTS backups;

-- Backup order_items table
DROP TABLE IF EXISTS backups.order_items_backup_20251115;
CREATE TABLE backups.order_items_backup_20251115 AS TABLE public.order_items;

-- Drop foreign-key constraints that reference product_variants via variant_id
DO $$
DECLARE r RECORD;
    target regclass := to_regclass('public.product_variants');
BEGIN
  IF target IS NULL THEN
    RAISE NOTICE 'Target table public.product_variants not found; skipping FK drop loop.';
    RETURN;
  END IF;

  FOR r IN
    SELECT conname, conrelid::regclass::text AS table_from
    FROM pg_constraint
    WHERE contype = 'f' AND confrelid = target
  LOOP
    -- If constraint is on order_items, drop it; otherwise it's probably safe to drop globally
    IF r.table_from = 'public.order_items' OR r.table_from LIKE '%order_items' THEN
      RAISE NOTICE 'Dropping constraint % on %', r.conname, r.table_from;
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_from, r.conname);
    END IF;
  END LOOP;
END$$;

-- Now drop the column (if exists)
ALTER TABLE public.order_items DROP COLUMN IF EXISTS variant_id;

COMMIT;

-- ROLLBACK / RESTORE NOTES
-- To restore the column and data:
-- 1) Recreate the column with appropriate type (inspect backups.order_items_backup_20251115 for column type)
-- 2) Copy data back from backup:
--    UPDATE public.order_items oi SET variant_id = b.variant_id
--      FROM backups.order_items_backup_20251115 b WHERE oi.items_id = b.items_id;
-- 3) Recreate any foreign-key constraints to product_variants.
