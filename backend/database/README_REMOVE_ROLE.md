# Remove `role` column from `users` table (Safe procedure)

This folder contains SQL scripts to safely remove the `role` column from the `users` table and to restore it if needed.

Important:
- These are manual scripts — they are NOT executed by CI or by the agent automatically.
- Run them only if you own the Supabase project and have verified backups.

Steps to remove `role` safely:

1. Inspect data
   - Run: `SELECT COUNT(*) FROM users WHERE role IS NOT NULL;`
   - Decide if you need to preserve values in `users_role_backup`.

2. Create backup and drop column (manual)
   - Open Supabase SQL editor and run `remove_role_migration.sql`.
   - Confirm `users_role_backup` was created and contains expected rows.

3. Verify application
   - Deploy the application with changes (minimal backend changes already made to tolerate missing `role`).
   - Test login, admin flows, and UI.

4. If needed, restore
   - Run `restore_role_migration.sql` in Supabase SQL editor to restore data back into `users.role`.

Notes for the delegated agent:
- The agent should only run these scripts after explicit owner approval and when backups are in place.
- The preferred workflow is to first run the scripts in a staging Supabase project, validate app behavior, then run in production.
