# Testing Guide - Role Column Removal

## Overview

This guide helps you test the application before and after removing the role column from the Supabase users table.

## Testing Phases

1. **Phase 1**: Test with refactored code + existing database (role column present)
2. **Phase 2**: Remove role column via GitHub Actions workflow
3. **Phase 3**: Test with refactored code + migrated database (role column removed)

---

## Phase 1: Pre-Migration Testing (Role Column Still Present)

### Prerequisites
- Deploy backend changes to Render
- Deploy frontend changes to Vercel
- Database still has role column

### Test Cases

#### 1. Customer Registration
**Steps:**
1. Navigate to `/register`
2. Fill in:
   - Name: "Test Customer"
   - Email: "customer@test.com"
   - Password: "test123"
   - Phone: "1234567890"
3. Submit registration

**Expected Results:**
- ✅ User created with `is_admin = false`
- ✅ JWT token contains `role: 'customer'` and `is_admin: false`
- ✅ Redirected to Dashboard
- ✅ Can see "Dashboard" and "Payment" in navbar
- ✅ Cannot see "Admin" in navbar

**Check in Database:**
```sql
SELECT users_id, email, is_admin FROM users WHERE email = 'customer@test.com';
```
Should show: `is_admin = false`

#### 2. Admin User Creation
**Steps:**
1. Use create-admin script:
   ```bash
   node backend/scripts/create-admin.js admin@test.com admin123 "Test Admin"
   ```

**Expected Results:**
- ✅ User created with `is_admin = true`
- ✅ Success message displayed

**Check in Database:**
```sql
SELECT users_id, email, is_admin FROM users WHERE email = 'admin@test.com';
```
Should show: `is_admin = true`

#### 3. Customer Login
**Steps:**
1. Navigate to `/login`
2. Login with customer credentials
3. Check browser console for JWT payload

**Expected Results:**
- ✅ Login successful
- ✅ JWT contains `role: 'customer'` and `is_admin: false`
- ✅ Redirected to `/dashboard`
- ✅ Alert shows: "Logged in: customer@test.com (role: customer)"

#### 4. Admin Login
**Steps:**
1. Navigate to `/login`
2. Login with admin credentials
3. Check browser console for JWT payload

**Expected Results:**
- ✅ Login successful
- ✅ JWT contains `role: 'admin'` and `is_admin: true`
- ✅ Redirected to `/admin`
- ✅ Alert shows: "Logged in: admin@test.com (role: admin)"
- ✅ Can see "Admin" link in navbar

#### 5. Customer Dashboard - Order Creation
**Steps:**
1. Login as customer
2. Click "Make New Order"
3. Fill in order form:
   - Product: "Custom T-Shirt"
   - Model: Select any model (e.g., "Kaos Oblong Dewasa")
   - Verify size fields appear dynamically
   - Color: "Blue"
   - Quantity: 5
   - Upload sablon image
4. Submit order

**Expected Results:**
- ✅ Model dropdown populated with options
- ✅ Size fields change based on selected model
- ✅ If backend has size_fields, shows dynamic fields
- ✅ If not, shows hardcoded fallback fields
- ✅ Order created successfully
- ✅ Order appears in "Show Orders" list
- ✅ Image displays correctly

**Verify Size Fields:**
- Try selecting different models
- Confirm size fields update accordingly
- Check that fields are not hardcoded the same for all models

#### 6. Customer Dashboard - View Orders
**Steps:**
1. Login as customer
2. Click "Show Orders"
3. Verify order list

**Expected Results:**
- ✅ Orders table displays with columns:
  - Order ID, Order Name, Customer Name
  - Product, Model, Size, Color, Quantity
  - Status, Prices, Payment Status, Dates
  - Sablon image, Actions
- ✅ Image thumbnails display correctly
- ✅ Can click "View" to see order details

#### 7. Payment Upload
**Steps:**
1. Login as customer
2. Navigate to `/payment`
3. Select an order from dropdown
4. Upload payment proof image
5. Submit

**Expected Results:**
- ✅ Order dropdown shows orders with descriptive labels
- ✅ Format: "Order Name • Customer Name • Product • Model • Qty"
- ✅ Payment proof uploads successfully
- ✅ Order payment_status updates to "pending"

#### 8. Admin Dashboard - View All Orders
**Steps:**
1. Login as admin
2. Navigate to `/admin`
3. View orders table

**Expected Results:**
- ✅ Can see all orders (from all users)
- ✅ Customer names display (not UUIDs)
- ✅ Order details visible
- ✅ Can click to view order details

#### 9. Admin Dashboard - Order Detail
**Steps:**
1. Login as admin
2. Navigate to `/admin`
3. Click on an order
4. View order details

**Expected Results:**
- ✅ Full order information displayed
- ✅ Payment proof visible if uploaded
- ✅ Can update order status
- ✅ Can update payment status

#### 10. Navigation and Authorization
**Steps:**
1. Try accessing `/admin` as customer
2. Try accessing `/dashboard` when not logged in
3. Verify router guards work

**Expected Results:**
- ✅ Customer redirected away from `/admin`
- ✅ Not logged in redirects to login
- ✅ Logged in users redirected away from `/login` and `/register`
- ✅ Admin can access both `/admin` and `/dashboard`

---

## Phase 2: Database Migration

### Before Migration Checklist
- [ ] All Phase 1 tests passed
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Verified application works correctly
- [ ] Confirmed no errors in production logs
- [ ] Ready to remove role column

### Execute Migration

1. Go to GitHub Actions
2. Find "Remove Role Column from Users Table"
3. Click "Run workflow"
4. Enter confirmation: `REMOVE ROLE COLUMN`
5. Enable backup: Yes
6. Click "Run workflow"
7. Monitor execution

