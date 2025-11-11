const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with error handling
function initSupabase() {
    console.log('[SUPABASE_INIT] === Initializing Supabase Client ===');
    console.log('[SUPABASE_INIT] Timestamp:', new Date().toISOString());
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    console.log('[SUPABASE_INIT] Environment variables check:', {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        SUPABASE_KEY: !!process.env.SUPABASE_KEY,
        VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
        resolvedUrl: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'not found',
        resolvedKey: supabaseKey ? 'present' : 'not found'
    });

    if (!supabaseUrl || !supabaseKey) {
        console.error('[SUPABASE_INIT] ❌ Missing Supabase credentials');
        console.error('[SUPABASE_INIT] Available environment variables:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
        throw new Error('Missing Supabase credentials. Please check your environment variables.');
    }

    console.log('[SUPABASE_INIT] Creating Supabase client...');
    console.log('[SUPABASE_INIT] URL:', supabaseUrl.replace(/https?:\/\/([^.]+)\..*/, 'https://$1...'));
    console.log('[SUPABASE_INIT] Configuration:', {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        },
        db: {
            schema: 'public'
        }
    });

    try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
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
        console.log('[SUPABASE_INIT] Client methods available:', {
            hasFrom: typeof supabase.from === 'function',
            hasStorage: !!supabase.storage,
            hasAuth: !!supabase.auth
        });
        console.log('[SUPABASE_INIT] === Initialization Complete ===');
        
        return supabase;
    } catch (error) {
        console.error('[SUPABASE_INIT] ❌ Failed to create Supabase client');
        console.error('[SUPABASE_INIT] Error:', error.message);
        console.error('[SUPABASE_INIT] Stack:', error.stack);
        throw error;
    }
}

// Wrapper function to handle Supabase queries with error handling
async function supabaseQuery(callback) {
    console.log('[SUPABASE_QUERY] === Starting Query ===');
    const startTime = Date.now();
    
    try {
        console.log('[SUPABASE_QUERY] Initializing client...');
        const supabase = initSupabase();
        
        console.log('[SUPABASE_QUERY] Executing callback...');
        const result = await callback(supabase);
        
        const duration = Date.now() - startTime;
        console.log(`[SUPABASE_QUERY] ✓ Query completed successfully in ${duration}ms`);
        
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[SUPABASE_QUERY] ❌ Query failed after ${duration}ms`);
        console.error('[SUPABASE_QUERY] Error name:', error.name);
        console.error('[SUPABASE_QUERY] Error message:', error.message);
        console.error('[SUPABASE_QUERY] Error stack:', error.stack);
        
        if (error.code) {
            console.error('[SUPABASE_QUERY] Error code:', error.code);
        }
        if (error.details) {
            console.error('[SUPABASE_QUERY] Error details:', error.details);
        }
        if (error.hint) {
            console.error('[SUPABASE_QUERY] Error hint:', error.hint);
        }
        
        throw new Error(`Database operation failed: ${error.message}`);
    }
}

module.exports = {
    supabaseQuery,
    initSupabase
};