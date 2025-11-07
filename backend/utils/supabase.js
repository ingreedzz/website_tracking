const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with error handling
function initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials. Please check your environment variables.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
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