### Workflow Verification
- ✅ All steps complete successfully
- ✅ Backup table created
- ✅ Role column removed
- ✅ Verification passed
- ✅ User count matches

---

## Phase 3: Post-Migration Testing (Role Column Removed)

Repeat all tests from Phase 1 to ensure everything still works:

### Critical Tests After Migration

#### 1. New User Registration
**Steps:**
1. Register a new user: "newcustomer@test.com"
2. Check database

**Expected Results:**
- ✅ User created successfully
- ✅ No error about missing role column
- ✅ Database row has `is_admin` field
- ✅ JWT token contains derived `role`

**Database Check:**
```sql
SELECT users_id, email, is_admin FROM users WHERE email = 'newcustomer@test.com';
```
Should work without errors and show no `role` column.

#### 2. Existing User Login
**Steps:**
1. Login with previously created customer account
2. Login with previously created admin account

**Expected Results:**
- ✅ Both logins work
- ✅ JWT tokens generated correctly
- ✅ Role derived from is_admin field
- ✅ No database errors

#### 3. Authorization Checks
**Steps:**
1. Verify admin can access `/admin`
2. Verify customer cannot access `/admin`
3. Check all navigation guards

**Expected Results:**
- ✅ Admin access works correctly
- ✅ Customer blocked from admin routes
- ✅ No role-related errors in console

#### 4. Complete Order Flow
**Steps:**
1. Login as customer
2. Create new order with model selection
3. Verify size fields display correctly
4. Submit order
5. Upload payment proof
6. Login as admin
7. View order in admin dashboard

**Expected Results:**
- ✅ Entire flow works end-to-end
- ✅ Models load correctly
- ✅ Size fields dynamic or fallback
- ✅ No errors in console or logs

#### 5. JWT Token Verification
**Steps:**
1. Login and decode JWT token
2. Check token payload

**Expected Token Payload:**
```json
{
  "users_id": "uuid...",
  "email": "user@example.com",
  "is_admin": true/false,
  "role": "admin"/"customer",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Verify:**
- ✅ `is_admin` field present
- ✅ `role` field present and correct
- ✅ `role` matches `is_admin` value
- ✅ Token expires in 7 days

---

## Smoke Test Script

For quick automated testing, run:

```bash
# Test against production
node smoke-test.js

# Test against local
node smoke-test.js http://localhost:3000
```

**Expected Results:**
- ✅ Health check passes
- ✅ Registration works
- ✅ Login works
- ✅ Order creation works
- ✅ Dashboard loads correctly

---

## Rollback Procedure

If issues occur after migration:

### Step 1: Identify the Issue
- Check browser console for errors
- Check backend logs (Render)
- Check database queries

### Step 2: Quick Fix (If Possible)
- Clear browser cache/storage
- Redeploy application
- Check for typos in code

### Step 3: Database Rollback (If Needed)

```sql
-- Find backup table
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'users_role_backup_%'
ORDER BY table_name DESC;

-- Restore role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;

-- Restore data (replace TIMESTAMP)
UPDATE users u
SET role = CASE 
  WHEN u.is_admin = true THEN 'admin'
  ELSE 'customer'
END
FROM users_role_backup_TIMESTAMP b
WHERE u.users_id = b.users_id;

-- Or restore exact values from backup
UPDATE users u
SET role = b.role
FROM users_role_backup_TIMESTAMP b
WHERE u.users_id = b.users_id;

-- Verify restoration
SELECT COUNT(*), role FROM users GROUP BY role;
```

### Step 4: Verify After Rollback
- Test login
- Test order creation
- Check admin access
- Verify no errors

---

## Common Issues and Solutions

### Issue: "Role column not found" error

**Solution:**
- This should not occur if migration was successful
- Check that Phase 1 testing passed
- Verify code changes deployed

### Issue: Admin cannot access admin dashboard

**Solution:**
- Check JWT token payload
- Verify is_admin is true in database
- Clear browser localStorage and login again
- Check backend logs for authorization errors

### Issue: Model dropdown is empty

**Solution:**
- Check `/models` endpoint responds correctly
- Verify fallback model options load
- Check browser console for errors
- Ensure models table has data

### Issue: Size fields are hardcoded for all models

**Solution:**
- This is expected if models don't have size_fields
- Check if models.size_fields column exists
- Populate size_fields data in database
- Fallback should work with hardcoded fields

### Issue: JWT tokens don't contain role

**Solution:**
- Check backend login/register code
- Verify role derivation logic
- Clear tokens and login again
- Check JWT_SECRET is configured

---

## Success Criteria

### Pre-Migration (Phase 1)
- ✅ All 10 test cases pass
- ✅ No errors in browser console
- ✅ No errors in backend logs
- ✅ Models and orders work correctly

### Post-Migration (Phase 3)
- ✅ All test cases pass again
- ✅ New users can register
- ✅ Existing users can login
- ✅ Authorization works correctly
- ✅ No role-related errors

### Overall Success
- ✅ Application behaves identically before and after
- ✅ Database is simpler (one less column)
- ✅ Backup exists for rollback
- ✅ Documentation is complete

---

## Support

If you encounter issues:

1. Check `ROLE_REMOVAL_SECURITY.md` for security analysis
2. Check `backend/database/README_REMOVE_ROLE.md` for detailed instructions
3. Review workflow logs in GitHub Actions
4. Check backend logs in Render
5. Verify environment variables are set correctly

---

**Document Version:** 1.0
**Last Updated:** November 13, 2025
**Status:** Ready for testing
