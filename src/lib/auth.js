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

export function getCurrentUser() {
  const t = getToken()
  if (!t) return null
  const decoded = decodeToken(t)
  if (!decoded) return null
  
  // Check if token is expired
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    console.log('[auth] token expired, clearing')
    clearToken()
    return null
  }
  
  return decoded
}

// Check if token is about to expire (within 5 minutes)
export function isTokenExpiringSoon() {
  const t = getToken()
  if (!t) return false
  const decoded = decodeToken(t)
  if (!decoded || !decoded.exp) return false
  
  const expiresIn = decoded.exp * 1000 - Date.now()
  return expiresIn < 5 * 60 * 1000 // 5 minutes
}

// Handle auth error responses (e.g., from API calls)
export function handleAuthError(error) {
  if (error?.code === 'TOKEN_EXPIRED' || error?.message?.includes('Token expired')) {
    console.log('[auth] token expired error, clearing token')
    clearToken()
    window.dispatchEvent(new Event('auth-change'))
    return { expired: true }
  }
  if (error?.code === 'INVALID_TOKEN' || error?.message?.includes('Invalid token')) {
    console.log('[auth] invalid token error, clearing token')
    clearToken()
    window.dispatchEvent(new Event('auth-change'))
    return { invalid: true }
  }
  return { expired: false, invalid: false }
}
