const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create a singleton Supabase client to avoid repeated initialization and noisy logs
let supabase = null;

function createSupabaseClient() {
    if (supabase) return supabase;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[SUPABASE_CLIENT] ❌ Missing required environment variables: SUPABASE_URL or SUPABASE_KEY');
        throw new Error('Supabase credentials not configured');
    }

    try {
        console.log('[SUPABASE_CLIENT] Creating Supabase client (singleton)...');
        supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log('[SUPABASE_CLIENT] ✓ Client created successfully');
        return supabase;
    } catch (err) {
        console.error('[SUPABASE_CLIENT] ❌ Failed to create client:', err.message);
        if (err.stack) console.error(err.stack);
        throw err;
    }
}

// Export the singleton client. This keeps backward compatibility for modules
// that `require('./supabaseClient')` and expect the client object.
module.exports = createSupabaseClient();