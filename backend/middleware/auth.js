// filepath: backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'dev_jwt_secret';

/**
 * Verify JWT token and attach user info to req.user
 * Normalizes user_id field variants to users_id
 */
function verifyToken(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    // Fixed ReDoS vulnerability: changed from /^Bearer\s+(.*)$/ to /^Bearer\s(.+)$/
    const match = auth.match(/^Bearer\s(.+)$/i);
    
    if (!match) {
      return res.status(401).json({ 
        error: 'Missing Authorization header',
        code: 'MISSING_TOKEN'
      });
    }

    const token = match[1];
    
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      
      // Normalize user_id field variants to users_id
      const userId = payload.users_id || payload.user_id || payload.id || payload.sub || null;
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Invalid token payload (no user id)',
          code: 'INVALID_TOKEN'
        });
      }

      // Attach normalized user info to request
      req.user = {
        id: userId,
        users_id: userId,
        email: payload.email || null,
        role: payload.role || 'customer'
      };

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Require admin role for access
 * Must be used after verifyToken middleware
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'MISSING_TOKEN'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin role required',
      code: 'FORBIDDEN'
    });
  }

  next();
}

module.exports = { verifyToken, requireAdmin };