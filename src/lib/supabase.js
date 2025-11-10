import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
const schema = import.meta.env.VITE_SUPABASE_DB_SCHEMA || 'public'

function makeClient(key) {
  return createClient(url, key, { db: { schema } })
}

// Use stored Supabase access token if available; fall back to anon key
let initialKey = null
if (url && anon) {
  try { initialKey = localStorage.getItem('sb_access_token') || anon } catch (_e) { initialKey = anon }
}

// Only create client if we have keys
export let supabase = (url && anon) ? makeClient(initialKey) : null

export function setSupabaseAccessToken(token) {
  try {
    const key = token || anon
    supabase = makeClient(key)
    console.log('[supabase] set access token, client reinitialized')
  } catch (_e) {
    console.warn('[supabase] setSupabaseAccessToken failed', _e && _e.message ? _e.message : _e)
  }
}

export async function getProfile(userId) {
  if (!userId) return null
  // Prefer the application-managed `users` table. If missing, fall back to profiles.
  try {
    const { data: udata, error: uerr } = await supabase.from('users').select('users_id,email,name,phone,role,created_at').eq('users_id', userId).maybeSingle()
    if (!uerr && udata) {
      return { id: udata.users_id, email: udata.email, name: udata.name || null, phone: udata.phone || null, role: udata.role || null, created_at: udata.created_at }
    }
  } catch (_e) {
    console.warn('[supabase] getProfile users query failed, will try profiles', _e && _e.message ? _e.message : _e)
  }

  // fallback to profiles table if users row not present
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      console.error('[supabase] getProfile profiles error', error)
      return null
    }
    return data || null
  } catch (_e) {
    console.error('[supabase] getProfile profiles exception', _e && _e.message ? _e.message : _e)
    return null
  }
}
