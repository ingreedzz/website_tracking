# Remove `role` column from `users` table (Safe procedure)

This folder contains SQL scripts and GitHub Actions workflow to safely remove the `role` column from the `users` table and to restore it if needed.

## ⚠️ Important Notes

- The application code has been refactored to use `is_admin` field instead of `role` column
- The `role` value in JWT tokens is now derived from `is_admin` field (not from database)
- These scripts are for manual execution OR automated via GitHub Actions workflow
- **Always ensure you have backups before running**

## 🚀 Automated Removal via GitHub Actions (Recommended)

### Prerequisites

1. Ensure the following secrets are set in GitHub repository settings:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE` - Your Supabase service role key (from Supabase dashboard)

2. The application code must be deployed with the refactored changes that don't depend on the role column.

### Steps to Remove Role Column

1. **Navigate to GitHub Actions**
   - Go to your repository on GitHub
   - Click on "Actions" tab
   - Find "Remove Role Column from Users Table" workflow

2. **Trigger the Workflow**
   - Click "Run workflow" button
   - Type `REMOVE ROLE COLUMN` exactly (case-sensitive) in the confirmation field
   - Choose whether to create backup (recommended: Yes)
   - Click "Run workflow"

3. **Monitor Execution**
   - Watch the workflow execution in real-time
   - Check each step for success/failure
   - Review the summary at the end

4. **Verify Application**
   - Test login with admin and customer accounts
   - Verify admin dashboard access works
   - Check customer dashboard and order creation
   - Test model selection and size fields

### What the Workflow Does

1. ✅ Validates confirmation input
2. ✅ Validates environment variables
3. ✅ Installs PostgreSQL client
4. ✅ Pre-flight check - verifies users table exists
5. ✅ Creates timestamped backup table (users_role_backup_YYYYMMDD_HHMMSS)
6. ✅ Removes role column
7. ✅ Post-migration verification
8. ✅ Displays summary and next steps

### Rollback

If issues arise, the workflow creates a backup table. To restore:

```sql
-- Check available backups
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'users_role_backup_%';

-- Restore role from backup (replace TIMESTAMP with your backup)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;
UPDATE users u
SET role = b.role
FROM users_role_backup_TIMESTAMP b
WHERE u.users_id = b.users_id;
```

## 📝 Manual Removal via SQL (Alternative)

If you prefer manual execution or don't have GitHub Actions set up:

### Steps to remove `role` safely:

1. **Inspect data**
   ```sql
   SELECT COUNT(*) FROM users WHERE role IS NOT NULL;
   ```
   Decide if you need to preserve values in backup.

2. **Create backup and drop column (manual)**
   - Open Supabase SQL editor
   - Run the commands from `remove_role_migration.sql`
   - Confirm `users_role_backup` was created and contains expected rows

3. **Verify application**
   - Deploy the application with refactored changes
   - Test login, admin flows, and UI
   - Verify models and orders work correctly

4. **If needed, restore**
   - Run `restore_role_migration.sql` in Supabase SQL editor
   - This will restore data back into `users.role`

## 🔍 Testing Checklist After Removal

- [ ] Customer login works
- [ ] Admin login works
- [ ] Admin dashboard accessible
- [ ] Customer dashboard accessible
- [ ] Order creation works
- [ ] Model selection displays correctly
- [ ] Dynamic size fields work (if models have size_fields)
- [ ] Hardcoded size fields fallback works
- [ ] Payment upload works
- [ ] Admin can view all orders
- [ ] Customer can view their orders
- [ ] Navigation between pages works
- [ ] JWT tokens contain role derived from is_admin

## 📊 Code Changes Made

The following files were refactored to eliminate dependency on role column:

### Backend:
- `backend/routes/index.js`
  - Registration: Now creates users with only `is_admin` field
  - Login: Derives role from `is_admin` when generating JWT
  - JWT payload: Contains `role` derived from `is_admin`
  
- `backend/middleware/auth.js`
  - Already had fallback: `role: payload.role || (payload.is_admin ? 'admin' : 'customer')`
  - No changes needed

### Frontend:
- `src/lib/supabase.js`
  - `getProfile()`: No longer fetches `role` column, derives it from `is_admin`
  
- `src/router/index.js`
  - Navigation guard checks both `is_admin` and `role` for backward compatibility
  
- `src/views/AdminDashboard.vue`
  - Admin check uses `is_admin` instead of `role`
  
- `src/views/AdminOrderDetail.vue`
  - Admin check uses `is_admin` instead of `role`
  
- `src/views/Dashboard.vue`
  - Already had dual check: `isAdmin.value = payload.is_admin || payload.role === 'admin'`
  
- `src/views/Payment.vue`
  - Already had dual check: `const isAdmin = user?.is_admin || user?.role === 'admin'`
  
- `src/components/Navbar.vue`
  - Already had dual check: `isAdmin.value = (u.role === 'admin' || u.is_admin === true)`

## 🔒 Security Notes

- The service role key has full access to your database - handle with care
- GitHub secrets are encrypted and not visible in workflow logs
- The workflow validates inputs before executing
- A backup is created by default before any destructive operation
- The workflow uses minimal permissions (contents: read)

## 🆘 Troubleshooting

### Workflow fails with "SUPABASE_SERVICE_ROLE secret is not set"
- Go to repository Settings → Secrets and variables → Actions
- Add `SUPABASE_SERVICE_ROLE` secret with your service role key from Supabase dashboard

### Workflow fails with connection error
- Verify `SUPABASE_URL` is correct
- Check that your Supabase project is active
- Ensure service role key is valid

### Application breaks after removal
- Check browser console for errors
- Verify backend logs for authentication issues
- Restore from backup table if needed

### Admin access not working
- Verify `is_admin` column exists and has correct values
- Check JWT token payload contains derived role
- Clear browser storage and login again

## 📚 Additional Resources

- GitHub Actions Workflow: `.github/workflows/remove-role-column.yml`
- Removal SQL: `backend/database/remove_role_migration.sql`
- Restore SQL: `backend/database/restore_role_migration.sql`
- Technical Overview: `technical_overview.md`
- Implementation Progress: `PROGRESS.md`

