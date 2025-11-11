// Minimal client-side auth helper for app-managed JWTs
export function setToken(token) {
  try { localStorage.setItem('token', token) } catch (_e) { /* ignore */ }
}

export function getToken() {
  try { return localStorage.getItem('token') } catch (_e) { return null }
}

export function clearToken() {
  try { localStorage.removeItem('token') } catch (_e) { /* ignore */ }
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
  } catch (_e) { /* ignore */ }
}

export function getSupabaseAccessToken() {
  try { return localStorage.getItem('sb_access_token') } catch (_e) { return null }
}

export function clearSupabaseSession() {
  try { localStorage.removeItem('sb_access_token'); localStorage.removeItem('sb_refresh_token'); } catch (_e) { /* ignore */ }
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
  } catch (_e) {
    console.warn('[auth] decodeToken failed', _e)
    return null
  }
}

// Check if token is expired or expiring soon
export function isTokenExpired(token) {
  const payload = decodeToken(token)
  if (!payload || !payload.exp) return true
  const now = Math.floor(Date.now() / 1000)
  return payload.exp <= now
}

// Check if token is expiring soon (within 5 minutes)
export function isTokenExpiringSoon(token) {
  const payload = decodeToken(token)
  if (!payload || !payload.exp) return true
  const now = Math.floor(Date.now() / 1000)
  const fiveMinutes = 5 * 60
  return payload.exp <= (now + fiveMinutes)
}

// Get current user from token with automatic expiration checking
export function getCurrentUser() {
  const t = getToken()
  if (!t) return null
  
  // Check if token is expired
  if (isTokenExpired(t)) {
    handleAuthError('TOKEN_EXPIRED')
    return null
  }
  
  return decodeToken(t)
}

// Centralized auth error handling
export function handleAuthError(code) {
  console.warn('[auth] Auth error:', code)
  
  // Clear invalid/expired tokens
  if (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN') {
    clearToken()
    clearSupabaseSession()
  }
  
  // Optionally redirect to login or emit event
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('auth-error', { detail: { code } })
    window.dispatchEvent(event)
  }
}
