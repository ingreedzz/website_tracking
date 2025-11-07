const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with error handling
function initSupabase() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase Environment Variables:',
            {
                SUPABASE_URL: !!process.env.SUPABASE_URL,
                VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
                SUPABASE_KEY: !!process.env.SUPABASE_KEY,
                VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY
            }
        );
        throw new Error('Missing Supabase credentials. Please check your environment variables.');
    }

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

    return supabase;
}

// Wrapper function to handle Supabase queries with error handling
async function supabaseQuery(callback) {
    try {
        const supabase = initSupabase();
        return await callback(supabase);
    } catch (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Database operation failed: ${error.message}`);
    }
}

module.exports = {
    supabaseQuery,
    initSupabase
};