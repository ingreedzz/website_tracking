# Testing Checklist

This document provides a comprehensive testing checklist for the admin testing and enhanced debugging features.

## Prerequisites

Before testing, ensure:

- [ ] Dependencies installed: `npm install`
- [ ] Environment variables configured in `.env`:
  - [ ] `SUPABASE_URL` or `VITE_SUPABASE_URL`
  - [ ] `SUPABASE_KEY` or `VITE_SUPABASE_ANON_KEY`
  - [ ] `JWT_SECRET`
- [ ] Database schema applied (`backend/database/schema.sql`)
- [ ] Frontend built: `npm run build`
- [ ] Backend server running: `npm start`

## 1. Diagnostic Script Tests

### 1.1 Run Diagnostic Script

```bash
# Basic diagnostic
node backend/scripts/diagnose.js

# Verbose output
node backend/scripts/diagnose.js --verbose
```

**Expected Results**:
- [ ] All environment variables validated
- [ ] Database connection successful
- [ ] Users table accessible
- [ ] Health endpoint responsive
- [ ] Auth endpoints accessible
- [ ] Exit code 0 (success)

**If Failed**:
- [ ] Check error messages for specific issues
- [ ] Verify .env file has correct values
- [ ] Ensure database schema is applied
- [ ] Confirm server is running

### 1.2 Test With Missing Environment Variable

```bash
# Temporarily rename .env
mv .env .env.backup

# Run diagnostic (should fail gracefully)
node backend/scripts/diagnose.js

# Restore .env
mv .env.backup .env
```

**Expected Results**:
- [ ] Error message about missing environment variables
- [ ] Clear instructions on what to fix
- [ ] Exit code 1 (error)

## 2. Admin User Creation Tests

### 2.1 Create New Admin User

```bash
node backend/scripts/create-admin.js admin@test.com TestPass123! "Test Admin" "+1234567890"
```

**Expected Results**:
- [ ] Success message displayed
- [ ] User ID generated and shown
- [ ] Role is 'admin'
- [ ] is_admin is true
- [ ] Next steps displayed

**Verify in Database**:
```sql
SELECT users_id, email, name, role, is_admin 
FROM users 
WHERE email = 'admin@test.com';
```

**Expected**:
- [ ] User exists with role='admin'
- [ ] is_admin=true

### 2.2 Try Creating Duplicate Admin

```bash
# Run same command again
node backend/scripts/create-admin.js admin@test.com TestPass123! "Test Admin" "+1234567890"
```

**Expected Results**:
- [ ] Script detects existing user
- [ ] Shows user is already admin
- [ ] No error, just informational message

### 2.3 Promote Existing Customer to Admin

```bash
# First create a customer (via registration or script)
# Then promote them
node backend/scripts/create-admin.js customer@test.com NewPass123! "Customer User"
```

**Expected Results**:
- [ ] Script detects existing user
- [ ] Offers to update role to admin
- [ ] Successfully updates role
- [ ] Verification shows role='admin'

### 2.4 Test With Missing Parameters

```bash
# Missing name
node backend/scripts/create-admin.js admin2@test.com password123
```

**Expected Results**:
- [ ] Error message about missing parameters
- [ ] Usage instructions displayed
- [ ] Exit code 1

## 3. Enhanced Registration Tests

### 3.1 Register Regular Customer

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "CustomerPass123!",
    "name": "Test Customer",
    "phone": "+1234567890"
  }'
```

**Expected Results**:
- [ ] HTTP 201 Created
- [ ] User object returned (without password)
- [ ] JWT token returned
- [ ] User role is 'customer'

**Check Logs** (server console):
- [ ] `[REGISTER] === Starting user registration ===`
- [ ] Step 1-7 logged with timestamps
- [ ] User ID and role logged
- [ ] `=== Registration complete ===`

### 3.2 Register Admin User (Development/Testing)

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@test.com",
    "password": "AdminPass123!",
    "name": "Test Admin 2",
    "phone": "+1234567890",
    "role": "admin"
  }'
```

