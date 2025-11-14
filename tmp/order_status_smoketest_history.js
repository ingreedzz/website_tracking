#!/usr/bin/env node

/**
 * Order Status History Smoke Test
 * 
 * Tests the complete order status history feature:
 * 1. Register a test user
 * 2. Login to get JWT token
 * 3. Create an order
 * 4. Update order status
 * 5. Fetch order details and verify history is present
 * 
 * Usage:
 *   node tmp/order_status_smoketest_history.js [base-url]
 *   
 * Examples:
 *   node tmp/order_status_smoketest_history.js                                    # Uses default
 *   node tmp/order_status_smoketest_history.js https://website-tracking.onrender.com
 *   node tmp/order_status_smoketest_history.js http://localhost:3000
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.TEST_API_URL || process.argv[2] || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test data
const timestamp = Date.now();
const TEST_USER = {
  name: `History Test User ${timestamp}`,
  email: `historytest${timestamp}@example.com`,
  password: 'TestPassword123!',
  phone: '1234567890'
};

let testToken = null;
let testOrderId = null;

// Logger
function log(step, message, data = null) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${step}] ${message}`);
  if (data && typeof data === 'object') {
    console.log(`[${ts}] [${step}] Data:`, JSON.stringify(data, null, 2));
  } else if (data) {
    console.log(`[${ts}] [${step}] Data:`, data);
  }
}

function logError(step, error) {
  const ts = new Date().toISOString();
  console.error(`[${ts}] [${step}] ❌ ERROR: ${error.message}`);
  if (error.response) {
    console.error(`[${ts}] [${step}] Status: ${error.response.status}`);
    console.error(`[${ts}] [${step}] Response:`, JSON.stringify(error.response.data, null, 2));
  }
  if (error.code) {
    console.error(`[${ts}] [${step}] Error Code: ${error.code}`);
  }
}

function logSuccess(step, message) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${step}] ✅ ${message}`);
}

// Helper to create a small test image
function createTestImage() {
  // Create a 1x1 pixel PNG image in memory
  const buffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
    0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  return buffer;
}

// Test 1: Register user
async function testRegister() {
  log('REGISTER', 'Registering test user', { email: TEST_USER.email });
  
  try {
    const response = await axios.post(`${API_URL}/register`, TEST_USER, {
      timeout: 10000
    });
    
    if (response.status === 200 && response.data.token) {
      testToken = response.data.token;
      logSuccess('REGISTER', 'User registered successfully');
      log('REGISTER', 'Token received', { tokenLength: testToken.length });
      return true;
    } else {
      logError('REGISTER', new Error('Invalid response format'));
      return false;
    }
  } catch (error) {
    logError('REGISTER', error);
    return false;
  }
}

// Test 2: Login user
async function testLogin() {
  log('LOGIN', 'Logging in', { email: TEST_USER.email });
  
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    }, {
      timeout: 10000
    });
    
    if (response.status === 200 && response.data.token) {
      testToken = response.data.token;
      logSuccess('LOGIN', 'Login successful');
      return true;
    } else {
      logError('LOGIN', new Error('Invalid response format'));
      return false;
    }
  } catch (error) {
    logError('LOGIN', error);
    return false;
  }
}

// Test 3: Create order
async function testCreateOrder() {
  log('CREATE_ORDER', 'Creating test order');
  
  try {
    const formData = new FormData();
    formData.append('product', 'Test Product');
    formData.append('model', 'KaosOblongDewasa');
    formData.append('size', 'L');
    formData.append('color', 'Blue');
    formData.append('quantity', '5');
    formData.append('custom', JSON.stringify({ lingkar_dada: 100, panjang_baju: 70 }));
    formData.append('notes', 'Test order for history smoke test');
    formData.append('customer_name', 'Test Customer');
    formData.append('order_name', 'History Test Order');
    
    // Add test image
    const imageBuffer = createTestImage();
    formData.append('sablon', imageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    
    const response = await axios.post(`${API_URL}/server/orders`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${testToken}`
      },
      timeout: 30000
    });
    
    if (response.status === 200 && response.data.order && response.data.order.orders_id) {
      testOrderId = response.data.order.orders_id;
      logSuccess('CREATE_ORDER', 'Order created successfully');
      log('CREATE_ORDER', 'Order ID', { orderId: testOrderId });
      return true;
    } else {
      logError('CREATE_ORDER', new Error('Invalid response format'));
      log('CREATE_ORDER', 'Response', response.data);
      return false;
    }
  } catch (error) {
    logError('CREATE_ORDER', error);
    return false;
  }
}

// Test 4: Update order status
async function testUpdateStatus() {
  log('UPDATE_STATUS', 'Updating order status', { orderId: testOrderId });
  
  try {
    const response = await axios.put(
      `${API_URL}/server/orders/${testOrderId}/status`,
      {
        status: 'confirmed',
        note: 'Status updated by smoke test'
      },
      {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (response.status === 200) {
      logSuccess('UPDATE_STATUS', 'Order status updated successfully');
      return true;
    } else {
      logError('UPDATE_STATUS', new Error(`Unexpected status code: ${response.status}`));
      return false;
    }
  } catch (error) {
    logError('UPDATE_STATUS', error);
    return false;
  }
}

// Test 5: Verify history
async function testVerifyHistory() {
  log('VERIFY_HISTORY', 'Fetching order and verifying history', { orderId: testOrderId });
  
  try {
    const response = await axios.get(`${API_URL}/orders/${testOrderId}`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      },
      timeout: 10000
    });
    
    if (response.status !== 200) {
      logError('VERIFY_HISTORY', new Error(`Unexpected status code: ${response.status}`));
      return false;
    }
    
    const order = response.data;
    log('VERIFY_HISTORY', 'Order fetched', {
      orderId: order.id || order.orders_id,
      status: order.status,
      hasHistory: !!order.history
    });
    
    // Check if history exists
    if (!order.history) {
      logError('VERIFY_HISTORY', new Error('Order response does not contain history field'));
      log('VERIFY_HISTORY', 'Order data', order);
      
      // Check if order_status_history table might be missing
      console.warn('\n⚠️  WARNING: order_status_history table or columns may be missing in database.');
      console.warn('⚠️  The backend should have returned an empty history array.');
      console.warn('⚠️  Please check the backend logs and run the migration:');
      console.warn('⚠️  backend/database/migrations/20251114_add_order_status_history_fields.sql\n');
      
      return false;
    }
    
    if (!Array.isArray(order.history)) {
      logError('VERIFY_HISTORY', new Error('History field is not an array'));
      log('VERIFY_HISTORY', 'History value', order.history);
      return false;
    }
    
    log('VERIFY_HISTORY', 'History array found', { historyCount: order.history.length });
    
    // Check if history contains at least one entry
    if (order.history.length === 0) {
      console.warn('\n⚠️  WARNING: History array is empty.');
      console.warn('⚠️  This could mean:');
      console.warn('⚠️  1. The order_status_history table exists but is not being populated');
      console.warn('⚠️  2. The status update trigger is not configured');
      console.warn('⚠️  3. The migration needs to be applied\n');
      
      return false;
    }
    
    // Verify history entry contains expected data
    const historyEntry = order.history[0]; // Most recent entry (sorted desc)
    log('VERIFY_HISTORY', 'Most recent history entry', historyEntry);
    
    const hasNewStatus = !!historyEntry.new_status;
    const hasChangedBy = !!(historyEntry.changed_by || historyEntry.changed_by_id || historyEntry.changed_by_email);
    const statusMatches = historyEntry.new_status === 'confirmed';
    
    if (!hasNewStatus) {
      logError('VERIFY_HISTORY', new Error('History entry missing new_status field'));
      return false;
    }
    
    if (!hasChangedBy) {
      logError('VERIFY_HISTORY', new Error('History entry missing changed_by information'));
      return false;
    }
    
    if (!statusMatches) {
      logError('VERIFY_HISTORY', new Error(`Status mismatch: expected 'confirmed', got '${historyEntry.new_status}'`));
      return false;
    }
    
    logSuccess('VERIFY_HISTORY', 'History verified successfully');
    log('VERIFY_HISTORY', 'History validation', {
      hasNewStatus,
      hasChangedBy,
      statusMatches,
      historyCount: order.history.length
    });
    
    return true;
  } catch (error) {
    logError('VERIFY_HISTORY', error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  ORDER STATUS HISTORY SMOKE TEST');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`Target: ${BASE_URL}`);
  console.log(`API: ${API_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('════════════════════════════════════════════════════════════════\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Register
  if (await testRegister()) {
    passed++;
  } else {
    failed++;
    console.log('\n❌ FAIL: Cannot proceed without registration\n');
    process.exit(1);
  }
  
  // Test 2: Login (optional, already have token from register)
  // Uncomment if you want to test login separately
  // if (await testLogin()) {
  //   passed++;
  // } else {
  //   failed++;
  // }
  
  // Test 3: Create order
  if (await testCreateOrder()) {
    passed++;
  } else {
    failed++;
    console.log('\n❌ FAIL: Cannot proceed without order\n');
    process.exit(1);
  }
  
  // Test 4: Update status
  if (await testUpdateStatus()) {
    passed++;
  } else {
    failed++;
    console.log('\n❌ FAIL: Cannot proceed without status update\n');
    process.exit(1);
  }
  
  // Test 5: Verify history
  if (await testVerifyHistory()) {
    passed++;
  } else {
    failed++;
  }
  
  // Summary
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log('════════════════════════════════════════════════════════════════\n');
  
  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
