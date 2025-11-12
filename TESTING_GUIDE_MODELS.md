# Testing Guide: Login Button Fix & Models Management

## Overview
This guide provides step-by-step instructions for testing the login button restoration and the new Models Management feature.

---

## Prerequisites
- Backend deployed to Render
- Frontend deployed to Vercel
- Admin user account created (use `backend/scripts/create-admin.js`)
- Regular user account for testing

---

## Test 1: Login Button Visibility (High Priority)

### Scenario A: Non-Logged-In User
**Expected Result**: Login button should be visible in navbar

**Steps**:
1. Open the application in incognito/private browser window
2. Verify you are not logged in
3. Check the navbar

**Expected**:
- ✅ "Login" button visible in navbar
- ❌ "Register" button NOT visible
- ❌ "Dashboard" button NOT visible
- ❌ "Payment" button NOT visible

**Pass Criteria**: Login button is visible and clickable

---

### Scenario B: Click Login Button
**Expected Result**: Should navigate to login page

**Steps**:
1. From home page, click "Login" button in navbar
2. Verify URL changes to `/login`
3. Verify login form is displayed

**Expected**:
- URL: `https://your-domain.vercel.app/login`
- Login form with email and password fields visible
- "Sign in" button present

**Pass Criteria**: Login page loads successfully

---

### Scenario C: Login Process
**Expected Result**: Should successfully log in and redirect

**Steps**:
1. On login page, enter valid credentials
2. Click "Sign in" button
3. Observe navigation after successful login

**Expected**:
- Success message displayed
- For regular users: Redirect to `/dashboard`
- For admin users: Redirect to `/admin`
- Navbar updates to show logged-in state

**Pass Criteria**: Login successful and navbar shows user email and logout button

---

### Scenario D: Logout and Re-login
**Expected Result**: Should be able to log back in after logout

**Steps**:
1. While logged in, click "Logout" button
2. Verify navbar shows "Login" button again
3. Click "Login" button
4. Enter credentials and login again

**Expected**:
- After logout: Login button reappears
- Can click Login button to navigate to login page
- Can successfully log in again
- Dashboard/Admin page accessible after login

**Pass Criteria**: Complete logout-login cycle works without errors

---

## Test 2: Models Management (Admin Only)

### Scenario A: Admin Navbar Access
**Expected Result**: Admin users should see "Models" button

**Steps**:
1. Log in as admin user
2. Check navbar buttons

**Expected**:
- ✅ "Home" button
- ✅ "Admin" button
- ✅ "Models" button ← NEW
- ✅ "Dashboard" button
- ✅ "Payment" button
- ✅ User email displayed
- ✅ "Logout" button

**Pass Criteria**: "Models" button is visible between "Admin" and "Dashboard"

---

### Scenario B: Access Models Management Page
**Expected Result**: Should navigate to models management interface

**Steps**:
1. While logged in as admin, click "Models" button in navbar
2. Verify URL and page content

**Expected**:
- URL: `https://your-domain.vercel.app/admin/models`
- Page title: "Model Management"
- "Add New Model" button visible
- Table showing existing models (may be empty initially)

**Pass Criteria**: Models Management page loads successfully

---

### Scenario C: Create New Model
**Expected Result**: Should successfully create a new model

**Steps**:
1. On Models Management page, click "Add New Model"
2. Fill in the form:
   - Model Name: "Test Model 1"
   - Description: "Test description"
3. Click "+ Add Field" to add a size field
4. Configure size field:
   - Field Key: "chest_width"
   - Label: "Chest Width"
   - Type: "number"
   - Unit: "cm"
5. Click "Create Model" button

**Expected**:
- Success message displayed
- Form closes
- New model appears in the table
- Model shows: name, description, "1 field(s): Chest Width"

**Pass Criteria**: Model created and appears in the list

---

### Scenario D: Edit Existing Model
**Expected Result**: Should successfully update model

**Steps**:
1. Find "Test Model 1" in the table
2. Click "Edit" button
3. Modify:
   - Description: "Updated description"
4. Add another size field:
   - Field Key: "body_length"
   - Label: "Body Length"
   - Type: "number"
   - Unit: "cm"
5. Click "Update Model" button

**Expected**:
- Success message displayed
- Form closes
- Model in table shows updated information
- Model shows: "2 field(s): Chest Width, Body Length"

**Pass Criteria**: Model updated successfully

---

### Scenario E: Delete Model
**Expected Result**: Should delete model with confirmation

**Steps**:
1. Find "Test Model 1" in the table
2. Click "Delete" button
3. Confirm deletion in the dialog

**Expected**:
- Confirmation dialog appears: "Are you sure you want to delete...?"
- After confirming: Success message displayed
- Model removed from the table

**Pass Criteria**: Model deleted successfully

---

### Scenario F: Non-Admin Access Blocked
**Expected Result**: Regular users cannot access Models Management

**Steps**:
1. Log out from admin account
2. Log in as regular user (non-admin)
3. Try to access `/admin/models` directly via URL

**Expected**:
- Alert: "Access denied. Admin only."
- Redirected to home page (`/`)
- "Models" button NOT visible in navbar

**Pass Criteria**: Non-admin users cannot access the page

---

