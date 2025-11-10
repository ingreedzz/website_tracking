// filepath: backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'dev_jwt_secret';

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const match = auth.match(/^Bearer\s+(.*)$/i);
    
    if (!match) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    
    const token = match[1];
    
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      
      // Normalize user_id field (handle different field names)
      const userId = payload.user_id || payload.users_id || payload.id || payload.sub;
      
      if (!userId) {
        return res.status(401).json({ error: 'Invalid token payload - no user identifier' });
      }
      
      // Attach decoded payload to request for use in route handlers
      req.user = {
        id: userId,
        user_id: userId,
        users_id: userId,
        email: payload.email,
        role: payload.role || 'customer',
        is_admin: payload.role === 'admin' || payload.is_admin === true
      };
      
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
      }
      return res.status(401).json({ error: 'Token verification failed' });
    }
  } catch (err) {
    console.error('[auth] middleware error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

// Middleware to require admin role
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin' && !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

// Optional auth - doesn't fail if no token, but decodes if present
function optionalAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const match = auth.match(/^Bearer\s+(.*)$/i);
    
    if (!match) {
      return next();
    }
    
    const token = match[1];
    
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const userId = payload.user_id || payload.users_id || payload.id || payload.sub;
      
      if (userId) {
        req.user = {
          id: userId,
          user_id: userId,
          users_id: userId,
          email: payload.email,
          role: payload.role || 'customer',
          is_admin: payload.role === 'admin' || payload.is_admin === true
        };
      }
    } catch (err) {
      // Token invalid but continue anyway
      console.log('[auth] optional auth - invalid token, continuing');
    }
    
    next();
  } catch (err) {
    next();
  }
}

module.exports = {
  verifyToken,
  requireAdmin,
  optionalAuth
};