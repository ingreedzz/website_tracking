-- 20251115_backup_and_drop_product_variants.sql
-- Safe migration template: backup and drop `product_variants` table and its foreign-key dependencies.

BEGIN;

CREATE SCHEMA IF NOT EXISTS backups;

DROP TABLE IF EXISTS backups.product_variants_backup_20251115;
CREATE TABLE backups.product_variants_backup_20251115 AS TABLE public.product_variants;

-- Drop FK constraints referencing product_variants
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS table_from
    FROM pg_constraint
    WHERE contype = 'f' AND confrelid = 'public.product_variants'::regclass
  LOOP
    RAISE NOTICE 'Dropping constraint % on %', r.conname, r.table_from;
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_from, r.conname);
  END LOOP;
END$$;

-- If there is a variants_id PK that is referenced, handle ordering of dependent drops
DROP TABLE IF EXISTS public.product_variants;

COMMIT;

-- ROLLBACK / RESTORE NOTES
-- To restore: recreate table schema, then copy data back:
--   CREATE TABLE public.product_variants AS TABLE backups.product_variants_backup_20251115;
-- Recreate indexes and foreign keys as required.
