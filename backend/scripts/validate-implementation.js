#!/usr/bin/env node
/**
 * Test script for dynamic models implementation
 * Tests that the code handles missing DB columns gracefully
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('Dynamic Models Implementation - Validation Test');
console.log('='.repeat(60));
console.log('');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    failed++;
  }
}

// Test 1: Backend routes file exists and has new endpoint
test('Backend routes file contains /models endpoint', () => {
  const routesPath = path.join(__dirname, '../../backend/routes/index.js');
  const content = fs.readFileSync(routesPath, 'utf8');
  
  if (!content.includes("router.get('/models'")) {
    throw new Error('/models endpoint not found');
  }
  
  if (!content.includes('size_fields')) {
    throw new Error('size_fields handling not found');
  }
});

// Test 2: Order creation includes customer_name and order_name extraction
test('Order creation extracts customer_name and order_name', () => {
  const routesPath = path.join(__dirname, '../../backend/routes/index.js');
  const content = fs.readFileSync(routesPath, 'utf8');
  
  if (!content.includes('customer_name') || !content.includes('order_name')) {
    throw new Error('customer_name or order_name not found in routes');
  }
  
  // Check for conditional inclusion
  if (!content.includes('if (customer_name)') || !content.includes('if (order_name)')) {
    throw new Error('Conditional inclusion of fields not found');
  }
});

// Test 3: Retry logic exists for missing columns
test('Order creation has retry logic for missing columns', () => {
  const routesPath = path.join(__dirname, '../../backend/routes/index.js');
  const content = fs.readFileSync(routesPath, 'utf8');
  
  if (!content.includes('isMissingColumn')) {
    throw new Error('Missing column detection not found');
  }
  
  if (!content.includes('Retrying without customer_name and order_name')) {
    throw new Error('Retry logic not found');
  }
  
  if (!content.includes('retryOrderObj')) {
    throw new Error('Retry object not created');
  }
});

// Test 4: Dashboard.vue has loadModels function
test('Dashboard.vue has loadModels function', () => {
  const dashboardPath = path.join(__dirname, '../../src/views/Dashboard.vue');
  const content = fs.readFileSync(dashboardPath, 'utf8');
  
  if (!content.includes('async function loadModels()')) {
    throw new Error('loadModels function not found');
  }
  
  if (!content.includes('apiGet(\'/models\')')) {
    throw new Error('Models API call not found');
  }
});

// Test 5: Dashboard.vue has customer_name and order_name fields
test('Dashboard.vue has customer_name and order_name inputs', () => {
  const dashboardPath = path.join(__dirname, '../../src/views/Dashboard.vue');
  const content = fs.readFileSync(dashboardPath, 'utf8');
  
  if (!content.includes('Customer Name')) {
    throw new Error('Customer Name field not found in template');
  }
  
  if (!content.includes('Order Name')) {
    throw new Error('Order Name field not found in template');
  }
  
  if (!content.includes('customer_name:') || !content.includes('order_name:')) {
    throw new Error('customer_name or order_name not in form reactive');
  }
});

// Test 6: Dashboard.vue displays new columns in table
test('Dashboard.vue orders table has new columns', () => {
  const dashboardPath = path.join(__dirname, '../../src/views/Dashboard.vue');
  const content = fs.readFileSync(dashboardPath, 'utf8');
  
  if (!content.includes('<th class="p-2 border">Order Name</th>')) {
    throw new Error('Order Name column header not found');
  }
  
  if (!content.includes('<th class="p-2 border">Customer Name</th>')) {
    throw new Error('Customer Name column header not found');
  }
  
  if (!content.includes('o.order_name') || !content.includes('o.customer_name')) {
    throw new Error('Column data binding not found');
  }
});

// Test 7: Payment.vue formatOrderDisplay includes new fields
test('Payment.vue formatOrderDisplay enhanced', () => {
  const paymentPath = path.join(__dirname, '../../src/views/Payment.vue');
  const content = fs.readFileSync(paymentPath, 'utf8');
  
  if (!content.includes('order.order_name')) {
    throw new Error('order_name not used in formatOrderDisplay');
  }
  
  if (!content.includes('order.customer_name')) {
    throw new Error('customer_name not used in formatOrderDisplay');
  }
});

// Test 8: Navbar.vue doesn't show Login button
test('Navbar.vue Login button removed', () => {
  const navbarPath = path.join(__dirname, '../../src/components/Navbar.vue');
  const content = fs.readFileSync(navbarPath, 'utf8');
  
  // Check that Login link is commented out or removed
  const hasLoginButton = content.includes('to="/login"') && 
                        !content.includes('<!-- Sign In / Login button removed');
  
  if (hasLoginButton) {
    throw new Error('Login button still visible in navbar');
  }
});

// Test 9: Check-columns script exists
test('check-columns.js utility script exists', () => {
  const scriptPath = path.join(__dirname, 'check-columns.js');
  
  if (!fs.existsSync(scriptPath)) {
    throw new Error('check-columns.js not found');
  }
  
  const content = fs.readFileSync(scriptPath, 'utf8');
  
  if (!content.includes('size_fields') || !content.includes('customer_name') || !content.includes('order_name')) {
    throw new Error('check-columns.js missing column checks');
  }
});

// Test 10: Documentation exists
test('DYNAMIC_MODELS_GUIDE.md exists', () => {
  const guidePath = path.join(__dirname, '../../DYNAMIC_MODELS_GUIDE.md');
  
  if (!fs.existsSync(guidePath)) {
    throw new Error('DYNAMIC_MODELS_GUIDE.md not found');
  }
  
  const content = fs.readFileSync(guidePath, 'utf8');
  
  if (!content.includes('Database Setup') || !content.includes('ALTER TABLE')) {
    throw new Error('Guide missing database setup instructions');
  }
});

// Test 11: Models fallback exists
test('Dashboard.vue has fallback model options', () => {
  const dashboardPath = path.join(__dirname, '../../src/views/Dashboard.vue');
  const content = fs.readFileSync(dashboardPath, 'utf8');
  
  if (!content.includes('fallbackModelOptions')) {
    throw new Error('Fallback model options not found');
  }
  
  if (!content.includes('using fallback')) {
    throw new Error('Fallback usage not implemented');
  }
});

// Test 12: Order FormData includes new fields
test('Dashboard.vue submits customer_name and order_name', () => {
  const dashboardPath = path.join(__dirname, '../../src/views/Dashboard.vue');
  const content = fs.readFileSync(dashboardPath, 'utf8');
  
  if (!content.includes("fd.append('customer_name'")) {
    throw new Error('customer_name not appended to FormData');
  }
  
  if (!content.includes("fd.append('order_name'")) {
    throw new Error('order_name not appended to FormData');
  }
});

console.log('');
console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.error('');
  console.error('❌ Some tests failed. Please review the implementation.');
  process.exit(1);
} else {
  console.log('');
  console.log('✅ All validation tests passed!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Owner adds DB columns (see DYNAMIC_MODELS_GUIDE.md)');
  console.log('2. Run: node backend/scripts/check-columns.js');
  console.log('3. Test order creation with customer/order names');
  console.log('4. Deploy to production');
  process.exit(0);
}