## Test 3: Integration Tests

### Scenario A: Use Created Model in Dashboard
**Expected Result**: New models should appear in Dashboard model dropdown

**Steps**:
1. As admin, create a model with name "School Uniform"
2. Add size fields: "Chest Width (cm)", "Body Length (cm)"
3. Navigate to Dashboard
4. Check "Model" dropdown in create order form

**Expected**:
- "School Uniform" appears in model dropdown
- Can select the new model
- Dynamic size fields appear in form

**Pass Criteria**: New model usable in order creation

---

### Scenario B: Browser Console Check
**Expected Result**: No JavaScript errors

**Steps**:
1. Open browser Developer Tools (F12)
2. Navigate through all tested pages
3. Check Console tab

**Expected**:
- No red error messages
- May see blue/gray info logs (normal)
- All API calls return 200/201 status codes

**Pass Criteria**: No console errors during navigation

---

### Scenario C: Backend Logs Check
**Expected Result**: Server logs show successful operations

**Steps**:
1. Access Render dashboard
2. View backend logs during testing
3. Look for model CRUD operation logs

**Expected Log Patterns**:
```
[REQ:xxx] [MODELS] === Fetching models ===
[REQ:xxx] [MODELS] ✓ Retrieved X models

[REQ:xxx] [MODELS] === Creating new model ===
[REQ:xxx] [MODELS] Creating model: { name: 'Test Model 1', description: '...' }
[REQ:xxx] [MODELS] ✓ Model created with ID: ...

[REQ:xxx] [MODELS] === Updating model xxx ===
[REQ:xxx] [MODELS] Updating model: { name: 'Test Model 1', description: '...' }
[REQ:xxx] [MODELS] ✓ Model updated

[REQ:xxx] [MODELS] === Deleting model xxx ===
[REQ:xxx] [MODELS] ✓ Model deleted
```

**Pass Criteria**: Logs show successful operations without errors

---

## Test 4: Security Tests

### Scenario A: Unauthenticated API Access
**Expected Result**: Should reject requests without token

**Steps**:
1. Open browser Developer Tools
2. In Console, run:
```javascript
fetch('/api/models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Hack Attempt' }) })
  .then(r => r.json())
  .then(console.log)
```

**Expected**:
- HTTP 401 Unauthorized
- Error: "Authentication required" or similar

**Pass Criteria**: Request rejected

---

### Scenario B: Non-Admin API Access
**Expected Result**: Should reject requests from non-admin users

**Steps**:
1. Log in as regular user
2. Get auth token from localStorage (F12 → Application → Local Storage)
3. In Console, run:
```javascript
fetch('/api/models', { 
  method: 'POST', 
  headers: { 
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json' 
  }, 
  body: JSON.stringify({ name: 'Unauthorized' }) 
}).then(r => r.json()).then(console.log)
```

**Expected**:
- HTTP 403 Forbidden
- Error: "Admin access required"

**Pass Criteria**: Request rejected for non-admin

---

## Test Summary Checklist

### Login Button Fix
- [ ] Login button visible when not logged in
- [ ] Register button removed from navbar
- [ ] Can navigate to login page via Login button
- [ ] Can successfully log in
- [ ] Can log out and log back in
- [ ] No JavaScript errors in console

### Models Management - Access
- [ ] "Models" button visible for admin users
- [ ] Models Management page loads successfully
- [ ] Non-admin users blocked from accessing page
- [ ] Page shows proper title and layout

### Models Management - CRUD Operations
- [ ] Can create new model with size fields
- [ ] Can edit existing model
- [ ] Can delete model with confirmation
- [ ] Models appear in table correctly
- [ ] Size fields display properly
- [ ] Success/error messages shown appropriately

### Models Management - Security
- [ ] Unauthenticated requests rejected (401)
- [ ] Non-admin requests rejected (403)
- [ ] Admin requests succeed (200/201)
- [ ] Server logs show proper authorization checks

### Integration
- [ ] New models appear in Dashboard dropdown
- [ ] Dynamic size fields work in order creation
- [ ] No breaking changes to existing features
- [ ] Backend logs show successful operations

---

## Troubleshooting

### Issue: Login button not visible
**Solution**: 
- Clear browser cache and refresh
- Check if you're already logged in (logout first)
- Verify frontend deployment completed

### Issue: "Models" button not visible
**Solution**:
- Verify you're logged in as admin user
- Check JWT token payload includes `role: 'admin'`
- Use `backend/scripts/create-admin.js` to ensure admin role

### Issue: Cannot create model
**Solution**:
- Check browser console for errors
- Verify backend deployment completed
- Check Render logs for error details
- Ensure `models` table has `size_fields` JSONB column

### Issue: 403 Forbidden on model operations
**Solution**:
- Verify JWT token is valid (not expired)
- Confirm user has admin role in token payload
- Re-login to get fresh token

---

## Report Issues

If any test fails:
1. Note the exact steps to reproduce
2. Copy browser console errors
3. Copy relevant backend logs from Render
4. Include screenshots if applicable
5. Report to development team

---

**Test Date**: _____________  
**Tested By**: _____________  
**Environment**: Production / Staging  
**Result**: Pass / Fail  
**Notes**: _________________
