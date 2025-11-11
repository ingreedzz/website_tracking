# Backend Scripts

## Available Scripts

### 1. Create Admin User (`create-admin.js`)

Creates or updates a user with admin privileges for testing and administrative purposes.

**Location**: `backend/scripts/create-admin.js`

**Purpose**: 
- Create new admin users for testing
- Promote existing customer users to admin role
- Verify admin user configuration

**Usage**:
```bash
node backend/scripts/create-admin.js <email> <password> <name> [phone]
```

**Examples**:
```bash
# Create a basic admin user
node backend/scripts/create-admin.js admin@test.com admin123 "Admin User"

# Create admin with phone number
node backend/scripts/create-admin.js admin@test.com admin123 "Admin User" "+1234567890"

# Promote existing customer to admin
node backend/scripts/create-admin.js existing@user.com password123 "Existing User"
```

**Prerequisites**:
1. Environment variables must be set in `.env`:
   - `SUPABASE_URL` or `VITE_SUPABASE_URL`
   - `SUPABASE_KEY` or `VITE_SUPABASE_ANON_KEY`
2. Dependencies must be installed: `npm install`
3. Database schema must be applied (users table must exist)

**Features**:
- ✅ Validates Supabase configuration
- ✅ Checks for existing users
- ✅ Creates new admin users with `role='admin'` and `is_admin=true`
- ✅ Updates existing customer users to admin role
- ✅ Verifies user creation/update
- ✅ Provides detailed step-by-step logging
- ✅ Comprehensive error handling

**Output**:
```
==========================================
Admin User Creation Script
==========================================

✓ Supabase configuration found
  URL: https://your-project.supabase.co

Creating admin user with:
  Email: admin@test.com
  Name: Admin User
  Phone: (not provided)
  Role: admin

[1/4] Checking if user already exists...
✓ Email is available

[2/4] Hashing password...
✓ Password hashed

[3/4] Creating admin user in database...
✓ Admin user created successfully

[4/4] Verifying admin user...
✓ Admin user verified

==========================================
✓ SUCCESS! Admin user created!
==========================================

User Details:
  User ID: 550e8400-e29b-41d4-a716-446655440000
  Email: admin@test.com
  Name: Admin User
  Phone: (not set)
  Role: admin
  Is Admin: true
  Created: 2025-11-11T18:00:00.000Z
```

**Error Handling**:
- Missing environment variables → Detailed error with instructions
- User already exists → Offers to update to admin role
- Database connection issues → Shows HTTP status and response data
- Invalid parameters → Usage instructions

**Security Notes**:
- ⚠️ This script is for development/testing only
- ⚠️ Do not use weak passwords in production
- ⚠️ Do not commit admin credentials to version control
- ⚠️ Use secure password management in production
- ⚠️ Consider implementing MFA for admin accounts in production

**See Also**:
- [ADMIN_TESTING_GUIDE.md](../../ADMIN_TESTING_GUIDE.md) - Complete guide for testing admin functionality
- [PROGRESS.md](../../PROGRESS.md) - Project progress and change history

---

## Future Scripts

As the project grows, additional utility scripts can be added here:

### Planned Scripts:
- `seed-data.js` - Seed test data for development
- `migrate-db.js` - Run database migrations
- `cleanup-test-data.js` - Clean up test/development data
- `export-orders.js` - Export orders to CSV/JSON
- `generate-reports.js` - Generate analytics reports

---

**Last Updated**: November 11, 2025  
**Maintained by**: Development Team
