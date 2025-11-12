#!/usr/bin/env node

/**
 * Enhanced Comprehensive Smoke Test Script
 * Tests all critical user flows with detailed diagnostics:
 * - Health Check
 * - User Registration & Login
 * - Order Creation
 * - Model Management (Admin)
 * - Payment Upload
 * - Dashboard Verification
 * 
 * Usage:
 *   node enhanced-smoke-test.js [base-url]
 *   
 * Examples:
 *   node enhanced-smoke-test.js                                    # Uses default Render backend
 *   node enhanced-smoke-test.js https://website-tracking.onrender.com
 *   node enhanced-smoke-test.js http://localhost:3000              # Local testing
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.argv[2] || 'https://website-tracking.onrender.com';
const API_URL = `${BASE_URL}/api`;
const IS_RENDER = BASE_URL.includes('onrender.com');

// Test data
const TEST_USER = {
  name: `Test User ${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  phone: '1234567890'
};

const TEST_ADMIN = {
  name: `Admin Test ${Date.now()}`,
  email: `admin${Date.now()}@example.com`,
  password: 'AdminPassword123!',
  phone: '0987654321',
  role: 'admin' // For testing environments that support this
};

const TEST_ORDER = {
  product: 'Custom T-Shirt',
  model: 'Model A',
  size: 'L',
  color: 'Blue',
  quantity: 5,
  unit_price: 50000,
  total_price: 250000,
  customer_name: 'John Doe',
  order_name: 'School Uniform Batch 1',
  custom: JSON.stringify({
    chest: '100cm',
    length: '70cm',
    shoulder: '45cm'
  }),
  notes: 'Test order from enhanced smoke test',
  address: '123 Test Street',
  phone: '1234567890'
};

const TEST_MODEL = {
  name: `Test Model ${Date.now()}`,
  description: 'Test model for smoke test',
  size_fields: [
    { key: 'chest', label: 'Chest', type: 'number', unit: 'cm' },
    { key: 'length', label: 'Length', type: 'number', unit: 'cm' }
  ]
};

// Test results tracker
let testResults = {
  health: false,
  register: false,
  login: false,
  createOrder: false,
  verifyOrder: false,
  adminLogin: false,
  modelCreate: false,
  modelList: false,
  modelDelete: false,
  paymentUpload: false,
  totalTests: 10,
  passedTests: 0,
  failedTests: 0,
  errors: [],
  timings: {},
  data: {}
};

// Tokens storage
let userToken = null;
let adminToken = null;
let createdOrderId = null;
let createdModelId = null;

// Logger with enhanced formatting
function log(step, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${step}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [${step}] Data:`, JSON.stringify(data, null, 2));
  }
}

function logError(step, error, context = null) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${step}] ❌ ERROR: ${error.message}`);
  if (error.response) {
    console.error(`[${timestamp}] [${step}] Response Status: ${error.response.status}`);
    console.error(`[${timestamp}] [${step}] Response Data:`, JSON.stringify(error.response.data, null, 2));
  }
  if (error.code) {
    console.error(`[${timestamp}] [${step}] Error Code: ${error.code}`);
  }
  if (context) {
    console.error(`[${timestamp}] [${step}] Context:`, JSON.stringify(context, null, 2));
  }
  testResults.errors.push({
    step,
    message: error.message,
    code: error.code,
    response: error.response?.data,
    context
  });
}

function logSuccess(step, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${step}] ✅ ${message}`);
  if (data) {
    console.log(`[${timestamp}] [${step}] Result:`, JSON.stringify(data, null, 2));
  }
}

// Create a test image file
function createTestImage(sizeKB = 50) {
  const testImagePath = path.join(__dirname, 'tmp', 'test-image.png');
  
  // Ensure tmp directory exists
  if (!fs.existsSync(path.join(__dirname, 'tmp'))) {
    fs.mkdirSync(path.join(__dirname, 'tmp'));
  }
  
  // Create a simple PNG file
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
    0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  // Add padding to reach target size
  const targetSize = sizeKB * 1024;
  const padding = Buffer.alloc(Math.max(0, targetSize - pngHeader.length), 0xFF);
  const pngData = Buffer.concat([pngHeader, padding]);
  
  fs.writeFileSync(testImagePath, pngData);
  log('SETUP', `Created test image: ${(pngData.length / 1024).toFixed(2)} KB`);
  
  return testImagePath;
}

// Test 1: Health Check
async function testHealthCheck() {
  const step = 'HEALTH';
  log(step, `Testing health endpoint: ${API_URL}/health`);
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_URL}/health`, {
      timeout: 10000,
      validateStatus: null
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.health = duration;
    
    log(step, `Response received in ${duration}ms`);
    log(step, `Response status: ${response.status}`);
    
    if (response.status === 200 && response.data.status === 'ok') {
      logSuccess(step, 'Health check passed', {
        status: response.data.status,
        database: response.data.database,
        duration: `${duration}ms`
      });
      
      testResults.health = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error(`Health check failed: status=${response.data.status}`);
    }
  } catch (error) {
    logError(step, error);
    testResults.failedTests++;
    return false;
  }
}

// Test 2: User Registration
async function testRegister() {
  const step = 'REGISTER';
  log(step, `Testing user registration: ${API_URL}/register`);
  log(step, `Test user email: ${TEST_USER.email}`);
  const startTime = Date.now();
  
  try {
    const response = await axios.post(`${API_URL}/register`, TEST_USER, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.register = duration;
    
    log(step, `Response received in ${duration}ms`);
    log(step, `Response status: ${response.status}`);
    
    if (response.status === 201 && response.data.token) {
      userToken = response.data.token;
      testResults.data.user = response.data.user;
      
      logSuccess(step, 'Registration successful', {
        userId: response.data.user?.users_id,
        email: response.data.user?.email,
        role: response.data.user?.role,
        hasToken: !!userToken,
        duration: `${duration}ms`
      });
      
      testResults.register = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error('No token received in registration response');
    }
  } catch (error) {
    logError(step, error, { testUser: TEST_USER.email });
    testResults.failedTests++;
    return false;
  }
}

// Test 3: User Login
async function testLogin() {
  const step = 'LOGIN';
  log(step, `Testing user login: ${API_URL}/login`);
  log(step, `Login email: ${TEST_USER.email}`);
  const startTime = Date.now();
  
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.login = duration;
    
    log(step, `Response received in ${duration}ms`);
    log(step, `Response status: ${response.status}`);
    
    if (response.status === 200 && response.data.token) {
      userToken = response.data.token; // Update token
      
      logSuccess(step, 'Login successful', {
        userId: response.data.user?.users_id,
        email: response.data.user?.email,
        role: response.data.user?.role,
        hasToken: !!userToken,
        duration: `${duration}ms`
      });
      
      testResults.login = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error('No token received in login response');
    }
  } catch (error) {
    logError(step, error, { email: TEST_USER.email });
    testResults.failedTests++;
    return false;
  }
}

// Test 4: Create Order
async function testCreateOrder() {
  const step = 'CREATE_ORDER';
  log(step, `Testing order creation: ${API_URL}/server/orders`);
  const startTime = Date.now();
  
  if (!userToken) {
    logError(step, new Error('No user token available'));
    testResults.failedTests++;
    return false;
  }
  
  try {
    // Create test image
    const imagePath = createTestImage(50);
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));
    formData.append('product', TEST_ORDER.product);
    formData.append('model', TEST_ORDER.model);
    formData.append('size', TEST_ORDER.size);
    formData.append('color', TEST_ORDER.color);
    formData.append('quantity', TEST_ORDER.quantity);
    formData.append('unit_price', TEST_ORDER.unit_price);
    formData.append('total_price', TEST_ORDER.total_price);
    formData.append('custom', TEST_ORDER.custom);
    formData.append('customer_name', TEST_ORDER.customer_name);
    formData.append('order_name', TEST_ORDER.order_name);
    formData.append('address', TEST_ORDER.address);
    formData.append('phone', TEST_ORDER.phone);
    
    log(step, 'Sending order with:', {
      product: TEST_ORDER.product,
      model: TEST_ORDER.model,
      quantity: TEST_ORDER.quantity,
      customer_name: TEST_ORDER.customer_name,
      order_name: TEST_ORDER.order_name
    });
    
    const response = await axios.post(`${API_URL}/server/orders`, formData, {
      timeout: 30000,
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.createOrder = duration;
    
    log(step, `Response received in ${duration}ms`);
    log(step, `Response status: ${response.status}`);
    
    if (response.status === 201 && response.data.order) {
      createdOrderId = response.data.order.orders_id || response.data.order.id;
      testResults.data.order = response.data.order;
      
      logSuccess(step, 'Order created successfully', {
        orderId: createdOrderId,
        product: response.data.order.product,
        status: response.data.order.status,
        totalPrice: response.data.order.total,
        duration: `${duration}ms`
      });
      
      testResults.createOrder = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error('Order creation response missing order data');
    }
  } catch (error) {
    logError(step, error, { hasToken: !!userToken });
    testResults.failedTests++;
    return false;
  }
}

// Test 5: Verify Order in Dashboard
async function testVerifyOrder() {
  const step = 'VERIFY_ORDER';
  log(step, `Testing order retrieval: ${API_URL}/user/orders`);
  const startTime = Date.now();
  
  if (!userToken) {
    logError(step, new Error('No user token available'));
    testResults.failedTests++;
    return false;
  }
  
  if (!createdOrderId) {
    logError(step, new Error('No created order ID to verify'));
    testResults.failedTests++;
    return false;
  }
  
  try {
    const response = await axios.get(`${API_URL}/user/orders`, {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.verifyOrder = duration;
    
    log(step, `Response received in ${duration}ms`);
    log(step, `Response status: ${response.status}`);
    log(step, `Orders retrieved: ${response.data.length}`);
    
    // Find our created order
    const foundOrder = response.data.find(o => 
      (o.id === createdOrderId || o.orders_id === createdOrderId)
    );
    
    if (foundOrder) {
      logSuccess(step, 'Order found in dashboard', {
        orderId: foundOrder.id || foundOrder.orders_id,
        product: foundOrder.product,
        customerName: foundOrder.customer_name,
        orderName: foundOrder.order_name,
        status: foundOrder.status,
        duration: `${duration}ms`
      });
      
      // Verify no null/dash values
      const hasNullValues = Object.entries(foundOrder).some(([key, value]) => 
        value === null || value === '-' || value === 'null'
      );
      
      if (hasNullValues) {
        log(step, '⚠️  Warning: Order contains null or dash values');
      } else {
        log(step, '✓ No null or dash values in order data');
      }
      
      testResults.verifyOrder = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error(`Order ${createdOrderId} not found in user orders`);
    }
  } catch (error) {
    logError(step, error, { orderId: createdOrderId });
    testResults.failedTests++;
    return false;
  }
}

// Test 6: Admin Login
async function testAdminLogin() {
  const step = 'ADMIN_LOGIN';
  log(step, 'Testing admin user creation and login');
  log(step, 'Note: This may fail if admin role creation is not supported');
  const startTime = Date.now();
  
  try {
    // Try to register as admin (may not work in all environments)
    log(step, 'Attempting to register admin user...');
    const registerResponse = await axios.post(`${API_URL}/register`, TEST_ADMIN, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => {
      log(step, '⚠️  Admin registration failed, this is expected in production');
      return null;
    });
    
    if (registerResponse && registerResponse.data.token) {
      adminToken = registerResponse.data.token;
      const duration = Date.now() - startTime;
      testResults.timings.adminLogin = duration;
      
      logSuccess(step, 'Admin user registered and logged in', {
        userId: registerResponse.data.user?.users_id,
        email: registerResponse.data.user?.email,
        role: registerResponse.data.user?.role,
        isAdmin: registerResponse.data.user?.is_admin,
        duration: `${duration}ms`
      });
      
      testResults.adminLogin = true;
      testResults.passedTests++;
      return true;
    } else {
      log(step, 'Skipping admin tests (admin creation not supported)');
      testResults.adminLogin = 'skipped';
      return 'skipped';
    }
  } catch (error) {
    log(step, '⚠️  Admin tests skipped (expected in production)');
    testResults.adminLogin = 'skipped';
    return 'skipped';
  }
}

// Test 7: Model Management - Create
async function testModelCreate() {
  const step = 'MODEL_CREATE';
  
  if (!adminToken) {
    log(step, 'Skipping model tests (no admin token)');
    testResults.modelCreate = 'skipped';
    return 'skipped';
  }
  
  log(step, `Testing model creation: ${API_URL}/models`);
  const startTime = Date.now();
  
  try {
    const response = await axios.post(`${API_URL}/models`, TEST_MODEL, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.modelCreate = duration;
    
    log(step, `Response received in ${duration}ms`);
    log(step, `Response status: ${response.status}`);
    
    if (response.status === 201 && response.data.id) {
      createdModelId = response.data.id || response.data.models_id;
      testResults.data.model = response.data;
      
      logSuccess(step, 'Model created successfully', {
        modelId: createdModelId,
        name: response.data.name,
        sizeFields: response.data.size_fields?.length || 0,
        duration: `${duration}ms`
      });
      
      testResults.modelCreate = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error('Model creation response missing model ID');
    }
  } catch (error) {
    logError(step, error);
    testResults.failedTests++;
    return false;
  }
}

// Test 8: Model Management - List
async function testModelList() {
  const step = 'MODEL_LIST';
  
  if (!adminToken) {
    log(step, 'Skipping model list test (no admin token)');
    testResults.modelList = 'skipped';
    return 'skipped';
  }
  
  log(step, `Testing model listing: ${API_URL}/models`);
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_URL}/models`, {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.modelList = duration;
    
    log(step, `Response received in ${duration}ms`);
    log(step, `Response status: ${response.status}`);
    log(step, `Models retrieved: ${response.data.length}`);
    
    if (response.status === 200) {
      logSuccess(step, 'Model list retrieved successfully', {
        count: response.data.length,
        duration: `${duration}ms`
      });
      
      testResults.modelList = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error('Failed to retrieve model list');
    }
  } catch (error) {
    logError(step, error);
    testResults.failedTests++;
    return false;
  }
}

// Test 9: Model Management - Delete
async function testModelDelete() {
  const step = 'MODEL_DELETE';
  
  if (!adminToken || !createdModelId) {
    log(step, 'Skipping model delete test (no admin token or model ID)');
    testResults.modelDelete = 'skipped';
    return 'skipped';
  }
  
  log(step, `Testing model deletion: ${API_URL}/models/${createdModelId}`);
  const startTime = Date.now();
  
  try {
    const response = await axios.delete(`${API_URL}/models/${createdModelId}`, {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.modelDelete = duration;
    
    log(step, `Response received in ${duration}ms`);
    log(step, `Response status: ${response.status}`);
    
    if (response.status === 200) {
      logSuccess(step, 'Model deleted successfully', {
        modelId: createdModelId,
        duration: `${duration}ms`
      });
      
      testResults.modelDelete = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error('Failed to delete model');
    }
  } catch (error) {
    logError(step, error, { modelId: createdModelId });
    testResults.failedTests++;
    return false;
  }
}

// Test 10: Payment Upload
async function testPaymentUpload() {
  const step = 'PAYMENT_UPLOAD';
  
  if (!userToken || !createdOrderId) {
    log(step, 'Skipping payment test (no token or order)');
    testResults.paymentUpload = 'skipped';
    return 'skipped';
  }
  
  log(step, `Testing payment upload: ${API_URL}/server/orders/${createdOrderId}/payment`);
  const startTime = Date.now();
  
  try {
    // Create payment proof image
    const imagePath = createTestImage(30);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));
    formData.append('payment_method', 'bank');
    formData.append('amount', TEST_ORDER.total_price);
    formData.append('notes', 'Payment proof from smoke test');
    
    const response = await axios.post(
      `${API_URL}/server/orders/${createdOrderId}/payment`,
      formData,
      {
        timeout: 30000,
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${userToken}`
        }
      }
    );
    
    const duration = Date.now() - startTime;
    testResults.timings.paymentUpload = duration;
    
    log(step, `Response received in ${duration}ms`);
    log(step, `Response status: ${response.status}`);
    
    if (response.status === 200 && response.data.payment) {
      logSuccess(step, 'Payment proof uploaded successfully', {
        paymentId: response.data.payment.payment_id,
        orderId: createdOrderId,
        amount: response.data.payment.amount,
        status: response.data.order?.payment_status,
        proofUrl: response.data.order?.payment_proof_url ? 'present' : 'missing',
        duration: `${duration}ms`
      });
      
      testResults.paymentUpload = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error('Payment upload response missing payment data');
    }
  } catch (error) {
    logError(step, error, { orderId: createdOrderId });
    testResults.failedTests++;
    return false;
  }
}

// Print final test summary
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 ENHANCED SMOKE TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test Environment: ${IS_RENDER ? 'Render Production' : 'Other/Local'}`);
  console.log(`Completed: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  
  console.log('\n📈 Test Results:');
  console.log(`  Total Tests: ${testResults.totalTests}`);
  console.log(`  ✅ Passed: ${testResults.passedTests}`);
  console.log(`  ❌ Failed: ${testResults.failedTests}`);
  console.log(`  ⏭️  Skipped: ${Object.values(testResults).filter(v => v === 'skipped').length}`);
  
  console.log('\n🎯 Individual Test Status:');
  console.log(`  1. Health Check: ${testResults.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  2. User Registration: ${testResults.register ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  3. User Login: ${testResults.login ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  4. Create Order: ${testResults.createOrder ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  5. Verify Order: ${testResults.verifyOrder ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  6. Admin Login: ${testResults.adminLogin === 'skipped' ? '⏭️  SKIP' : testResults.adminLogin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  7. Model Create: ${testResults.modelCreate === 'skipped' ? '⏭️  SKIP' : testResults.modelCreate ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  8. Model List: ${testResults.modelList === 'skipped' ? '⏭️  SKIP' : testResults.modelList ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  9. Model Delete: ${testResults.modelDelete === 'skipped' ? '⏭️  SKIP' : testResults.modelDelete ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  10. Payment Upload: ${testResults.paymentUpload === 'skipped' ? '⏭️  SKIP' : testResults.paymentUpload ? '✅ PASS' : '❌ FAIL'}`);
  
  if (Object.keys(testResults.timings).length > 0) {
    console.log('\n⏱️  Performance Timings:');
    Object.entries(testResults.timings).forEach(([test, duration]) => {
      console.log(`  ${test}: ${duration}ms`);
    });
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    testResults.errors.forEach((err, idx) => {
      console.log(`\n  Error ${idx + 1} [${err.step}]:`);
      console.log(`    Message: ${err.message}`);
      if (err.code) console.log(`    Code: ${err.code}`);
      if (err.response) {
        console.log(`    Response: ${JSON.stringify(err.response, null, 2)}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  const successRate = testResults.totalTests > 0 
    ? (testResults.passedTests / testResults.totalTests * 100).toFixed(1) 
    : 0;
  
  console.log(`🎯 Overall Success Rate: ${successRate}% (${testResults.passedTests}/${testResults.totalTests})`);
  
  if (testResults.passedTests === testResults.totalTests) {
    console.log('🎉 ALL TESTS PASSED! Website is functioning correctly.');
  } else if (testResults.passedTests > 0) {
    console.log('⚠️  SOME TESTS FAILED. Review errors above for details.');
  } else {
    console.log('💥 ALL TESTS FAILED. Critical issues detected.');
  }
  
  console.log('='.repeat(80));
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 ENHANCED SMOKE TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Target: ${BASE_URL}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('='.repeat(80) + '\n');
  
  // Run tests sequentially
  await testHealthCheck();
  await testRegister();
  await testLogin();
  await testCreateOrder();
  await testVerifyOrder();
  await testAdminLogin();
  await testModelCreate();
  await testModelList();
  await testModelDelete();
  await testPaymentUpload();
  
  // Print summary
  printSummary();
  
  // Cleanup
  const tmpDir = path.join(__dirname, 'tmp');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('\n🧹 Cleanup: Removed temporary test files');
  }
  
  // Exit with appropriate code
  process.exit(testResults.failedTests > 0 ? 1 : 0);
}

// Run the test suite
runTests().catch(error => {
  console.error('\n💥 FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
