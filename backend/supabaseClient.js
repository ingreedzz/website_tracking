const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Debug: log env vars (do not log secret in production)
console.log('[SUPABASE_CLIENT] SUPABASE_URL=', process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/:\/\/.*$/, '://<redacted>') : undefined)
console.log('[SUPABASE_CLIENT] SUPABASE_KEY present=', !!process.env.SUPABASE_KEY)

let supabase = null
try {
	supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
	console.log('[SUPABASE_CLIENT] created client')
} catch (err) {
	console.error('[SUPABASE_CLIENT] createClient error', err && err.message)
}

module.exports = supabase;