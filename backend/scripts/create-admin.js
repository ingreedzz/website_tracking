#!/usr/bin/env node

/**
 * Admin User Creation Script
 * 
 * This script creates an admin user in the database for testing purposes.
 * 
 * Usage:
 *   node backend/scripts/create-admin.js <email> <password> <name> [phone]
 * 
 * Example:
 *   node backend/scripts/create-admin.js admin@test.com admin123 "Admin User" "+1234567890"
 */

require('dotenv').config();
const axios = require('axios');
const bcrypt = require('bcrypt');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const REST_BASE = SUPABASE_URL ? SUPABASE_URL.replace(/\/$/, '') + '/rest/v1' : null;
const SB_HEADERS = SUPABASE_KEY ? { 
  apikey: SUPABASE_KEY, 
  Authorization: `Bearer ${SUPABASE_KEY}`, 
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
} : {};

async function createAdminUser(email, password, name, phone) {
  console.log('==========================================');
  console.log('Admin User Creation Script');
  console.log('==========================================');
  console.log('');
  
  // Validate configuration
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR: Supabase configuration missing!');
    console.error('Please set the following environment variables:');
    console.error('  - SUPABASE_URL or VITE_SUPABASE_URL');
    console.error('  - SUPABASE_KEY or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  console.log('✓ Supabase configuration found');
  console.log(`  URL: ${SUPABASE_URL}`);
  console.log('');
  
  // Validate inputs
  if (!email || !password || !name) {
    console.error('❌ ERROR: Missing required parameters!');
    console.error('Usage: node backend/scripts/create-admin.js <email> <password> <name> [phone]');
    console.error('');
    console.error('Example:');
    console.error('  node backend/scripts/create-admin.js admin@test.com admin123 "Admin User"');
    process.exit(1);
  }
  
  console.log('Creating admin user with:');
  console.log(`  Email: ${email}`);
  console.log(`  Name: ${name}`);
  console.log(`  Phone: ${phone || '(not provided)'}`);
  console.log(`  Role: admin`);
  console.log('');
  
  try {
    // Step 1: Check if user already exists
    console.log('[1/4] Checking if user already exists...');
    const checkUrl = `${REST_BASE}/users?select=*&email=eq.${encodeURIComponent(email)}`;
    const checkResp = await axios.get(checkUrl, { headers: SB_HEADERS });
    const existing = Array.isArray(checkResp.data) && checkResp.data.length ? checkResp.data[0] : null;
    
    if (existing) {
      console.log('⚠️  User already exists!');
      console.log(`  User ID: ${existing.users_id}`);
      console.log(`  Current Role: ${existing.role}`);
      console.log('');
      
      // If user exists but is not admin, offer to update
      if (existing.role !== 'admin') {
        console.log('[2/4] Updating existing user to admin role...');
        const updateUrl = `${REST_BASE}/users?users_id=eq.${encodeURIComponent(existing.users_id)}`;
        const updateBody = { role: 'admin', is_admin: true };
        await axios.patch(updateUrl, updateBody, { headers: SB_HEADERS });
        console.log('✓ User role updated to admin');
        console.log('');
        console.log('==========================================');
        console.log('✓ Admin user ready!');
        console.log('==========================================');
        console.log(`User ID: ${existing.users_id}`);
        console.log(`Email: ${email}`);
        console.log(`Role: admin`);
        console.log('');
        console.log('You can now login with these credentials.');
        return;
      } else {
        console.log('✓ User is already an admin');
        console.log('');
        console.log('==========================================');
        console.log('✓ Admin user already exists!');
        console.log('==========================================');
        console.log(`User ID: ${existing.users_id}`);
        console.log(`Email: ${email}`);
        console.log(`Role: admin`);
        console.log('');
        console.log('You can login with existing credentials.');
        return;
      }
    }
    
    console.log('✓ Email is available');
    console.log('');
    
    // Step 2: Hash password
    console.log('[2/4] Hashing password...');
    const hashed = await bcrypt.hash(password, 10);
    console.log('✓ Password hashed');
    console.log('');
    
    // Step 3: Create user with admin role
    console.log('[3/4] Creating admin user in database...');
    const url = `${REST_BASE}/users`;
    const body = [{ 
      name, 
      email, 
      password: hashed, 
      phone: phone || null,
      role: 'admin',
      is_admin: true
    }];
    
    const resp = await axios.post(url, body, { headers: SB_HEADERS });
    const created = Array.isArray(resp.data) && resp.data.length ? resp.data[0] : null;
    
    if (!created) {
      throw new Error('Failed to create user - no data returned from database');
    }
    
    console.log('✓ Admin user created successfully');
    console.log('');
    
    // Step 4: Verify creation
    console.log('[4/4] Verifying admin user...');
    const verifyUrl = `${REST_BASE}/users?select=*&users_id=eq.${encodeURIComponent(created.users_id)}`;
    const verifyResp = await axios.get(verifyUrl, { headers: SB_HEADERS });
    const verified = Array.isArray(verifyResp.data) && verifyResp.data.length ? verifyResp.data[0] : null;
    
    if (!verified) {
      throw new Error('Failed to verify created user');
    }
    
    console.log('✓ Admin user verified');
    console.log('');
    console.log('==========================================');
    console.log('✓ SUCCESS! Admin user created!');
    console.log('==========================================');
    console.log('');
    console.log('User Details:');
    console.log(`  User ID: ${verified.users_id}`);
    console.log(`  Email: ${verified.email}`);
    console.log(`  Name: ${verified.name}`);
    console.log(`  Phone: ${verified.phone || '(not set)'}`);
    console.log(`  Role: ${verified.role}`);
    console.log(`  Is Admin: ${verified.is_admin}`);
    console.log(`  Created: ${verified.created_at}`);
    console.log('');
    console.log('==========================================');
    console.log('Next Steps:');
    console.log('==========================================');
    console.log('1. Login with the email and password you provided');
    console.log('2. Navigate to /admin-dashboard to access admin features');
    console.log('3. You can now:');
    console.log('   - View all orders (GET /orders)');
    console.log('   - View all users (GET /users)');
    console.log('   - View all payments (GET /payments)');
    console.log('   - Update order status (PUT /server/orders/:id/status)');
    console.log('');
    
  } catch (err) {
    console.error('');
    console.error('==========================================');
    console.error('❌ ERROR: Failed to create admin user');
    console.error('==========================================');
    console.error('');
    
    if (err.response) {
      console.error('HTTP Error:', err.response.status, err.response.statusText);
      console.error('Response:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message);
    }
    
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check that your .env file has correct Supabase credentials');
    console.error('2. Verify that the users table exists in your database');
    console.error('3. Ensure the Supabase API key has write permissions');
    console.error('4. Check Supabase logs for more details');
    console.error('');
    
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: node backend/scripts/create-admin.js <email> <password> <name> [phone]');
  console.error('');
  console.error('Example:');
  console.error('  node backend/scripts/create-admin.js admin@test.com admin123 "Admin User"');
  console.error('  node backend/scripts/create-admin.js admin@test.com admin123 "Admin User" "+1234567890"');
  process.exit(1);
}

const [email, password, name, phone] = args;

// Run the script
createAdminUser(email, password, name, phone).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
