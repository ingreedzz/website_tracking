-- 20251115_backup_and_drop_products.sql
-- Safe migration template: backup and drop `products` table and its foreign-key dependencies.

BEGIN;

CREATE SCHEMA IF NOT EXISTS backups;

DROP TABLE IF EXISTS backups.products_backup_20251115;
CREATE TABLE backups.products_backup_20251115 AS TABLE public.products;

-- Drop FK constraints referencing products
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS table_from
    FROM pg_constraint
    WHERE contype = 'f' AND confrelid = 'public.products'::regclass
  LOOP
    RAISE NOTICE 'Dropping constraint % on %', r.conname, r.table_from;
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_from, r.conname);
  END LOOP;
END$$;

DROP TABLE IF EXISTS public.products;

COMMIT;

-- ROLLBACK / RESTORE NOTES
-- Restore steps (manual): recreate products schema, then:
--   CREATE TABLE public.products AS TABLE backups.products_backup_20251115;
-- Recreate indexes and FK constraints afterwards.
