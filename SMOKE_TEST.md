# Smoke Test Documentation

## Overview

The smoke test suite validates the complete user flow of the website tracking application:

1. **Health Check** - Verifies backend is running and database is connected
2. **User Registration** - Creates a new test user
3. **User Login** - Authenticates the test user and receives JWT token
4. **Create Order** - Submits a new order with image upload
5. **Verify Dashboard** - Checks that the order appears correctly in the dashboard

## Usage

### Basic Usage

Run against production:
```bash
node smoke-test.js
```

Run against specific URL:
```bash
node smoke-test.js https://website-tracking.onrender.com
node smoke-test.js http://localhost:3000
```

### CI/CD Integration

The smoke test automatically runs on:
- Every pull request to `main`
- Every push to `main`
- Manual workflow dispatch (with custom URL)

See `.github/workflows/smoke-test.yml` for configuration.

## Test Output

### Success Example
```
================================================================================
🧪 SMOKE TEST SUITE
================================================================================
Target: https://website-tracking.onrender.com
Started: 2025-11-11T15:00:00.000Z
================================================================================

[2025-11-11T15:00:00.123Z] [HEALTH] Testing health endpoint: https://website-tracking.onrender.com/api/health
[2025-11-11T15:00:00.456Z] [HEALTH] ✅ Health check passed
[2025-11-11T15:00:00.457Z] [HEALTH] Result: {
  "status": "ok",
  "database": "connected"
}

[2025-11-11T15:00:01.123Z] [REGISTER] Testing user registration
[2025-11-11T15:00:01.456Z] [REGISTER] ✅ Registration successful
[2025-11-11T15:00:01.457Z] [REGISTER] Result: {
  "userId": "123",
  "email": "test1699999999999@example.com",
  "role": "customer",
  "hasToken": true
}

... (more test output)

================================================================================
📊 TEST SUMMARY
================================================================================
Total Tests:  5
Passed:       5 ✅
Failed:       0 ❌

Test Results:
  1. Health Check:        ✅ PASS
  2. User Registration:   ✅ PASS
  3. User Login:          ✅ PASS
  4. Create Order:        ✅ PASS
  5. Verify Dashboard:    ✅ PASS
================================================================================
Finished: 2025-11-11T15:00:05.000Z
================================================================================
```

### Failure Example
```
================================================================================
🧪 SMOKE TEST SUITE
================================================================================
Target: https://website-tracking.onrender.com
Started: 2025-11-11T15:00:00.000Z
================================================================================

[2025-11-11T15:00:00.123Z] [HEALTH] Testing health endpoint: https://website-tracking.onrender.com/api/health
[2025-11-11T15:00:00.456Z] [HEALTH] ❌ ERROR: Error
[2025-11-11T15:00:00.457Z] [HEALTH] Response Status: 500
[2025-11-11T15:00:00.458Z] [HEALTH] Response Data: {
  "error": "Database connection failed"
}

❌ Health check failed. Aborting tests.
================================================================================
📊 TEST SUMMARY
================================================================================
Total Tests:  5
Passed:       0 ✅
Failed:       1 ❌

Test Results:
  1. Health Check:        ❌ FAIL
  2. User Registration:   ❌ FAIL
  3. User Login:          ❌ FAIL
  4. Create Order:        ❌ FAIL
  5. Verify Dashboard:    ❌ FAIL

Errors:
  1. [HEALTH] Error
     Response: {"error":"Database connection failed"}
================================================================================
Finished: 2025-11-11T15:00:00.500Z
================================================================================
```

## Test Details

### Test 1: Health Check
- **Endpoint**: `GET /api/health`
- **Expected Response**: `{ status: "ok", database: "connected" }`
- **Timeout**: 10 seconds
- **Failure Behavior**: Aborts remaining tests

### Test 2: User Registration
- **Endpoint**: `POST /api/register`
- **Payload**: `{ name, email, password, phone }`
- **Expected Response**: `{ user, token }`
- **Timeout**: 10 seconds
- **Failure Behavior**: Aborts remaining tests

### Test 3: User Login
- **Endpoint**: `POST /api/login`
- **Payload**: `{ email, password }`
- **Expected Response**: `{ user, token }`
- **Timeout**: 10 seconds
- **Failure Behavior**: Aborts remaining tests

### Test 4: Create Order
- **Endpoint**: `POST /api/server/orders`
- **Content-Type**: `multipart/form-data`
- **Payload**: 
  - `product`, `model`, `size`, `color`, `quantity`
  - `custom` (JSON string)
  - `notes`
  - `sablon` (image file)
- **Authorization**: `Bearer <token>`
- **Expected Response**: `{ orders_id, status, product, sablon_image_url }`
- **Timeout**: 30 seconds (file upload)
- **Failure Behavior**: Continues to dashboard test

### Test 5: Verify Dashboard
- **Endpoint**: `GET /api/user/orders`
- **Authorization**: `Bearer <token>`
- **Expected Response**: Array of orders
- **Checks**:
  - Orders array is returned
  - Latest order has no null or `-` values
- **Timeout**: 10 seconds
- **Failure Behavior**: Marks test as failed

