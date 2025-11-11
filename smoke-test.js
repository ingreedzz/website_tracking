#!/usr/bin/env node

/**
 * Comprehensive Smoke Test Script
 * Tests: Register → Login → Create Order → Submit Order → Verify Dashboard
 * 
 * Usage:
 *   node smoke-test.js [base-url]
 *   
 * Examples:
 *   node smoke-test.js                                    # Uses default Render backend
 *   node smoke-test.js https://website-tracking.onrender.com
 *   node smoke-test.js http://localhost:3000              # Local testing
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.argv[2] || 'https://website-tracking.onrender.com';
const API_URL = `${BASE_URL}/api`;

// Test data
const TEST_USER = {
  name: `Test User ${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  phone: '1234567890'
};

const TEST_ORDER = {
  product: 'custom-tshirt',
  model: 'Model A',
  size: 'L',
  color: 'Blue',
  quantity: 5,
  custom: JSON.stringify({
    chest: '100cm',
    length: '70cm',
    shoulder: '45cm'
  }),
  notes: 'Test order from smoke test'
};

// Test results
let testResults = {
  health: false,
  register: false,
  login: false,
  createOrder: false,
  verifyDashboard: false,
  totalTests: 5,
  passedTests: 0,
  failedTests: 0,
  errors: []
};

// Logger with request tracing
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
  if (context) {
    console.error(`[${timestamp}] [${step}] Context:`, JSON.stringify(context, null, 2));
  }
  testResults.errors.push({
    step,
    message: error.message,
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
function createTestImage() {
  const testImagePath = path.join(__dirname, 'tmp', 'test-image.png');
  
  // Ensure tmp directory exists
  if (!fs.existsSync(path.join(__dirname, 'tmp'))) {
    fs.mkdirSync(path.join(__dirname, 'tmp'));
  }
  
  // Create a minimal PNG file (1x1 red pixel)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
    0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync(testImagePath, pngData);
  return testImagePath;
}

// Test 1: Health Check
async function testHealthCheck() {
  const step = 'HEALTH';
  log(step, `Testing health endpoint: ${API_URL}/health`);
  
  try {
    const response = await axios.get(`${API_URL}/health`, {
      timeout: 10000
    });
    
    if (response.status === 200 && response.data.status === 'ok') {
      logSuccess(step, 'Health check passed', {
        status: response.data.status,
        database: response.data.database
      });
      testResults.health = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
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
  log(step, 'Testing user registration', { email: TEST_USER.email });
  
  try {
    const response = await axios.post(`${API_URL}/register`, TEST_USER, {
      timeout: 10000
    });
    
    if (response.status === 201 && response.data.user && response.data.token) {
      logSuccess(step, 'Registration successful', {
        userId: response.data.user.users_id,
        email: response.data.user.email,
        role: response.data.user.role,
        hasToken: !!response.data.token
      });
      testResults.register = true;
      testResults.passedTests++;
      return response.data;
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logError(step, error, { testUser: TEST_USER });
    testResults.failedTests++;
    return null;
  }
}

// Test 3: User Login
async function testLogin() {
  const step = 'LOGIN';
  log(step, 'Testing user login', { email: TEST_USER.email });
  
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    }, {
      timeout: 10000
    });
    
    if (response.status === 200 && response.data.user && response.data.token) {
      logSuccess(step, 'Login successful', {
        userId: response.data.user.users_id,
        email: response.data.user.email,
        role: response.data.user.role,
        hasToken: !!response.data.token
      });
      testResults.login = true;
      testResults.passedTests++;
      return response.data;
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logError(step, error, { email: TEST_USER.email });
    testResults.failedTests++;
    return null;
  }
}

// Test 4: Create Order
async function testCreateOrder(token) {
  const step = 'CREATE_ORDER';
  log(step, 'Testing order creation', TEST_ORDER);
  
  try {
    // Create test image
    const imagePath = createTestImage();
    
    // Create form data
    const formData = new FormData();
    formData.append('product', TEST_ORDER.product);
    formData.append('model', TEST_ORDER.model);
    formData.append('size', TEST_ORDER.size);
    formData.append('color', TEST_ORDER.color);
    formData.append('quantity', TEST_ORDER.quantity);
    formData.append('custom', TEST_ORDER.custom);
    formData.append('notes', TEST_ORDER.notes);
    formData.append('sablon', fs.createReadStream(imagePath));
    
    const response = await axios.post(`${API_URL}/server/orders`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000 // Longer timeout for file upload
    });
    
    // Clean up test image
    fs.unlinkSync(imagePath);
    
    if (response.status === 201 && response.data.orders_id) {
      logSuccess(step, 'Order created successfully', {
        orderId: response.data.orders_id,
        status: response.data.status,
        product: response.data.product,
        imageUrl: response.data.sablon_image_url
      });
      testResults.createOrder = true;
      testResults.passedTests++;
      return response.data;
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logError(step, error, TEST_ORDER);
    testResults.failedTests++;
    return null;
  }
}

// Test 5: Verify Dashboard
async function testVerifyDashboard(token, userId) {
  const step = 'VERIFY_DASHBOARD';
  log(step, 'Testing dashboard order retrieval', { userId });
  
  try {
    const response = await axios.get(`${API_URL}/user/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    if (response.status === 200 && Array.isArray(response.data)) {
      const orders = response.data;
      logSuccess(step, 'Dashboard verification successful', {
        totalOrders: orders.length,
        hasData: orders.length > 0,
        latestOrder: orders[0] ? {
          id: orders[0].id || orders[0].orders_id,
          product: orders[0].product,
          status: orders[0].status,
          hasNullFields: Object.entries(orders[0]).filter(([k, v]) => v === null || v === '-').map(([k]) => k)
        } : null
      });
      
      // Check for null or '-' values in dashboard
      if (orders.length > 0) {
        const latestOrder = orders[0];
        const nullFields = Object.entries(latestOrder)
          .filter(([key, value]) => value === null || value === '-')
          .map(([key]) => key);
        
        if (nullFields.length > 0) {
          log(step, `⚠️  Warning: Found null/dash fields in order: ${nullFields.join(', ')}`);
        } else {
          log(step, '✅ No null or dash fields found in order data');
        }
      }
      
      testResults.verifyDashboard = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logError(step, error, { userId });
    testResults.failedTests++;
    return false;
  }
}

// Main test runner
async function runSmokeTests() {
  console.log('='.repeat(80));
  console.log('🧪 SMOKE TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  console.log('');
  
  // Test 1: Health Check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Health check failed. Aborting tests.');
    printSummary();
    process.exit(1);
  }
  
  console.log('');
  
  // Test 2: Register
  const registerData = await testRegister();
  if (!registerData) {
    console.log('\n❌ Registration failed. Aborting tests.');
    printSummary();
    process.exit(1);
  }
  
  console.log('');
  
  // Test 3: Login
  const loginData = await testLogin();
  if (!loginData) {
    console.log('\n❌ Login failed. Aborting tests.');
    printSummary();
    process.exit(1);
  }
  
  console.log('');
  
  // Test 4: Create Order
  const orderData = await testCreateOrder(loginData.token);
  if (!orderData) {
    console.log('\n❌ Order creation failed. Continuing with dashboard test...');
  }
  
  console.log('');
  
  // Test 5: Verify Dashboard
  await testVerifyDashboard(loginData.token, loginData.user.users_id);
  
  console.log('');
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  process.exit(testResults.failedTests > 0 ? 1 : 0);
}

function printSummary() {
  console.log('='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests:  ${testResults.totalTests}`);
  console.log(`Passed:       ${testResults.passedTests} ✅`);
  console.log(`Failed:       ${testResults.failedTests} ❌`);
  console.log('');
  console.log('Test Results:');
  console.log(`  1. Health Check:        ${testResults.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  2. User Registration:   ${testResults.register ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  3. User Login:          ${testResults.login ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  4. Create Order:        ${testResults.createOrder ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  5. Verify Dashboard:    ${testResults.verifyDashboard ? '✅ PASS' : '❌ FAIL'}`);
  
  if (testResults.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    testResults.errors.forEach((error, idx) => {
      console.log(`  ${idx + 1}. [${error.step}] ${error.message}`);
      if (error.response) {
        console.log(`     Response: ${JSON.stringify(error.response)}`);
      }
    });
  }
  
  console.log('='.repeat(80));
  console.log(`Finished: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
}

// Run tests
runSmokeTests().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error);
  process.exit(1);
});
