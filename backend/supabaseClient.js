const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('[SUPABASE_CLIENT] === Creating Supabase Client ===');
console.log('[SUPABASE_CLIENT] Timestamp:', new Date().toISOString());

// Debug: log env vars (do not log secret in production)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('[SUPABASE_CLIENT] Configuration check:');
console.log('[SUPABASE_CLIENT]   SUPABASE_URL present:', !!supabaseUrl);
console.log('[SUPABASE_CLIENT]   SUPABASE_KEY present:', !!supabaseKey);

if (supabaseUrl) {
    // Redact URL for security
    const redacted = supabaseUrl.replace(/https?:\/\/([^.]+)\..*/, 'https://$1...<redacted>');
    console.log('[SUPABASE_CLIENT]   SUPABASE_URL:', redacted);
}

let supabase = null;

try {
    if (!supabaseUrl || !supabaseKey) {
        console.error('[SUPABASE_CLIENT] ❌ Missing required environment variables');
        console.error('[SUPABASE_CLIENT] Required: SUPABASE_URL and SUPABASE_KEY');
        throw new Error('Supabase credentials not configured');
    }
    
    console.log('[SUPABASE_CLIENT] Creating client with options...');
    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    console.log('[SUPABASE_CLIENT] ✓ Client created successfully');
    console.log('[SUPABASE_CLIENT] Client capabilities:', {
        hasAuth: !!supabase.auth,
        hasStorage: !!supabase.storage,
        hasFrom: typeof supabase.from === 'function',
        hasRpc: typeof supabase.rpc === 'function'
    });
    
} catch (err) {
    console.error('[SUPABASE_CLIENT] ❌ Failed to create client');
    console.error('[SUPABASE_CLIENT] Error name:', err.name);
    console.error('[SUPABASE_CLIENT] Error message:', err.message);
    if (err.stack) {
        console.error('[SUPABASE_CLIENT] Error stack:', err.stack);
    }
}

console.log('[SUPABASE_CLIENT] === Client Initialization Complete ===');

module.exports = supabase;