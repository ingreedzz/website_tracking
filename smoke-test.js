#!/usr/bin/env node

/**
 * Comprehensive Smoke Test Script for Render Deployment
 * Tests: Register → Login → Create Order → Submit Order → Verify Dashboard
 * Enhanced with Render-specific deployment checks
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
const dns = require('dns').promises;
const https = require('https');

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
  preflight: false,
  health: false,
  register: false,
  login: false,
  createOrder: false,
  verifyDashboard: false,
  totalTests: 6,
  passedTests: 0,
  failedTests: 0,
  errors: [],
  timings: {}
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
    console.error(`[${timestamp}] [${step}] Response Headers:`, JSON.stringify(error.response.headers, null, 2));
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

// Create a test image file with realistic size
function createTestImage(sizeKB = 50) {
  const testImagePath = path.join(__dirname, 'tmp', 'test-image.png');
  
  // Ensure tmp directory exists
  if (!fs.existsSync(path.join(__dirname, 'tmp'))) {
    fs.mkdirSync(path.join(__dirname, 'tmp'));
  }
  
  // Create a larger PNG file with repeating pattern
  const headerSize = 69;
  const targetSize = sizeKB * 1024;
  const dataSize = targetSize - headerSize;
  
  const pngHeader = Buffer.from([
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
  
  // Add padding to reach target size
  const padding = Buffer.alloc(Math.max(0, dataSize), 0xFF);
  const pngData = Buffer.concat([pngHeader, padding]);
  
  fs.writeFileSync(testImagePath, pngData);
  log('SETUP', `Created test image: ${(pngData.length / 1024).toFixed(2)} KB`);
  
  return testImagePath;
}

// Pre-flight Test: DNS and SSL validation (Render-specific)
async function testPreflight() {
  if (!IS_RENDER) {
    log('PREFLIGHT', 'Skipping pre-flight checks (not a Render URL)');
    testResults.preflight = true;
    testResults.passedTests++;
    return true;
  }
  
  const step = 'PREFLIGHT';
  log(step, `Running pre-flight checks for Render deployment: ${BASE_URL}`);
  const startTime = Date.now();
  
  try {
    // Extract hostname from URL
    const url = new URL(BASE_URL);
    const hostname = url.hostname;
    
    log(step, `Checking DNS resolution for ${hostname}...`);
    const dnsStart = Date.now();
    const addresses = await dns.resolve4(hostname);
    const dnsDuration = Date.now() - dnsStart;
    
    logSuccess(step, `DNS resolved in ${dnsDuration}ms`, {
      hostname,
      addresses,
      count: addresses.length
    });
    
    // Check SSL certificate (for HTTPS)
    if (url.protocol === 'https:') {
      log(step, 'Checking SSL certificate...');
      const sslStart = Date.now();
      
      await new Promise((resolve, reject) => {
        const req = https.request({
          hostname,
          port: 443,
          method: 'HEAD',
          path: '/',
          timeout: 10000
        }, (res) => {
          const cert = res.socket.getPeerCertificate();
          const sslDuration = Date.now() - sslStart;
          
          if (cert && cert.subject) {
            logSuccess(step, `SSL certificate valid (${sslDuration}ms)`, {
              subject: cert.subject,
              issuer: cert.issuer,
              validFrom: cert.valid_from,
              validTo: cert.valid_to
            });
            resolve();
          } else {
            reject(new Error('No certificate found'));
          }
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('SSL check timeout'));
        });
        
        req.end();
      });
    }
    
    const duration = Date.now() - startTime;
    testResults.timings.preflight = duration;
    testResults.preflight = true;
    testResults.passedTests++;
    
    logSuccess(step, `Pre-flight checks passed (${duration}ms)`);
    return true;
  } catch (error) {
    logError(step, error, { baseUrl: BASE_URL });
    testResults.failedTests++;
    return false;
  }
}

// Test 1: Health Check with detailed metrics
async function testHealthCheck() {
  const step = 'HEALTH';
  log(step, `Testing health endpoint: ${API_URL}/health`);
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_URL}/health`, {
      timeout: 10000,
      validateStatus: null // Don't throw on any status
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.health = duration;
    
    log(step, `Response received in ${duration}ms`);
    log(step, `Response status: ${response.status}`);
    log(step, 'Response headers:', {
      'content-type': response.headers['content-type'],
      'content-length': response.headers['content-length'],
      'x-powered-by': response.headers['x-powered-by'],
      'server': response.headers['server']
    });
    
    if (response.status === 200 && response.data.status === 'ok') {
      logSuccess(step, 'Health check passed', {
        status: response.data.status,
        database: response.data.database,
        timestamp: response.data.timestamp,
        responseTime: `${duration}ms`
      });
      
      // Check for slow response (Render cold starts)
      if (IS_RENDER && duration > 5000) {
        log(step, `⚠️  WARNING: Slow response detected (${duration}ms) - possible cold start`);
      }
      
      testResults.health = true;
      testResults.passedTests++;
      return true;
    } else {
      throw new Error(`Unexpected response: status=${response.status}, data=${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.timings.health = duration;
    logError(step, error, {
      endpoint: `${API_URL}/health`,
      duration: `${duration}ms`
    });
    testResults.failedTests++;
    return false;
  }
}

// Test 2: User Registration
async function testRegister() {
  const step = 'REGISTER';
  log(step, 'Testing user registration', { email: TEST_USER.email });
  const startTime = Date.now();
  
  try {
    const response = await axios.post(`${API_URL}/register`, TEST_USER, {
      timeout: 10000
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.register = duration;
    
    if (response.status === 201 && response.data.user && response.data.token) {
      logSuccess(step, `Registration successful (${duration}ms)`, {
        userId: response.data.user.users_id,
        email: response.data.user.email,
        role: response.data.user.role,
        hasToken: !!response.data.token,
        tokenLength: response.data.token.length
      });
      testResults.register = true;
      testResults.passedTests++;
      return response.data;
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.timings.register = duration;
    logError(step, error, { testUser: { ...TEST_USER, password: '***' } });
    testResults.failedTests++;
    return null;
  }
}

// Test 3: User Login
async function testLogin() {
  const step = 'LOGIN';
  log(step, 'Testing user login', { email: TEST_USER.email });
  const startTime = Date.now();
  
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    }, {
      timeout: 10000
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.login = duration;
    
    if (response.status === 200 && response.data.user && response.data.token) {
      logSuccess(step, `Login successful (${duration}ms)`, {
        userId: response.data.user.users_id,
        email: response.data.user.email,
        role: response.data.user.role,
        hasToken: !!response.data.token,
        tokenLength: response.data.token.length
      });
      testResults.login = true;
      testResults.passedTests++;
      return response.data;
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.timings.login = duration;
    logError(step, error, { email: TEST_USER.email });
    testResults.failedTests++;
    return null;
  }
}

// Test 4: Create Order with realistic file
async function testCreateOrder(token) {
  const step = 'CREATE_ORDER';
  log(step, 'Testing order creation', TEST_ORDER);
  const startTime = Date.now();
  
  try {
    // Create test image with realistic size (50 KB)
    log(step, 'Creating test image file...');
    const imagePath = createTestImage(50);
    const imageStats = fs.statSync(imagePath);
    log(step, `Test image created: ${(imageStats.size / 1024).toFixed(2)} KB`);
    
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
    
    log(step, 'Sending order creation request...');
    const uploadStart = Date.now();
    
    const response = await axios.post(`${API_URL}/server/orders`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000, // Longer timeout for file upload
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    const uploadDuration = Date.now() - uploadStart;
    const totalDuration = Date.now() - startTime;
    testResults.timings.createOrder = totalDuration;
    
    // Clean up test image
    fs.unlinkSync(imagePath);
    
    log(step, `Upload completed in ${uploadDuration}ms`);
    log(step, `Total time: ${totalDuration}ms`);
    
    // Check response structure
    const orderData = response.data.order || response.data;
    
    if (response.status === 201 && (orderData.orders_id || orderData.id)) {
      logSuccess(step, `Order created successfully (${totalDuration}ms)`, {
        orderId: orderData.orders_id || orderData.id,
        status: orderData.status,
        product: orderData.product,
        imageUrl: orderData.sablon_image_url || orderData.sablon_url,
        uploadTime: `${uploadDuration}ms`,
        fileSize: `${(imageStats.size / 1024).toFixed(2)} KB`
      });
      testResults.createOrder = true;
      testResults.passedTests++;
      return orderData;
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    testResults.timings.createOrder = duration;
    logError(step, error, TEST_ORDER);
    testResults.failedTests++;
    return null;
  }
}

// Test 5: Verify Dashboard
async function testVerifyDashboard(token, userId) {
  const step = 'VERIFY_DASHBOARD';
  log(step, 'Testing dashboard order retrieval', { userId });
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_URL}/user/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    const duration = Date.now() - startTime;
    testResults.timings.verifyDashboard = duration;
    
    if (response.status === 200 && Array.isArray(response.data)) {
      const orders = response.data;
      
      logSuccess(step, `Dashboard verification successful (${duration}ms)`, {
        totalOrders: orders.length,
        hasData: orders.length > 0,
        responseTime: `${duration}ms`,
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
          log(step, `⚠️  WARNING: Found null/dash fields in order: ${nullFields.join(', ')}`);
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
    const duration = Date.now() - startTime;
    testResults.timings.verifyDashboard = duration;
    logError(step, error, { userId });
    testResults.failedTests++;
    return false;
  }
}

// Main test runner
async function runSmokeTests() {
  console.log('='.repeat(80));
  console.log('🧪 COMPREHENSIVE SMOKE TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Target: ${BASE_URL}`);
  console.log(`API Endpoint: ${API_URL}`);
  console.log(`Environment: ${IS_RENDER ? 'Render' : 'Custom'}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log('='.repeat(80));
  console.log('');
  
  // Test 0: Pre-flight checks (Render-specific)
  if (IS_RENDER) {
    log('INFO', '🔍 Running Render-specific pre-flight checks...');
    const preflightOk = await testPreflight();
    if (!preflightOk) {
      console.log('\n⚠️  Pre-flight checks failed, but continuing with tests...\n');
    }
    console.log('');
  }
  
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
  if (IS_RENDER) {
    console.log(`  0. Pre-flight Checks:   ${testResults.preflight ? '✅ PASS' : '❌ FAIL'}${testResults.timings.preflight ? ` (${testResults.timings.preflight}ms)` : ''}`);
  }
  console.log(`  1. Health Check:        ${testResults.health ? '✅ PASS' : '❌ FAIL'}${testResults.timings.health ? ` (${testResults.timings.health}ms)` : ''}`);
  console.log(`  2. User Registration:   ${testResults.register ? '✅ PASS' : '❌ FAIL'}${testResults.timings.register ? ` (${testResults.timings.register}ms)` : ''}`);
  console.log(`  3. User Login:          ${testResults.login ? '✅ PASS' : '❌ FAIL'}${testResults.timings.login ? ` (${testResults.timings.login}ms)` : ''}`);
  console.log(`  4. Create Order:        ${testResults.createOrder ? '✅ PASS' : '❌ FAIL'}${testResults.timings.createOrder ? ` (${testResults.timings.createOrder}ms)` : ''}`);
  console.log(`  5. Verify Dashboard:    ${testResults.verifyDashboard ? '✅ PASS' : '❌ FAIL'}${testResults.timings.verifyDashboard ? ` (${testResults.timings.verifyDashboard}ms)` : ''}`);
  
  // Performance summary
  if (Object.keys(testResults.timings).length > 0) {
    console.log('');
    console.log('Performance Metrics:');
    const totalTime = Object.values(testResults.timings).reduce((sum, time) => sum + time, 0);
    console.log(`  Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    
    const avgTime = totalTime / Object.keys(testResults.timings).length;
    console.log(`  Average: ${avgTime.toFixed(0)}ms per test`);
    
    const slowestTest = Object.entries(testResults.timings).reduce((max, [name, time]) => 
      time > max.time ? { name, time } : max, { name: '', time: 0 });
    console.log(`  Slowest: ${slowestTest.name} (${slowestTest.time}ms)`);
  }
  
  if (testResults.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    testResults.errors.forEach((error, idx) => {
      console.log(`  ${idx + 1}. [${error.step}] ${error.message}`);
      if (error.code) {
        console.log(`     Code: ${error.code}`);
      }
      if (error.response) {
        console.log(`     Response: ${JSON.stringify(error.response).substring(0, 200)}`);
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
  console.error('Stack:', error.stack);
  process.exit(1);
});