## Dashboard Validation

The test specifically checks for null or dash (`-`) values in order data, which was a requirement from the user. Example output:

```
[2025-11-11T15:00:05.123Z] [VERIFY_DASHBOARD] ✅ Dashboard verification successful
[2025-11-11T15:00:05.124Z] [VERIFY_DASHBOARD] Result: {
  "totalOrders": 1,
  "hasData": true,
  "latestOrder": {
    "id": "123",
    "product": "custom-tshirt",
    "status": "pending",
    "hasNullFields": []  // Empty = good!
  }
}
[2025-11-11T15:00:05.125Z] [VERIFY_DASHBOARD] ✅ No null or dash fields found in order data
```

If null/dash values are found:
```
[2025-11-11T15:00:05.125Z] [VERIFY_DASHBOARD] ⚠️  Warning: Found null/dash fields in order: color, size, custom
```

## Exit Codes

- **0**: All tests passed
- **1**: One or more tests failed

This makes it easy to integrate into CI/CD pipelines and automated testing workflows.

## Debugging

### Enable Verbose Logging

The script already provides detailed logging by default. Each request includes:
- Timestamp (ISO 8601)
- Test step name
- Request details (endpoint, payload)
- Response details (status, data)
- Error context (if applicable)

### Test Artifacts

When running in GitHub Actions, test artifacts are automatically uploaded:
- Test logs
- Temporary files (`tmp/` directory)
- Retention: 7 days

### Common Issues

#### 1. Health Check Fails
- **Cause**: Backend is not running or database is not connected
- **Solution**: Check Render deployment logs, verify environment variables

#### 2. Registration Fails
- **Cause**: Email already exists, invalid data, or database error
- **Solution**: Check backend logs for detailed error messages

#### 3. Order Creation Fails
- **Cause**: Authentication failed, Supabase storage not configured, or file upload error
- **Solution**: Verify JWT token is valid, check Supabase storage bucket exists and has correct permissions

#### 4. Dashboard Shows Null Values
- **Cause**: Database query returns incomplete data or field normalization issue
- **Solution**: Check backend order normalization logic, verify database schema

## Local Development

### Prerequisites
- Node.js 18+
- npm
- Running backend server (local or remote)

### Setup
```bash
# Install dependencies
npm install

# Run smoke test against local server
npm start  # In separate terminal
node smoke-test.js http://localhost:3000

# Run smoke test against production
node smoke-test.js https://website-tracking.onrender.com
```

### Adding New Tests

To add a new test:

1. Create a new test function:
```javascript
async function testNewFeature(token) {
  const step = 'NEW_FEATURE';
  log(step, 'Testing new feature');
  
  try {
    // Your test logic here
    const response = await axios.get(`${API_URL}/new-endpoint`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 200) {
      logSuccess(step, 'Test passed', response.data);
      testResults.newFeature = true;
      testResults.passedTests++;
      return true;
    }
  } catch (error) {
    logError(step, error);
    testResults.failedTests++;
    return false;
  }
}
```

2. Add test result tracking:
```javascript
let testResults = {
  // ... existing tests
  newFeature: false,
  totalTests: 6,  // Increment
  // ...
};
```

3. Call the test in `runSmokeTests()`:
```javascript
await testNewFeature(loginData.token);
```

4. Update summary output:
```javascript
console.log(`  6. New Feature:         ${testResults.newFeature ? '✅ PASS' : '❌ FAIL'}`);
```

## Troubleshooting

### Test Times Out
- Increase timeout values in the test functions
- Check network connectivity
- Verify backend is responsive

### File Upload Fails
- Check file size limits (currently 8MB)
- Verify Supabase storage bucket configuration
- Check storage permissions and policies

### Token Expired
- JWT tokens are valid for 7 days
- Registration/login creates new tokens
- Each test run uses fresh tokens

## Integration with Render Logs

The smoke test uses request tracing that correlates with backend logs:

**Smoke Test Output:**
```
[2025-11-11T15:00:01.123Z] [CREATE_ORDER] Testing order creation
```

**Render Backend Logs:**
```
[REQ:uuid-1234] START POST /api/server/orders auth=yes content-length=12345
[ORDER] === New order creation request ===
[ORDER] Step 1: Validating authentication...
[ORDER] ✓ Authentication validated
[REQ:uuid-1234] END 201 POST /api/server/orders duration=1234ms
```

Match the timestamp and endpoint to correlate logs across services.

## Maintenance

### Updating Test Data
Edit the `TEST_USER` and `TEST_ORDER` constants at the top of `smoke-test.js`:

```javascript
const TEST_USER = {
  name: `Test User ${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  phone: '1234567890'
};

const TEST_ORDER = {
  product: 'custom-tshirt',
  model: 'Model A',
  // ... more fields
};
```

### Updating Endpoints
If API endpoints change, update the `API_URL` constants in each test function.

### Cleaning Up Test Data
Consider adding a cleanup step to delete test users and orders after tests complete. This requires admin permissions or a cleanup endpoint on the backend.

---

*Last Updated: November 11, 2025*
