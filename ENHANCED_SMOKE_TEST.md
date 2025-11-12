# Enhanced Smoke Test Documentation

## Overview

The enhanced smoke test provides comprehensive testing and diagnostics for the website tracking application. It tests all critical user flows and provides detailed reporting for debugging.

## Features

### Comprehensive Test Coverage

1. **Health Check** - Verifies backend is running and database is connected
2. **User Registration** - Creates new test user with JWT token
3. **User Login** - Authenticates test user
4. **Order Creation** - Submits order with image upload to Supabase Storage
5. **Order Verification** - Verifies order appears in dashboard with correct data
6. **Admin Login** - Tests admin user creation (may be skipped in production)
7. **Model Management** - Tests CRUD operations on models (admin-only)
8. **Payment Upload** - Tests payment proof upload functionality

### Enhanced Diagnostics

- **Detailed Logging**: Every step is logged with timestamps for correlation
- **Performance Metrics**: Response times tracked for all operations
- **Error Reporting**: Comprehensive error details including response data
- **Data Validation**: Checks for null/dash values in responses
- **Success Rate**: Calculates overall test pass rate

## Usage

### Basic Usage

```bash
# Run against production (default)
node enhanced-smoke-test.js

# Run against specific URL
node enhanced-smoke-test.js https://website-tracking.onrender.com

# Run against local development server
node enhanced-smoke-test.js http://localhost:3000
```

### Output Format

The test provides real-time logging during execution:

```
================================================================================
🧪 ENHANCED SMOKE TEST SUITE
================================================================================
Target: https://website-tracking.onrender.com
API URL: https://website-tracking.onrender.com/api
Started: 2025-11-12T12:30:00.000Z
================================================================================

[2025-11-12T12:30:00.123Z] [HEALTH] Testing health endpoint: https://...
[2025-11-12T12:30:00.456Z] [HEALTH] Response received in 333ms
[2025-11-12T12:30:00.457Z] [HEALTH] Response status: 200
[2025-11-12T12:30:00.458Z] [HEALTH] ✅ Health check passed
...
```

### Final Summary

At the end of the test run, a comprehensive summary is displayed:

```
================================================================================
📊 ENHANCED SMOKE TEST SUMMARY
================================================================================
Target URL: https://website-tracking.onrender.com
Test Environment: Render Production
Completed: 2025-11-12T12:35:00.000Z
================================================================================

📈 Test Results:
  Total Tests: 10
  ✅ Passed: 8
  ❌ Failed: 0
  ⏭️  Skipped: 2

🎯 Individual Test Status:
  1. Health Check: ✅ PASS
  2. User Registration: ✅ PASS
  3. User Login: ✅ PASS
  4. Create Order: ✅ PASS
  5. Verify Order: ✅ PASS
  6. Admin Login: ⏭️  SKIP
  7. Model Create: ⏭️  SKIP
  8. Model List: ⏭️  SKIP
  9. Model Delete: ⏭️  SKIP
  10. Payment Upload: ✅ PASS

⏱️  Performance Timings:
  health: 333ms
  register: 1245ms
  login: 567ms
  createOrder: 3456ms
  verifyOrder: 678ms
  paymentUpload: 2345ms

🎯 Overall Success Rate: 80.0% (8/10)
⚠️  SOME TESTS FAILED. Review errors above for details.
================================================================================
```

## Test Details

### 1. Health Check

**Purpose**: Verifies the backend API is accessible and database is connected

**What it tests**:
- API endpoint is reachable
- Server responds with 200 status
- Database connection is active

