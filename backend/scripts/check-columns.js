#!/usr/bin/env node
/**
 * Script to check if the new database columns exist
 * Columns to check:
 * - models.size_fields (JSONB)
 * - orders.customer_name (TEXT)
 * - orders.order_name (TEXT)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing Supabase credentials');
  console.error('Required environment variables:');
  console.error('  - SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('  - SUPABASE_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn(tableName, columnName) {
  try {
    // Try to select the column - if it doesn't exist, we'll get an error
    const { error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        return { exists: false, error: error.message };
      }
      return { exists: false, error: error.message };
    }
    
    return { exists: true };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function main() {
  console.log('🔍 Checking database columns...\n');
  
  const checks = [
    { table: 'models', column: 'size_fields', type: 'JSONB' },
    { table: 'orders', column: 'customer_name', type: 'TEXT' },
    { table: 'orders', column: 'order_name', type: 'TEXT' }
  ];
  
  const results = [];
  
  for (const check of checks) {
    console.log(`Checking ${check.table}.${check.column}...`);
    const result = await checkColumn(check.table, check.column);
    results.push({ ...check, ...result });
    
    if (result.exists) {
      console.log(`  ✅ ${check.table}.${check.column} exists\n`);
    } else {
      console.log(`  ❌ ${check.table}.${check.column} MISSING\n`);
    }
  }
  
  console.log('=' .repeat(60));
  console.log('Summary:\n');
  
  const allExist = results.every(r => r.exists);
  const someExist = results.some(r => r.exists);
  
  if (allExist) {
    console.log('✅ All required columns exist!');
    console.log('\nYou can safely use all features including:');
    console.log('  - Dynamic size fields from database');
    console.log('  - Customer names in orders');
    console.log('  - Order names in orders');
  } else if (someExist) {
    console.log('⚠️  Some columns are missing:');
    results.filter(r => !r.exists).forEach(r => {
      console.log(`  - ${r.table}.${r.column} (${r.type})`);
    });
    console.log('\nThe application will work with limited functionality.');
    console.log('To enable full features, run these SQL commands in Supabase:\n');
    
    results.filter(r => !r.exists).forEach(r => {
      if (r.column === 'size_fields') {
        console.log(`ALTER TABLE ${r.table} ADD COLUMN IF NOT EXISTS ${r.column} JSONB DEFAULT '[]'::jsonb;`);
      } else {
        console.log(`ALTER TABLE ${r.table} ADD COLUMN IF NOT EXISTS ${r.column} TEXT;`);
      }
    });
  } else {
    console.log('❌ All required columns are missing!');
    console.log('\nTo enable these features, run these SQL commands in Supabase:\n');
    console.log(`ALTER TABLE models ADD COLUMN IF NOT EXISTS size_fields JSONB DEFAULT '[]'::jsonb;`);
    console.log(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;`);
    console.log(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_name TEXT;`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  process.exit(allExist ? 0 : 1);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
