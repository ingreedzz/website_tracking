-- 20251115_backup_and_drop_colors.sql
-- Safe migration template: backup and drop `colors` table and its foreign-key dependencies.
-- Steps performed:
-- 1. Create a `backups` schema if it doesn't exist.
-- 2. Create a full backup table `backups.colors_backup_20251115` using SELECT *.
-- 3. Drop any foreign-key constraints that reference `public.colors`.
-- 4. Drop the `public.colors` table.

BEGIN;

-- 1) Ensure backups schema exists
CREATE SCHEMA IF NOT EXISTS backups;

-- 2) Create a safe data backup
DROP TABLE IF EXISTS backups.colors_backup_20251115;
CREATE TABLE backups.colors_backup_20251115 AS TABLE public.colors;

-- 3) Drop foreign key constraints referencing public.colors (if any)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS table_from
    FROM pg_constraint
    WHERE contype = 'f' AND confrelid = 'public.colors'::regclass
  LOOP
    RAISE NOTICE 'Dropping constraint % on %', r.conname, r.table_from;
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_from, r.conname);
  END LOOP;
END$$;

-- 4) Drop the colors table
DROP TABLE IF EXISTS public.colors;

COMMIT;

-- ROLLBACK / RESTORE NOTES
-- To restore the table and its data, run the following (manual step):
-- 1) Recreate the table schema if it was dropped (you may need to recreate indexes and constraints manually).
-- 2) Restore data from the backup:
--    CREATE TABLE public.colors AS TABLE backups.colors_backup_20251115;
-- 3) Recreate any foreign-key constraints that were dropped (refer to the application schema or logs).

-- IMPORTANT: This template drops the table but does not automatically recreate FK constraints on rollback.
-- Review log of dropped constraints (server NOTICE messages) and re-create them on restore.
