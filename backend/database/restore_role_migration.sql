-- Restore `role` column from backup table `users_role_backup` (Postgres / Supabase)
-- Run this to restore role values after running `remove_role_migration.sql` if needed.

-- 1) Add the role column back (if missing)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;

-- 2) Populate role values from backup
UPDATE users
SET role = ur.role
FROM users_role_backup ur
WHERE users.users_id = ur.users_id;

-- 3) Verify
-- SELECT count(*) FROM users WHERE role IS NULL;