**Expected Results**:
- [ ] HTTP 201 Created
- [ ] User object returned
- [ ] JWT token returned
- [ ] User role is 'admin'
- [ ] is_admin is true

**Check Logs**:
- [ ] Role determination logged
- [ ] "User role: admin" appears
- [ ] "Is admin: true" appears

### 3.3 Test Registration Validation

```bash
# Missing required field
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "name": "Test User"
  }'
```

**Expected Results**:
- [ ] HTTP 400 Bad Request
- [ ] Error: "name, email and password required"

**Check Logs**:
- [ ] Missing field detected in Step 1
- [ ] Error logged with details

### 3.4 Test Duplicate Email

```bash
# Register same email twice
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@test.com",
    "password": "Pass123!",
    "name": "Duplicate Test"
  }'

# Second attempt
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@test.com",
    "password": "Pass123!",
    "name": "Duplicate Test 2"
  }'
```

**Expected Results** (Second request):
- [ ] HTTP 409 Conflict
- [ ] Error: "Email already registered"

**Check Logs**:
- [ ] Step 4 detects existing email
- [ ] Warning logged with existing user ID

## 4. Enhanced Login Tests

### 4.1 Login as Customer

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "CustomerPass123!"
  }'
```

**Expected Results**:
- [ ] HTTP 200 OK
- [ ] User object returned
- [ ] JWT token returned
- [ ] User role is 'customer'

**Check Logs**:
- [ ] `[LOGIN] === Starting user login ===`
- [ ] Step 1-5 logged
- [ ] User role logged
- [ ] `=== Login complete ===`

### 4.2 Login as Admin

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "TestPass123!"
  }'
```

**Expected Results**:
- [ ] HTTP 200 OK
- [ ] User object returned
- [ ] JWT token returned
- [ ] User role is 'admin'
- [ ] is_admin is true

**Check Logs**:
- [ ] User role: admin
- [ ] Is admin: true
- [ ] Token payload includes role='admin'

### 4.3 Test Invalid Credentials

```bash
# Wrong password
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "WrongPassword"
  }'
```

**Expected Results**:
- [ ] HTTP 401 Unauthorized
- [ ] Error: "Invalid credentials"

**Check Logs**:
- [ ] User found logged
- [ ] Password mismatch warning
- [ ] No sensitive data logged

### 4.4 Test Non-Existent User

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@test.com",
    "password": "Password123!"
  }'
```

**Expected Results**:
- [ ] HTTP 401 Unauthorized
- [ ] Error: "Invalid credentials"

**Check Logs**:
- [ ] No user found warning
- [ ] Step 3 logs rowsFound: 0

## 5. Admin Endpoint Access Tests

### 5.1 Access Admin Endpoints as Admin

First, get admin token:
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"TestPass123!"}' | jq -r '.token')
```

Then test admin endpoints:
```bash
# Get all users
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/users

# Get all orders
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/orders

# Get all payments
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/payments
```

**Expected Results**:
- [ ] HTTP 200 OK for all requests
- [ ] Data returned (may be empty arrays if no data)
- [ ] No 403 Forbidden errors

### 5.2 Access Admin Endpoints as Customer

Get customer token:
```bash
CUSTOMER_TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@test.com","password":"CustomerPass123!"}' | jq -r '.token')
```

Try admin endpoints:
```bash
# Try to get all users (should fail)
curl -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  http://localhost:3000/api/users
```

**Expected Results**:
- [ ] HTTP 403 Forbidden
- [ ] Error: "Admin role required"

**Check Logs**:
- [ ] Admin check middleware logged
- [ ] Role 'customer' does not match 'admin'

## 6. Frontend Admin Dashboard Tests

### 6.1 Access Admin Dashboard as Admin

