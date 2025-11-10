// Vercel serverless entrypoint. Wrap the existing Express app so the same
// backend code can run as a serverless function on Vercel.
//
// Requires environment variables to be set in Vercel: SUPABASE_URL, SUPABASE_KEY,
// JWT_SECRET, SUPABASE_UPLOAD_BUCKET (optional)

const serverless = require('serverless-http');
require('dotenv').config();

// Import the express app exported from backend/server.js
const app = require('../backend/server');
const { initSupabase } = require('../backend/utils/supabase');

// Try to initialize Supabase on cold start so any missing envs fail fast in logs
try {
  initSupabase();
  console.log('[API] Supabase initialized on cold start');
} catch (err) {
  console.warn('[API] Supabase init failed on cold start (deferred):', err && err.message ? err.message : err);
  // Do not throw here — allow requests to surface the error with proper logs
}

module.exports = serverless(app);
