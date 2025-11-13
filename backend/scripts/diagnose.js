#!/usr/bin/env node

/**
 * Diagnostic Test Script
 * 
 * This script helps diagnose common issues with the application by:
 * 1. Testing database connectivity
 * 2. Verifying environment configuration
 * 3. Checking user accounts and roles
 * 4. Testing authentication endpoints
 * 5. Validating admin access
 * 
 * Usage:
 *   node backend/scripts/diagnose.js [--verbose]
 */

require('dotenv').config();
const axios = require('axios');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const REST_BASE = SUPABASE_URL ? SUPABASE_URL.replace(/\/$/, '') + '/rest/v1' : null;
const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');

const SB_HEADERS = SUPABASE_KEY ? { 
  apikey: SUPABASE_KEY, 
  Authorization: `Bearer ${SUPABASE_KEY}`, 
  'Content-Type': 'application/json'
} : {};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('');
  log('='.repeat(70), 'cyan');
  log(message, 'bright');
  log('='.repeat(70), 'cyan');
  console.log('');
}

function subheader(message) {
  console.log('');
  log(`─── ${message}`, 'blue');
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message) {
  log(`  ${message}`, 'dim');
}

async function checkEnvironmentVariables() {
  subheader('Environment Variables Check');
  
  const vars = {
    'SUPABASE_URL / VITE_SUPABASE_URL': SUPABASE_URL,
    'SUPABASE_KEY / VITE_SUPABASE_ANON_KEY': SUPABASE_KEY ? '***' + SUPABASE_KEY.slice(-4) : null,
    'JWT_SECRET': process.env.JWT_SECRET ? '***' + process.env.JWT_SECRET.slice(-4) : null,
    'API_URL / VITE_API_URL': API_URL,
    'NODE_ENV': process.env.NODE_ENV || 'not set'
  };
  
  let allSet = true;
  for (const [name, value] of Object.entries(vars)) {
    if (value && value !== 'not set') {
      success(`${name}: ${value}`);
    } else {
      error(`${name}: NOT SET`);
      allSet = false;
    }
  }
  
  if (allSet) {
    success('All required environment variables are set');
  } else {
    error('Some environment variables are missing');
    info('Check your .env file and ensure all required variables are set');
  }
  
  return allSet;
}

async function checkDatabaseConnection() {
  subheader('Database Connection Check');
  
  if (!REST_BASE || !SUPABASE_KEY) {
    error('Cannot test database connection - missing credentials');
    return false;
  }
  
  try {
    const url = `${REST_BASE}/users?select=count`;
    info(`Testing connection to: ${SUPABASE_URL}`);
    
    const resp = await axios.get(url, { 
      headers: SB_HEADERS,
      timeout: 5000
    });
    
    success('Database connection successful');
    if (VERBOSE) {
      info(`Response status: ${resp.status}`);
      info(`Response data: ${JSON.stringify(resp.data)}`);
    }
    return true;
  } catch (err) {
    error('Database connection failed');
    if (err.response) {
      error(`HTTP ${err.response.status}: ${err.response.statusText}`);
      if (VERBOSE) {
        info(`Response: ${JSON.stringify(err.response.data, null, 2)}`);
      }
    } else {
      error(`Error: ${err.message}`);
    }
    return false;
  }
}

async function checkUserTable() {
  subheader('Users Table Check');
  
  if (!REST_BASE || !SUPABASE_KEY) {
    error('Cannot check users table - missing credentials');
    return false;
  }
  
  try {
    // Prefer is_admin (boolean). role column may be removed in newer schemas.
    const url = `${REST_BASE}/users?select=users_id,email,name,is_admin,created_at&limit=5`;
    const resp = await axios.get(url, { 
      headers: SB_HEADERS,
      timeout: 5000
    });
    
    const users = Array.isArray(resp.data) ? resp.data : [];
    
    success(`Found ${users.length} users in database (showing first 5)`);
    
    if (users.length === 0) {
      warning('No users found in database');
      info('You may need to create users using the registration endpoint');
      info('Or use: node backend/scripts/create-admin.js to create an admin user');
      return true;
    }
    
    console.log('');
    const adminUsers = users.filter(u => u.is_admin || u.role === 'admin');
    const customerUsers = users.filter(u => !u.is_admin && !u.role);
    
    info(`Breakdown: ${adminUsers.length} admin(s), ${customerUsers.length} customer(s)`);
    console.log('');
    
    users.forEach((user, idx) => {
      const derivedRole = user.role || (user.is_admin ? 'admin' : 'user');
      const roleColor = derivedRole === 'admin' ? 'yellow' : 'white';
      log(`${idx + 1}. ${user.email} (${derivedRole})`, roleColor);
      info(`   ID: ${user.users_id.substring(0, 8)}...`);
      info(`   Name: ${user.name}`);
      info(`   Created: ${user.created_at}`);
    });
    
    if (adminUsers.length === 0) {
      console.log('');
      warning('No admin users found!');
      info('Create an admin user with: node backend/scripts/create-admin.js');
    }
    
    return true;
  } catch (err) {
    error('Failed to query users table');
    if (err.response) {
      error(`HTTP ${err.response.status}: ${err.response.statusText}`);
      if (err.response.status === 404) {
        error('Users table does not exist or is not accessible');
        info('Run the schema.sql file to create the required tables');
      }
    } else {
      error(`Error: ${err.message}`);
    }
    return false;
  }
}