1. Navigate to: `http://localhost:3000/login`
2. Login with: `admin@test.com` / `TestPass123!`
3. Click "Admin Dashboard" or navigate to `/admin-dashboard`

**Expected Results**:
- [ ] Admin dashboard loads successfully
- [ ] "Dashboard Admin" title visible
- [ ] Orders table displayed (may be empty)
- [ ] Customer names shown (not UUIDs)
- [ ] "Show Total Order" button present
- [ ] "Log Out" button present

### 6.2 Access Admin Dashboard as Customer

1. Navigate to: `http://localhost:3000/login`
2. Login with: `customer@test.com` / `CustomerPass123!`
3. Try to navigate to `/admin-dashboard`

**Expected Results**:
- [ ] Redirected to home page
- [ ] Access denied (route guard)

**Check Browser Console**:
- [ ] Log: "User is not admin, redirecting to home"

## 7. Request Tracing Tests

### 7.1 Verify Request IDs in Logs

Make multiple requests and check logs:

```bash
# Make 3 registration attempts
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@test.com\",\"password\":\"Pass123!\",\"name\":\"Test$i\"}"
done
```

**Check Server Logs**:
- [ ] Each request has unique `[REQ:xxx]` prefix
- [ ] All steps for same request have same REQ ID
- [ ] Different requests have different REQ IDs
- [ ] Logs are correlated by REQ ID

### 7.2 Trace Failed Request

```bash
# Make a request that will fail
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'
```

**Check Logs**:
- [ ] Can find all logs for this request by REQ ID
- [ ] Error is logged with same REQ ID
- [ ] Stack trace includes REQ ID
- [ ] Easy to follow request flow from start to error

## 8. Performance Tests

### 8.1 Check Timeout Protection

```bash
# If Supabase is slow or unresponsive, should timeout
curl -w "@-" -o /dev/null -s http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"timeout@test.com","password":"Pass123!","name":"Timeout"}' <<'EOF'
time_total: %{time_total}s
http_code: %{http_code}
EOF
```

**Expected Results**:
- [ ] Response time < 15 seconds (timeout protection working)
- [ ] If timeout, HTTP 504 returned
- [ ] Error message: "Database request timeout"

### 8.2 Monitor Log Volume

```bash
# Make 10 requests and check log file size
for i in {1..10}; do
  curl -s http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test","password":"test"}' > /dev/null
done
```

**Check**:
- [ ] Logs are detailed but not excessive
- [ ] Each request ~30-50 lines of logs
- [ ] No duplicate logs
- [ ] All logs are valuable for debugging

## Test Summary Checklist

After completing all tests, verify:

### Functionality
- [ ] Diagnostic script identifies issues correctly
- [ ] Admin user creation works
- [ ] Existing user promotion works
- [ ] Customer registration works
- [ ] Admin registration works (with role parameter)
- [ ] Login works for both roles
- [ ] Admin endpoints only accessible by admins
- [ ] Customer endpoints work for all users

### Debugging
- [ ] Request IDs present in all logs
- [ ] 7-step registration logging works
- [ ] 5-step login logging works
- [ ] Error logs include context
- [ ] Success logs confirm operations
- [ ] Logs can be correlated across requests

### Security
- [ ] Customer users cannot access admin endpoints
- [ ] Invalid credentials rejected
- [ ] Duplicate emails prevented
- [ ] Passwords not logged
- [ ] Sensitive data protected
- [ ] Timeout protection works

### Documentation
- [ ] ADMIN_TESTING_GUIDE.md is accurate
- [ ] backend/scripts/README.md is complete
- [ ] SECURITY_SUMMARY.md explains alerts
- [ ] All examples in docs work

---

**Notes**:
- Replace `http://localhost:3000` with your actual API URL if different
- Use `jq` for JSON parsing (install with `brew install jq` or `apt-get install jq`)
- Check server logs in real-time: `tail -f backend.log` or `npm start`
- All tests should be run in a test/development environment first

**Last Updated**: November 11, 2025
