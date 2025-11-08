// Minimal client-side auth helper for app-managed JWTs
export function setToken(token) {
  try { localStorage.setItem('token', token) } catch (e) { /* ignore */ }
}

export function getToken() {
  try { return localStorage.getItem('token') } catch (e) { return null }
}

export function clearToken() {
  try { localStorage.removeItem('token') } catch (e) { /* ignore */ }
}

// Supabase session helpers (store access_token + refresh_token)
export function setSupabaseSession(session) {
  try {
    if (!session) {
      localStorage.removeItem('sb_access_token');
      localStorage.removeItem('sb_refresh_token');
      return;
    }
    if (session.access_token) localStorage.setItem('sb_access_token', session.access_token);
    if (session.refresh_token) localStorage.setItem('sb_refresh_token', session.refresh_token);
  } catch (e) { /* ignore */ }
}

export function getSupabaseAccessToken() {
  try { return localStorage.getItem('sb_access_token') } catch (e) { return null }
}

export function clearSupabaseSession() {
  try { localStorage.removeItem('sb_access_token'); localStorage.removeItem('sb_refresh_token'); } catch (e) { /* ignore */ }
}

// Decode JWT payload (no verification) — useful to read user id, email, role, is_admin
export function decodeToken(token) {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // atob gives a binary string; decode UTF-8 safely
    const str = decodeURIComponent(Array.prototype.map.call(atob(b64), function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(str)
  } catch (e) {
    console.warn('[auth] decodeToken failed', e)
    return null
  }
}

export function getCurrentUser() {
  const t = getToken()
  if (!t) return null
  return decodeToken(t)
}
