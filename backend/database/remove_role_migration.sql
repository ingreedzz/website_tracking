-- Backup and remove `role` column from `users` table (Postgres / Supabase)
-- WARNING: This script will DROP the `role` column after backing up its values.
-- Run manually in Supabase SQL editor or via psql with appropriate credentials.

-- 1) Create a backup table with existing roles
DROP TABLE IF EXISTS users_role_backup;
CREATE TABLE users_role_backup AS
SELECT users_id, role FROM users;

-- 2) Verify backup
-- SELECT count(*) FROM users_role_backup;

-- 3) Drop the role column from users (if present)
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- 4) Optional: vacuum
VACUUM FULL users;

-- NOTE: Do NOT run this unless you are sure. Keep `users_role_backup` for recovery.