**Expected response**:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-11-12T12:30:00.000Z"
}
```

### 2. User Registration

**Purpose**: Tests user account creation flow

**What it tests**:
- Registration endpoint accepts new users
- Password is hashed securely
- JWT token is returned
- User data is stored in database

**Test data**:
- Unique email (timestamped)
- Random password
- Test name and phone

### 3. User Login

**Purpose**: Tests authentication flow

**What it tests**:
- Login endpoint validates credentials
- JWT token is issued on successful login
- User role is correctly returned

### 4. Order Creation

**Purpose**: Tests the complete order submission flow

**What it tests**:
- Multipart form data upload
- Image file upload to Supabase Storage
- Order data insertion into database
- Order items creation
- Custom fields JSON parsing
- Customer and order name tracking

**Test includes**:
- 50KB PNG image upload
- Complete order details
- Custom measurements
- Customer and order names

### 5. Order Verification

**Purpose**: Ensures created orders appear correctly in the dashboard

**What it tests**:
- `/user/orders` endpoint returns user's orders
- Created order is present in the list
- Order data is complete (no null values)
- Customer and order names are preserved

**Validation checks**:
- Order ID matches
- Product information is present
- No null or dash values in critical fields
- Customer name and order name are displayed

### 6. Admin Login

**Purpose**: Tests admin user creation and authentication

**What it tests**:
- Admin role assignment (if supported)
- Admin token generation
- Admin-specific authentication

**Note**: This test is often skipped in production environments where admin role cannot be assigned via API.

### 7-9. Model Management

**Purpose**: Tests CRUD operations on models (admin-only)

**What it tests**:
- Model creation with size fields
- Model listing
- Model deletion
- Admin authentication for model operations

**Note**: These tests require admin privileges and are skipped if no admin token is available.

### 10. Payment Upload

**Purpose**: Tests payment proof upload functionality

**What it tests**:
- Payment proof image upload
- Payment record creation
- Order payment status update
- Payment proof URL generation

## Correlation with Backend Logs

All test operations generate request IDs that can be correlated with backend logs:

**Frontend Test Log**:
```
[2025-11-12T12:30:01.123Z] [CREATE_ORDER] Sending order with: {...}
```

**Backend Log (Render)**:
```
[REQ:req-1731410400-abc123] [ORDER] === New Order Creation Request ===
[REQ:req-1731410400-abc123] [ORDER] Timestamp: 2025-11-12T12:30:01.234Z
```

The timestamps help correlate test actions with server-side processing.

## Troubleshooting

### Common Issues

#### Test Fails: "Health check failed"

**Possible causes**:
- Backend server is down
- Database connection is broken
- Network issues

**Solution**:
1. Check Render deployment status
2. Verify Supabase credentials
3. Check firewall/network settings

#### Test Fails: "Registration failed"

**Possible causes**:
- Email validation issues
- Password requirements not met
- Database insert error

**Solution**:
1. Check backend logs for error details
2. Verify Supabase users table exists
3. Check password hashing configuration

#### Test Fails: "Order creation failed"

**Possible causes**:
- File upload issues
- Supabase Storage bucket not configured
- Authentication token expired
- Database schema mismatch

**Solution**:
1. Verify Supabase Storage bucket exists
2. Check bucket permissions (public/private)
3. Verify orders and order_items tables exist
4. Check file size limits

#### Test Skipped: Admin tests

**This is normal in production**. Admin role creation via API is typically disabled for security.

**To test admin features**:
1. Use the `create-admin.js` script to create admin users
2. Run tests against a development environment
3. Manually verify admin features in the UI

### Debugging Tips

1. **Enable Verbose Logging**: Check console output for detailed step-by-step execution
2. **Check Backend Logs**: All requests have request IDs for correlation
3. **Verify Environment Variables**: Ensure all Supabase credentials are set
4. **Test Locally First**: Run against localhost to isolate deployment issues
5. **Check Network**: Ensure firewall allows connections to Render/Supabase

## CI/CD Integration

The enhanced smoke test can be integrated into GitHub Actions or other CI/CD pipelines:

```yaml
- name: Run Enhanced Smoke Tests
  run: node enhanced-smoke-test.js ${{ secrets.BACKEND_URL }}
  continue-on-error: false # Fail build if tests fail
```

**Exit Codes**:
- `0`: All tests passed
- `1`: One or more tests failed

## Maintenance

### Adding New Tests

To add a new test:

1. Create a new test function following the pattern:
```javascript
async function testNewFeature() {
  const step = 'NEW_FEATURE';
  log(step, 'Testing new feature...');
  const startTime = Date.now();
  
  try {
    // Test implementation
    const response = await axios.get(`${API_URL}/new-endpoint`);
    
    const duration = Date.now() - startTime;
    testResults.timings.newFeature = duration;
    
    if (response.status === 200) {
      logSuccess(step, 'Test passed', { duration: `${duration}ms` });
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

2. Add the test to `runTests()`:
```javascript
await testNewFeature();
```

3. Update the test count in `testResults`:
```javascript
totalTests: 11, // Increment this
```

4. Add the test to the summary output in `printSummary()`.

### Updating Test Data

Test data can be modified in the configuration section at the top of the file:

```javascript
const TEST_USER = {
  name: `Test User ${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  phone: '1234567890'
};
```

## Comparison with Original Smoke Test

**enhanced-smoke-test.js** provides:
- ✅ More comprehensive test coverage (10 tests vs 5)
- ✅ Better error reporting with detailed context
- ✅ Performance metrics for all operations
- ✅ Model management testing
- ✅ Payment upload testing
- ✅ Data validation (null/dash value checking)
- ✅ Cleaner summary output
- ✅ Better skip handling for optional tests

**smoke-test.js** (original):
- Basic health, register, login, order creation tests
- Less detailed error reporting
- No model or payment testing

Both tests are maintained for different purposes:
- **smoke-test.js**: Quick basic checks in CI/CD
- **enhanced-smoke-test.js**: Comprehensive pre-deployment testing

## Best Practices

1. **Run locally first**: Test against localhost before production
2. **Check logs**: Always review backend logs after test runs
3. **Clean up**: Tests create test data - clean up manually if needed
4. **Monitor performance**: Watch timing metrics for performance regression
5. **Update regularly**: Keep tests in sync with API changes
6. **Document failures**: Record and investigate all failures

## Support

For issues or questions:
1. Check backend logs in Render dashboard
2. Review Supabase logs for database/storage issues
3. Verify all environment variables are set correctly
4. Test individual endpoints manually with curl/Postman

---

**Last Updated**: November 12, 2025
**Version**: 1.0.0
**Maintainer**: AI Agent / Repository Owner