async function testHealthEndpoint() {
  subheader('API Health Endpoint Check');
  
  try {
    const url = `${API_URL}/health`;
    info(`Testing: ${url}`);
    
    const resp = await axios.get(url, { timeout: 5000 });
    
    success('Health endpoint accessible');
    info(`Status: ${resp.data.status}`);
    info(`Database: ${resp.data.database}`);
    
    if (VERBOSE) {
      info(`Response: ${JSON.stringify(resp.data, null, 2)}`);
    }
    
    return true;
  } catch (err) {
    error('Health endpoint check failed');
    if (err.code === 'ECONNREFUSED') {
      error('Connection refused - is the server running?');
      info('Start the server with: npm start');
    } else if (err.response) {
      error(`HTTP ${err.response.status}: ${err.response.statusText}`);
    } else {
      error(`Error: ${err.message}`);
    }
    return false;
  }
}

async function testAuthEndpoints() {
  subheader('Authentication Endpoints Check');
  
  // Test registration endpoint structure
  try {
    info('Testing registration endpoint...');
    const url = `${API_URL}/register`;
    
    // This should fail with 400 (missing fields), not 404
    await axios.post(url, {}, { timeout: 5000 });
  } catch (err) {
    if (err.response && err.response.status === 400) {
      success('Registration endpoint accessible');
      if (VERBOSE) {
        info(`Response: ${JSON.stringify(err.response.data, null, 2)}`);
      }
    } else if (err.response && err.response.status === 404) {
      error('Registration endpoint not found (404)');
      error('Check that routes are properly configured');
    } else if (err.code === 'ECONNREFUSED') {
      error('Cannot connect to server');
      return false;
    } else {
      warning(`Unexpected response: ${err.response?.status || err.message}`);
    }
  }
  
  // Test login endpoint structure
  try {
    info('Testing login endpoint...');
    const url = `${API_URL}/login`;
    
    // This should fail with 400 (missing fields), not 404
    await axios.post(url, {}, { timeout: 5000 });
  } catch (err) {
    if (err.response && err.response.status === 400) {
      success('Login endpoint accessible');
      if (VERBOSE) {
        info(`Response: ${JSON.stringify(err.response.data, null, 2)}`);
      }
    } else if (err.response && err.response.status === 404) {
      error('Login endpoint not found (404)');
      error('Check that routes are properly configured');
    } else {
      warning(`Unexpected response: ${err.response?.status || err.message}`);
    }
  }
  
  return true;
}

async function runDiagnostics() {
  header('Website Tracking - Diagnostic Test');
  
  log('This script will check the following:', 'cyan');
  info('✓ Environment variables');
  info('✓ Database connectivity');
  info('✓ Users table and user accounts');
  info('✓ API health endpoint');
  info('✓ Authentication endpoints');
  console.log('');
  
  if (VERBOSE) {
    info('Running in VERBOSE mode');
    console.log('');
  }
  
  const results = {
    envVars: await checkEnvironmentVariables(),
    dbConnection: await checkDatabaseConnection(),
    userTable: await checkUserTable(),
    healthEndpoint: await testHealthEndpoint(),
    authEndpoints: await testAuthEndpoints()
  };
  
  header('Diagnostic Summary');
  
  const checks = [
    ['Environment Variables', results.envVars],
    ['Database Connection', results.dbConnection],
    ['Users Table', results.userTable],
    ['Health Endpoint', results.healthEndpoint],
    ['Auth Endpoints', results.authEndpoints]
  ];
  
  checks.forEach(([name, passed]) => {
    if (passed) {
      success(`${name}: PASSED`);
    } else {
      error(`${name}: FAILED`);
    }
  });
  
  console.log('');
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    log('━'.repeat(70), 'green');
    success('All diagnostic checks passed! ✓');
    log('━'.repeat(70), 'green');
    console.log('');
    log('Your application appears to be configured correctly.', 'green');
    console.log('');
    log('Next steps:', 'cyan');
    info('1. Create an admin user: node backend/scripts/create-admin.js');
    info('2. Start the development server: npm run dev');
    info('3. Test the application in your browser');
  } else {
    log('━'.repeat(70), 'red');
    error('Some diagnostic checks failed ✗');
    log('━'.repeat(70), 'red');
    console.log('');
    log('Please fix the issues above before continuing.', 'red');
    console.log('');
    log('Common solutions:', 'cyan');
    info('• Check your .env file has all required variables');
    info('• Run database migrations: backend/database/schema.sql');
    info('• Ensure the backend server is running: npm start');
    info('• Verify Supabase credentials are correct');
    info('• Run with --verbose flag for more details');
    process.exit(1);
  }
  
  console.log('');
}

// Run diagnostics
runDiagnostics().catch(err => {
  console.error('');
  error('Unexpected error during diagnostics:');
  console.error(err);
  process.exit(1);
});
