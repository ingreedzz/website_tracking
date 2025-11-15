const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cached Supabase client — create once and reuse to avoid repeated initialization
let cachedSupabase = null;

function initSupabase() {
    if (cachedSupabase) {
        return cachedSupabase;
    }

    console.log('[SUPABASE_INIT] === Initializing Supabase Client (once) ===');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[SUPABASE_INIT] ❌ Missing Supabase credentials');
        throw new Error('Missing Supabase credentials. Please check your environment variables.');
    }

    // Minimal logging for production safety (do not print secrets)
    try {
        cachedSupabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            },
            db: {
                schema: 'public'
            }
        });

        console.log('[SUPABASE_INIT] ✓ Supabase client created successfully');
        return cachedSupabase;
    } catch (error) {
        console.error('[SUPABASE_INIT] ❌ Failed to create Supabase client');
        console.error('[SUPABASE_INIT] Error:', error.message);
        throw error;
    }
}

// Wrapper function to handle Supabase queries with error handling
async function supabaseQuery(callback) {
    const startTime = Date.now();
    try {
        const supabase = initSupabase();
        const result = await callback(supabase);
        const duration = Date.now() - startTime;
        if (duration > 1000) {
            console.warn(`[SUPABASE_QUERY] ⚠️ Slow query: ${duration}ms`);
        }
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[SUPABASE_QUERY] ❌ Query failed after ${duration}ms`, error.message);
        throw error;
    }
}

module.exports = {
    supabaseQuery,
    initSupabase
};