// filepath: backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'dev_jwt_secret';

/**
 * Verify JWT token and attach user info to req.user
 * Normalizes user_id field variants to users_id
 */
function verifyToken(req, res, next) {
  const requestId = req.id || 'unknown';
  console.log(`[REQ:${requestId}] [AUTH] === Token Verification Started ===`);
  
  try {
    // Step 1: Extract authorization header
    console.log(`[REQ:${requestId}] [AUTH] Step 1: Extracting authorization header`);
    const auth = req.headers.authorization || '';
    console.log(`[REQ:${requestId}] [AUTH] Authorization header present: ${!!auth}`);
    
    // Fixed ReDoS vulnerability: changed from /^Bearer\s+(.*)$/ to /^Bearer\s(.+)$/
    const match = auth.match(/^Bearer\s(.+)$/i);
    
    if (!match) {
      console.warn(`[REQ:${requestId}] [AUTH] ❌ Missing or invalid Authorization header format`);
      return res.status(401).json({ 
        error: 'Missing Authorization header',
        code: 'MISSING_TOKEN'
      });
    }
    
    console.log(`[REQ:${requestId}] [AUTH] ✓ Bearer token found`);

    // Step 2: Extract token
    const token = match[1];
    console.log(`[REQ:${requestId}] [AUTH] Step 2: Token extracted (length: ${token.length})`);
    
    // Step 3: Verify token
    try {
      console.log(`[REQ:${requestId}] [AUTH] Step 3: Verifying JWT signature...`);
      const payload = jwt.verify(token, JWT_SECRET);
      console.log(`[REQ:${requestId}] [AUTH] ✓ JWT signature valid`);
      console.log(`[REQ:${requestId}] [AUTH] Token payload fields:`, Object.keys(payload));
      
      // Step 4: Normalize user_id field variants to users_id
      console.log(`[REQ:${requestId}] [AUTH] Step 4: Normalizing user ID field`);
      const userId = payload.users_id || payload.user_id || payload.id || payload.sub || null;
      
      console.log(`[REQ:${requestId}] [AUTH] User ID extraction:`, {
        users_id: payload.users_id || 'not present',
        user_id: payload.user_id || 'not present',
        id: payload.id || 'not present',
        sub: payload.sub || 'not present',
        resolved: userId || 'NONE'
      });
      
      if (!userId) {
        console.error(`[REQ:${requestId}] [AUTH] ❌ No user ID found in token payload`);
        console.error(`[REQ:${requestId}] [AUTH] Available payload keys:`, Object.keys(payload));
        return res.status(401).json({ 
          error: 'Invalid token payload (no user id)',
          code: 'INVALID_TOKEN'
        });
      }

      // Step 5: Attach normalized user info to request
      console.log(`[REQ:${requestId}] [AUTH] Step 5: Attaching user to request`);
      req.user = {
        id: userId,
        users_id: userId,
        email: payload.email || null,
        // Prefer explicit role claim, otherwise use is_admin boolean to derive role
        is_admin: !!payload.is_admin,
        role: payload.role || (payload.is_admin ? 'admin' : 'customer')
      };
      
      console.log(`[REQ:${requestId}] [AUTH] ✓ User authenticated:`, {
        users_id: userId,
        email: payload.email || 'not present',
        role: payload.role || 'customer'
      });
      console.log(`[REQ:${requestId}] [AUTH] === Token Verification Complete ===`);

      next();
    } catch (err) {
      console.error(`[REQ:${requestId}] [AUTH] ❌ Token verification failed`);
      console.error(`[REQ:${requestId}] [AUTH] Error name:`, err.name);
      console.error(`[REQ:${requestId}] [AUTH] Error message:`, err.message);
      
      if (err.name === 'TokenExpiredError') {
        console.error(`[REQ:${requestId}] [AUTH] Token expired at:`, err.expiredAt);
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        console.error(`[REQ:${requestId}] [AUTH] Invalid token structure or signature`);
      }
      
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (err) {
    console.error(`[REQ:${requestId}] [AUTH] ❌ Unexpected error in token verification`);
    console.error(`[REQ:${requestId}] [AUTH] Error:`, err.message);
    console.error(`[REQ:${requestId}] [AUTH] Stack:`, err.stack);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Require admin role for access
 * Must be used after verifyToken middleware
 */
function requireAdmin(req, res, next) {
  const requestId = req.id || 'unknown';
  console.log(`[REQ:${requestId}] [AUTH] === Admin Check Started ===`);
  
  if (!req.user) {
    console.error(`[REQ:${requestId}] [AUTH] ❌ No user attached to request`);
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'MISSING_TOKEN'
    });
  }
  
  console.log(`[REQ:${requestId}] [AUTH] User role:`, req.user.role);

  if (req.user.role !== 'admin') {
    console.warn(`[REQ:${requestId}] [AUTH] ❌ Access denied: user role '${req.user.role}' is not 'admin'`);
    return res.status(403).json({ 
      error: 'Admin role required',
      code: 'FORBIDDEN'
    });
  }
  
  console.log(`[REQ:${requestId}] [AUTH] ✓ Admin check passed`);
  console.log(`[REQ:${requestId}] [AUTH] === Admin Check Complete ===`);

  next();
}

module.exports = { verifyToken, requireAdmin };